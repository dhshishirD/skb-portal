-- 0028_finance_procurement_security.sql
-- Finance (expense claims, approvals) and Procurement (vendors, purchase requests, quotations,
-- purchase orders): move every rule from the screens into the database.
--
-- Why: before this, any internal user could insert an expense already marked 'paid' (or as someone
-- else), change a purchase request to 'approved', and read every project's approvals; partners could
-- read expenses and purchase requests; nothing enforced "3 quotations" or "no self-approval".
--
-- What changes (all tables are empty in production, so no data is touched):
--   * expenses: a claim always starts 'submitted' and belongs to the signed-in user. Status moves ONLY
--     through public.act_on_expense(): Programme Manager -> Finance -> Executive Director -> paid.
--     Nobody approves their own claim; the same person cannot approve two steps in a row.
--     Claimants see their own claims; Finance / PM / ED / project officers / auditors see the project's.
--   * approvals: written only by the two functions below; readable only where the subject is readable.
--   * purchase_requests: created as 'draft' by the requester; status moves ONLY through
--     public.act_on_purchase_request(): submit -> ready (Procurement) -> approve (PM, or ED from
--     BDT 500,000) -> issue_po (Procurement). From BDT 50,000 it needs quotations from 3 DIFFERENT
--     vendors, none blacklisted; the threshold uses the larger of the estimate and the highest quote.
--     Choosing a quote that is not the lowest needs a written reason. The requester cannot approve.
--   * vendors: written by Procurement / ED only; blacklisting needs a reason; only the ED lifts it.
--   * quotations / purchase_orders: Procurement adds quotes while a request is open; a purchase order is
--     created only by issue_po. Partners and donors read none of this (as before for donors, 0013).
-- Direct database sessions with no signed-in user (SQL editor, migrations, service role) stay unrestricted,
-- as in 0012, 0015 and 0016.

-- ===== expenses: columns and constraints =====
alter table public.expenses
  add column if not exists vendor_name text check (vendor_name is null or char_length(vendor_name) between 2 and 200),
  add column if not exists receipt_ref text check (receipt_ref is null or char_length(receipt_ref) <= 100);
alter table public.expenses
  add constraint expenses_fx_positive check (fx_rate_to_bdt > 0),
  add constraint expenses_amount_cap check (amount <= 1000000000),
  add constraint expenses_description_len check (char_length(btrim(description)) between 3 and 1000);

create or replace function public.guard_expense()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  stage_now public.project_stage;
begin
  if (select auth.uid()) is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    raise exception 'expense claims cannot be deleted' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.claimant_id is distinct from (select auth.uid()) then
      raise exception 'a claim can only be filed in your own name' using errcode = '42501';
    end if;
    if new.status is distinct from 'submitted' then
      raise exception 'a new claim always starts as submitted' using errcode = '42501';
    end if;
    select p.stage into stage_now from public.projects p where p.id = new.project_id;
    if stage_now = 'closed' then
      raise exception 'no new claims on a closed project' using errcode = '42501';
    end if;
    if new.expense_date > current_date then
      raise exception 'the expense date cannot be in the future' using errcode = '22008';
    end if;
    if new.currency = 'BDT' then
      new.fx_rate_to_bdt := 1;
    end if;
    if new.budget_line_id is not null and not exists (
      select 1 from public.budget_lines b where b.id = new.budget_line_id and b.project_id = new.project_id
    ) then
      raise exception 'the budget line belongs to another project' using errcode = '42501';
    end if;
    new.submitted_at := now();
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  -- UPDATE: only the status may change (and only through act_on_expense)
  if new.project_id is distinct from old.project_id
     or new.claimant_id is distinct from old.claimant_id
     or new.amount is distinct from old.amount
     or new.currency is distinct from old.currency
     or new.fx_rate_to_bdt is distinct from old.fx_rate_to_bdt
     or new.expense_date is distinct from old.expense_date
     or new.description is distinct from old.description
     or new.budget_line_id is distinct from old.budget_line_id
     or new.vendor_name is distinct from old.vendor_name
     or new.receipt_ref is distinct from old.receipt_ref then
    raise exception 'a filed claim cannot be edited; return it or file a new one' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.guard_expense() from public, anon, authenticated;

