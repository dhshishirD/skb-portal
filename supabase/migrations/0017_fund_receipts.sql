-- 0017_fund_receipts.sql
-- Fund receipts (donor-pack module 2).
--
--   * project_fund_receipts: each transfer received from the donor for a project (date, amount,
--     currency, bank reference, who it came from, a note) and the status of the signed
--     acknowledgement letter (not sent / sent / signed copy received).
--   * A project can have one or several receipts (instalments). The total received is calculated
--     by the application; nothing derived is stored.
--   * Recorded by the Executive Director, Finance and Program Officers on their projects.
--     Only the Executive Director and Finance may delete a receipt. Every change is in the audit log.
--   * Donors cannot read it (the donor sees what SKB publishes). Board / legal officer: read-only oversight.
--   * A closed project's receipts cannot be changed.
--
-- Additive: one new table, one function, triggers and policies. No existing table or row is touched.
-- Direct database sessions with no signed-in user (SQL editor, migrations, service role) are not restricted,
-- as in 0012, 0015 and 0016.

create table if not exists public.project_fund_receipts (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  received_on date not null,
  amount      numeric(14,2) not null check (amount > 0),
  currency    char(3) not null check (currency ~ '^[A-Z]{3}$'),
  reference   text check (reference is null or char_length(reference) between 1 and 120),
  from_name   text check (from_name is null or char_length(from_name) between 1 and 200),
  note        text check (note is null or char_length(note) <= 500),
  ack_status  text not null default 'not_sent' check (ack_status in ('not_sent', 'sent', 'signed_copy_received')),
  created_by  uuid default auth.uid() references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists project_fund_receipts_project_idx on public.project_fund_receipts (project_id, received_on);
create index if not exists project_fund_receipts_created_by_idx on public.project_fund_receipts (created_by);

-- ===== rules (signed-in users only) =====
create or replace function public.guard_project_fund_receipt()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  pid uuid;
  stage_now public.project_stage;
begin
  if (select auth.uid()) is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  pid := case when tg_op = 'DELETE' then old.project_id else new.project_id end;
  if tg_op = 'UPDATE' and new.project_id is distinct from old.project_id then
    raise exception 'a fund receipt cannot move to another project' using errcode = '42501';
  end if;
  select p.stage into stage_now from public.projects p where p.id = pid;
  if stage_now = 'closed' then
    raise exception 'the fund receipts of a closed project cannot be changed' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  if tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.guard_project_fund_receipt() from public, anon, authenticated;

drop trigger if exists guard_project_fund_receipt on public.project_fund_receipts;
create trigger guard_project_fund_receipt before insert or update or delete on public.project_fund_receipts
  for each row execute function public.guard_project_fund_receipt();

-- ===== who changed what and when =====
drop trigger if exists audit_project_fund_receipts on public.project_fund_receipts;
create trigger audit_project_fund_receipts after insert or update or delete on public.project_fund_receipts
  for each row execute function public.log_audit();

-- ===== access =====
alter table public.project_fund_receipts enable row level security;
revoke all on table public.project_fund_receipts from anon, authenticated;
grant select, insert, update, delete on table public.project_fund_receipts to authenticated;

-- read: people on the project, never a donor; board / legal officer read everything (oversight)
drop policy if exists project_fund_receipts_select on public.project_fund_receipts;
create policy project_fund_receipts_select on public.project_fund_receipts for select to authenticated
  using (public.can_access_project(project_id) and not public.has_role('donor'));
drop policy if exists project_fund_receipts_select_oversight on public.project_fund_receipts;
create policy project_fund_receipts_select_oversight on public.project_fund_receipts for select to authenticated
  using (public.has_oversight_read());

-- write: Executive Director, Finance and Program Officers on their projects
drop policy if exists project_fund_receipts_insert on public.project_fund_receipts;
create policy project_fund_receipts_insert on public.project_fund_receipts for insert to authenticated
  with check (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','finance','project_officer']::public.app_role[])
    and created_by = (select auth.uid())
  );
drop policy if exists project_fund_receipts_update on public.project_fund_receipts;
create policy project_fund_receipts_update on public.project_fund_receipts for update to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','finance','project_officer']::public.app_role[])
  )
  with check (
    public.has_any_role(array['executive','finance','project_officer']::public.app_role[])
  );
-- delete: money records, so only the Executive Director and Finance
drop policy if exists project_fund_receipts_delete on public.project_fund_receipts;
create policy project_fund_receipts_delete on public.project_fund_receipts for delete to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','finance']::public.app_role[])
  );