drop trigger if exists guard_expense on public.expenses;
create trigger guard_expense before insert or update or delete on public.expenses
  for each row execute function public.guard_expense();

drop policy if exists expenses_insert on public.expenses;
drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses for select to authenticated
  using (
    public.can_access_project(project_id)
    and (
      claimant_id = (select auth.uid())
      or public.has_any_role(array['finance','programme_manager','executive','project_officer','auditor']::public.app_role[])
    )
  );
create policy expenses_insert on public.expenses for insert to authenticated
  with check (
    public.can_access_project(project_id) and public.is_internal_user()
    and claimant_id = (select auth.uid()) and status = 'submitted'
  );
revoke update, delete on public.expenses from authenticated;

-- ===== approvals: written only by the functions below =====
drop policy if exists approvals_select on public.approvals;
create policy approvals_select on public.approvals for select to authenticated
  using (
    case subject_type
      when 'expense'     then exists (select 1 from public.expenses e where e.id = subject_id)
      when 'procurement' then exists (select 1 from public.purchase_requests p where p.id = subject_id)
      when 'field_report' then exists (select 1 from public.field_reports f where f.id = subject_id)
      else false
    end
  );
revoke insert, update, delete on public.approvals from authenticated;

-- ===== act_on_expense: the only way an expense changes status =====
-- Chain: submitted -> (Programme Manager) pm_approved -> (Finance) finance_verified
--        -> (Executive Director) director_approved -> (Finance, "approve" = mark paid) paid.
-- Any step may 'return' (needs the claimant to file again) or 'reject' with a written comment.
create or replace function public.act_on_expense(p_expense_id uuid, p_action text, p_comment text default null)
returns public.expense_status language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  e public.expenses%rowtype;
  need public.app_role;
  nxt public.expense_status;
  last_actor uuid;
  step int;
  stage_now public.project_stage;
  c text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  if me is null or not public.is_active_user() then
    raise exception 'sign in required' using errcode = '42501';
  end if;
  if p_action not in ('approve', 'return', 'reject', 'cancel') then
    raise exception 'unknown action %', p_action using errcode = '22023';
  end if;
  select * into e from public.expenses where id = p_expense_id for update;
  if not found then
    raise exception 'claim not found' using errcode = 'P0002';
  end if;
  if not public.can_access_project(e.project_id) then
    raise exception 'no access to this project' using errcode = '42501';
  end if;
  select p.stage into stage_now from public.projects p where p.id = e.project_id;
  if stage_now = 'closed' then
    raise exception 'the project is closed' using errcode = '42501';
  end if;

  if p_action = 'cancel' then
    if e.claimant_id <> me then
      raise exception 'only the claimant can cancel a claim' using errcode = '42501';
    end if;
    if e.status <> 'submitted' then
      raise exception 'only a claim that nobody has approved yet can be cancelled' using errcode = '42501';
    end if;
    update public.expenses set status = 'cancelled' where id = e.id;
    return 'cancelled';
  end if;

  need := case e.status
    when 'submitted'         then 'programme_manager'
    when 'pm_approved'       then 'finance'
    when 'finance_verified'  then 'executive'
    when 'director_approved' then 'finance'
    else null
  end;
  if need is null then
    raise exception 'this claim is already %', e.status using errcode = '42501';
  end if;
  if not public.has_role(need) then
    raise exception 'this step needs the % role', need using errcode = '42501';
  end if;
  if e.claimant_id = me then
    raise exception 'separation of duties: you cannot act on your own claim' using errcode = '42501';
  end if;
  select a.actor_id into last_actor from public.approvals a
    where a.subject_type = 'expense' and a.subject_id = e.id and a.status = 'approved'
    order by a.step_no desc limit 1;
  if last_actor = me then
    raise exception 'separation of duties: the same person cannot approve two steps in a row' using errcode = '42501';
  end if;
  if p_action in ('return', 'reject') and (c is null or char_length(c) < 3) then
    raise exception 'a comment is required to return or reject a claim' using errcode = '22023';
  end if;

  nxt := case
    when p_action = 'return' then 'returned'
    when p_action = 'reject' then 'rejected'
    when e.status = 'submitted' then 'pm_approved'
    when e.status = 'pm_approved' then 'finance_verified'
    when e.status = 'finance_verified' then 'director_approved'
    else 'paid'
  end;

  select coalesce(max(a.step_no), 0) + 1 into step from public.approvals a
    where a.subject_type = 'expense' and a.subject_id = e.id;
  insert into public.approvals (subject_type, subject_id, step_no, required_role, status, actor_id, acted_at, comment)
  values ('expense', e.id, step, need,
          case p_action when 'approve' then 'approved' when 'return' then 'returned' else 'rejected' end::public.approval_status,
          me, now(), c);
  update public.expenses set status = nxt where id = e.id;
  return nxt;
end $$;
revoke execute on function public.act_on_expense(uuid, text, text) from public, anon;
grant execute on function public.act_on_expense(uuid, text, text) to authenticated;

-- ===== vendors =====
alter table public.vendors
  add constraint vendors_name_len check (char_length(btrim(name)) between 2 and 200),
  add constraint vendors_contact_len check (contact_person is null or char_length(contact_person) <= 120),
  add constraint vendors_phone_len check (phone is null or char_length(phone) <= 30),
  add constraint vendors_email_fmt check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add constraint vendors_blacklist_reason check (not is_blacklisted or char_length(btrim(coalesce(blacklist_reason, ''))) >= 5);
create unique index if not exists vendors_name_unique on public.vendors (lower(btrim(name)));

create or replace function public.guard_vendor()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    raise exception 'vendors cannot be deleted; blacklist them instead' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and old.is_blacklisted and not new.is_blacklisted and not public.has_role('executive') then
    raise exception 'only the Executive Director can lift a blacklist' using errcode = '42501';
  end if;
  if not new.is_blacklisted then
    new.blacklist_reason := null;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.guard_vendor() from public, anon, authenticated;
drop trigger if exists guard_vendor on public.vendors;
create trigger guard_vendor before insert or update or delete on public.vendors
  for each row execute function public.guard_vendor();

drop policy if exists vendors_select on public.vendors;
create policy vendors_select on public.vendors for select to authenticated
  using (public.has_any_role(array['procurement','programme_manager','project_officer','finance','executive']::public.app_role[]));
create policy vendors_insert on public.vendors for insert to authenticated
  with check (public.has_any_role(array['procurement','executive']::public.app_role[]));
create policy vendors_update on public.vendors for update to authenticated
  using (public.has_any_role(array['procurement','executive']::public.app_role[]))
  with check (public.has_any_role(array['procurement','executive']::public.app_role[]));
revoke delete on public.vendors from authenticated;

-- ===== purchase requests =====
create or replace function public.guard_purchase_request()
returns trigger language plpgsql security definer set search_path = '' as $$
declare stage_now public.project_stage;
begin
  if (select auth.uid()) is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'only a draft request can be deleted' using errcode = '42501';
    end if;
    return old;
  end if;
  if tg_op = 'INSERT' then
    if new.requester_id is distinct from (select auth.uid()) then
      raise exception 'a request can only be made in your own name' using errcode = '42501';
    end if;
    if new.status is distinct from 'draft' then
      raise exception 'a new request always starts as a draft' using errcode = '42501';
    end if;
    select p.stage into stage_now from public.projects p where p.id = new.project_id;
    if stage_now = 'closed' then
      raise exception 'no new requests on a closed project' using errcode = '42501';
    end if;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;
  if new.project_id is distinct from old.project_id or new.requester_id is distinct from old.requester_id then
    raise exception 'project and requester cannot be changed' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.guard_purchase_request() from public, anon, authenticated;
drop trigger if exists guard_purchase_request on public.purchase_requests;
create trigger guard_purchase_request before insert or update or delete on public.purchase_requests
  for each row execute function public.guard_purchase_request();

alter table public.purchase_requests
  add constraint purchase_requests_description_len check (char_length(btrim(description)) between 3 and 1000);

drop policy if exists purchase_requests_select on public.purchase_requests;
drop policy if exists purchase_requests_write on public.purchase_requests;
create policy purchase_requests_select on public.purchase_requests for select to authenticated
  using (
    public.can_access_project(project_id)
    and (
      requester_id = (select auth.uid())
      or public.has_any_role(array['procurement','programme_manager','executive','project_officer','finance','auditor']::public.app_role[])
    )
  );
create policy purchase_requests_insert on public.purchase_requests for insert to authenticated
  with check (
    public.can_access_project(project_id)
    and public.has_any_role(array['project_officer','field_officer','me_officer','programme_manager','procurement']::public.app_role[])
    and requester_id = (select auth.uid()) and status = 'draft'
  );
create policy purchase_requests_update on public.purchase_requests for update to authenticated
  using (requester_id = (select auth.uid()) and status = 'draft' and public.can_access_project(project_id))
  with check (requester_id = (select auth.uid()) and status = 'draft');
create policy purchase_requests_delete on public.purchase_requests for delete to authenticated
  using (requester_id = (select auth.uid()) and status = 'draft');
-- Status moves only through act_on_purchase_request: users may edit just these two columns.
revoke update on public.purchase_requests from authenticated;
grant update (description, estimated_amount) on public.purchase_requests to authenticated;

-- ===== quotations =====
alter table public.quotations
  add constraint quotations_file_path_safe check (file_path is null or (char_length(file_path) <= 300 and file_path ~ '^[A-Za-z0-9/_.-]+$' and file_path not like '%..%')),
  add constraint quotations_one_per_vendor unique (purchase_request_id, vendor_id);
create index if not exists quotations_vendor_idx on public.quotations (vendor_id);

create or replace function public.guard_quotation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  rid uuid;
  st public.purchase_status;
  blacklisted boolean;
begin
  if (select auth.uid()) is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  rid := case when tg_op = 'DELETE' then old.purchase_request_id else new.purchase_request_id end;
  select r.status into st from public.purchase_requests r where r.id = rid;
  if st is null or st not in ('submitted', 'quotations_attached') then
    raise exception 'quotations can only change while the request is open for quotes' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if tg_op = 'INSERT' then
    if new.is_selected then
      raise exception 'a quotation is selected only when the request is approved' using errcode = '42501';
    end if;
    select v.is_blacklisted into blacklisted from public.vendors v where v.id = new.vendor_id;
    if blacklisted then
      raise exception 'this vendor is blacklisted' using errcode = '42501';
    end if;
  else
    if new.purchase_request_id is distinct from old.purchase_request_id or new.vendor_id is distinct from old.vendor_id then
      raise exception 'a quotation cannot move to another request or vendor' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.guard_quotation() from public, anon, authenticated;
drop trigger if exists guard_quotation on public.quotations;
create trigger guard_quotation before insert or update or delete on public.quotations
  for each row execute function public.guard_quotation();

create policy quotations_select on public.quotations for select to authenticated
  using (exists (select 1 from public.purchase_requests r where r.id = purchase_request_id));
create policy quotations_insert on public.quotations for insert to authenticated
  with check (public.has_role('procurement') and exists (select 1 from public.purchase_requests r where r.id = purchase_request_id));
create policy quotations_update on public.quotations for update to authenticated
  using (public.has_role('procurement') and exists (select 1 from public.purchase_requests r where r.id = purchase_request_id))
  with check (public.has_role('procurement'));
create policy quotations_delete on public.quotations for delete to authenticated
  using (public.has_role('procurement') and exists (select 1 from public.purchase_requests r where r.id = purchase_request_id));
revoke update on public.quotations from authenticated;
grant update (amount, file_path) on public.quotations to authenticated;

-- ===== purchase orders: created only by issue_po =====
create unique index if not exists purchase_orders_one_per_request on public.purchase_orders (purchase_request_id);
create index if not exists purchase_orders_vendor_idx on public.purchase_orders (vendor_id);
create policy purchase_orders_select on public.purchase_orders for select to authenticated
  using (exists (select 1 from public.purchase_requests r where r.id = purchase_request_id));
revoke insert, update, delete on public.purchase_orders from authenticated;

create trigger audit_quotations after insert or update or delete on public.quotations
  for each row execute function public.log_audit();
create trigger audit_purchase_orders after insert or update or delete on public.purchase_orders
  for each row execute function public.log_audit();

-- ===== act_on_purchase_request: the only way a request changes status =====
-- submit (requester) -> ready (Procurement) -> approve (PM; ED from BDT 500,000) -> issue_po (Procurement).
-- reject (Procurement / PM / ED, with a comment) ends a request before the order.
create or replace function public.act_on_purchase_request(
  p_request_id uuid, p_action text, p_comment text default null, p_quotation_id uuid default null)
returns public.purchase_status language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  r public.purchase_requests%rowtype;
  c text := nullif(btrim(coalesce(p_comment, '')), '');
  quote_threshold constant numeric := 50000;     -- BDT: 3 different vendors from here
  exec_threshold  constant numeric := 500000;    -- BDT: Executive Director approves from here
  n_quotes int; n_vendors int; n_bad int; max_q numeric; min_q numeric;
  q public.quotations%rowtype;
  stage_now public.project_stage;
  approver uuid;
  need public.app_role;
  nxt public.purchase_status;
  step int;
begin
  if me is null or not public.is_active_user() then
    raise exception 'sign in required' using errcode = '42501';
  end if;
  if p_action not in ('submit', 'ready', 'approve', 'reject', 'issue_po') then
    raise exception 'unknown action %', p_action using errcode = '22023';
  end if;
  select * into r from public.purchase_requests where id = p_request_id for update;
  if not found then
    raise exception 'request not found' using errcode = 'P0002';
  end if;
  if not public.can_access_project(r.project_id) then
    raise exception 'no access to this project' using errcode = '42501';
  end if;
  select p.stage into stage_now from public.projects p where p.id = r.project_id;
  if stage_now = 'closed' then
    raise exception 'the project is closed' using errcode = '42501';
  end if;

  select count(*), count(distinct qq.vendor_id), count(*) filter (where v.is_blacklisted), max(qq.amount), min(qq.amount)
    into n_quotes, n_vendors, n_bad, max_q, min_q
    from public.quotations qq join public.vendors v on v.id = qq.vendor_id
    where qq.purchase_request_id = r.id;

  if p_action = 'submit' then
    if r.requester_id <> me then
      raise exception 'only the requester can submit' using errcode = '42501';
    end if;
    if r.status <> 'draft' then
      raise exception 'this request is already %', r.status using errcode = '42501';
    end if;
    update public.purchase_requests set status = 'submitted' where id = r.id;
    return 'submitted';
  end if;

  if p_action = 'reject' then
    if r.status not in ('submitted', 'quotations_attached', 'approved') then
      raise exception 'a % request cannot be rejected', r.status using errcode = '42501';
    end if;
    need := case when public.has_role('procurement') then 'procurement'
                 when public.has_role('programme_manager') then 'programme_manager'
                 when public.has_role('executive') then 'executive' else null end;
    if need is null then
      raise exception 'only Procurement, the Programme Manager or the Executive Director can reject' using errcode = '42501';
    end if;
    if c is null or char_length(c) < 3 then
      raise exception 'a comment is required to reject a request' using errcode = '22023';
    end if;
    nxt := 'rejected';
  elsif p_action = 'ready' then
    need := 'procurement';
    if not public.has_role(need) then
      raise exception 'only Procurement can mark quotations ready' using errcode = '42501';
    end if;
    if r.status <> 'submitted' then
      raise exception 'quotations can be marked ready only for a submitted request' using errcode = '42501';
    end if;
    if n_quotes < 1 or n_bad > 0 then
      raise exception 'attach at least one quotation, none from a blacklisted vendor' using errcode = '22023';
    end if;
    if greatest(r.estimated_amount, coalesce(max_q, 0)) >= quote_threshold and n_vendors < 3 then
      raise exception 'from BDT 50,000 quotations from 3 different vendors are required (now %)', n_vendors using errcode = '22023';
    end if;
    nxt := 'quotations_attached';
  elsif p_action = 'approve' then
    if r.status <> 'quotations_attached' then
      raise exception 'only a request with quotations ready can be approved' using errcode = '42501';
    end if;
    if r.requester_id = me then
      raise exception 'separation of duties: you cannot approve your own request' using errcode = '42501';
    end if;
    select * into q from public.quotations where id = p_quotation_id and purchase_request_id = r.id;
    if not found then
      raise exception 'choose one of this request''s quotations' using errcode = '22023';
    end if;
    if n_bad > 0 or exists (select 1 from public.vendors v where v.id = q.vendor_id and v.is_blacklisted) then
      raise exception 'a blacklisted vendor is involved' using errcode = '42501';
    end if;
    if greatest(r.estimated_amount, coalesce(max_q, 0)) >= quote_threshold and n_vendors < 3 then
      raise exception 'from BDT 50,000 quotations from 3 different vendors are required (now %)', n_vendors using errcode = '22023';
    end if;
    need := case when greatest(r.estimated_amount, q.amount) >= exec_threshold then 'executive' else 'programme_manager' end;
    if not (public.has_role(need) or public.has_role('executive')) then
      raise exception 'this approval needs the % role', need using errcode = '42501';
    end if;
    if q.amount > min_q and (c is null or char_length(c) < 10) then
      raise exception 'you chose a quotation that is not the lowest: write the reason (10+ characters)' using errcode = '22023';
    end if;
    update public.quotations set is_selected = (id = q.id) where purchase_request_id = r.id;
    nxt := 'approved';
  else -- issue_po
    need := 'procurement';
    if not public.has_role(need) then
      raise exception 'only Procurement can issue a purchase order' using errcode = '42501';
    end if;
    if r.status <> 'approved' then
      raise exception 'only an approved request can get a purchase order' using errcode = '42501';
    end if;
    select * into q from public.quotations where purchase_request_id = r.id and is_selected;
    if not found then
      raise exception 'no quotation is selected' using errcode = '22023';
    end if;
    if exists (select 1 from public.vendors v where v.id = q.vendor_id and v.is_blacklisted) then
      raise exception 'the selected vendor is blacklisted now' using errcode = '42501';
    end if;
    select a.actor_id into approver from public.approvals a
      where a.subject_type = 'procurement' and a.subject_id = r.id and a.status = 'approved'
        and a.required_role in ('programme_manager', 'executive')
      order by a.step_no desc limit 1;
    if approver = me then
      raise exception 'separation of duties: the approver cannot also issue the order' using errcode = '42501';
    end if;
    insert into public.purchase_orders (purchase_request_id, vendor_id, total_amount)
      values (r.id, q.vendor_id, q.amount);
    nxt := 'po_issued';
  end if;

  select coalesce(max(a.step_no), 0) + 1 into step from public.approvals a
    where a.subject_type = 'procurement' and a.subject_id = r.id;
  insert into public.approvals (subject_type, subject_id, step_no, required_role, status, actor_id, acted_at, comment)
  values ('procurement', r.id, step, need,
          case when p_action = 'reject' then 'rejected' else 'approved' end::public.approval_status, me, now(), c);
  update public.purchase_requests set status = nxt where id = r.id;
  return nxt;
end $$;
revoke execute on function public.act_on_purchase_request(uuid, text, text, uuid) from public, anon;
grant execute on function public.act_on_purchase_request(uuid, text, text, uuid) to authenticated;
