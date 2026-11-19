-- 0041: the daily work plan, and reviewers become optional for the monthly Work Statement.
--
-- Daily plan (work_plan_items): every staff member lists the tasks they will do on a day (today or ahead), changes
-- the list during the day, and at the end of the day marks each task done / doing / not done (with a short reason).
-- The Executive Director and the Super Admin read everyone's plan and may give a task to a staff member
-- ("assigned"). Nobody else reads another person's plan (no other staff, Board, Law Officer, donors or partners).
--   * A person adds, edits and removes their own tasks.
--   * A task given by the Executive Director / Super Admin: the person cannot change its title, project, place or
--     owner and cannot remove it; the person reports on it (status, reason, note) and may move it to another day.
--     The person who gave it may edit it (title, day, project, place, note) or remove it, but cannot change the
--     person's status or reason: that is the person's own report.
--   * Tasks of a month that has been submitted (submitted / verified / approved) are frozen.
-- The tasks marked "done" are offered to fill the "what you did" text of the Work Statement. Single tasks are not
-- audited (like work days); the fact that a task was assigned is kept in assigned / assigned_by.
--
-- Reviewers optional: a person with no verifier and no approver set now submits the month and it is final at once
-- (status approved, approved_by empty, nobody had to sign). With reviewers set, the steps are exactly as in 0040.
-- Also closes a gap in 0040: a statement whose approver was removed after submitting could be approved by anyone
-- because the check compared with NULL; the check now treats a missing approver as "only the Executive Director
-- or Super Admin may act".
-- Additive: one new table, helper triggers and policies, and a replaced guard function.

create table if not exists public.work_plan_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  plan_date   date not null,
  title       text not null check (char_length(btrim(title)) between 1 and 200),
  project_id  uuid references public.projects(id) on delete set null,
  place       text check (place is null or char_length(place) <= 120),
  note        text check (note is null or char_length(note) <= 500),
  status      text not null default 'planned' check (status in ('planned','doing','done','not_done')),
  reason      text check (reason is null or char_length(reason) <= 300),
  assigned    boolean not null default false,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists work_plan_items_user_date_idx on public.work_plan_items (user_id, plan_date);
create index if not exists work_plan_items_date_idx on public.work_plan_items (plan_date);
create index if not exists work_plan_items_project_idx on public.work_plan_items (project_id);
create index if not exists work_plan_items_assigned_by_idx on public.work_plan_items (assigned_by);

create or replace function public.guard_work_plan_item()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  is_ed boolean;
  owner uuid;
  d date;
begin
  if me is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  is_ed := public.has_any_role(array['executive','super_admin']::public.app_role[]);
  owner := case when tg_op = 'DELETE' then old.user_id else new.user_id end;

  if tg_op = 'INSERT' then
    if new.user_id = me then
      new.assigned := false; new.assigned_by := null;
    else
      if not is_ed then
        raise exception 'a plan task can only be added by the person it belongs to' using errcode = '42501';
      end if;
      new.assigned := true; new.assigned_by := me;
      new.status := 'planned'; new.reason := null;
    end if;
  elsif tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id or new.assigned is distinct from old.assigned or new.assigned_by is distinct from old.assigned_by then
      raise exception 'the owner and the giver of a task cannot change' using errcode = '42501';
    end if;
    if old.assigned and me = old.user_id then
      -- the person reports on a task they were given; they do not rewrite it
      new.title := old.title; new.project_id := old.project_id; new.place := old.place;
    elsif old.assigned and me is distinct from old.user_id then
      -- the giver edits the task; the person's own report stays theirs
      new.status := old.status; new.reason := old.reason;
    end if;
  else -- DELETE
    if old.assigned and me = old.user_id then
      raise exception 'a task given to you cannot be removed; mark it not done with a reason' using errcode = '42501';
    end if;
  end if;

  -- a submitted month is frozen (for every date involved)
  d := case when tg_op = 'DELETE' then old.plan_date else new.plan_date end;
  if exists (select 1 from public.work_statements s where s.user_id = owner and s.month = date_trunc('month', d)::date and s.status in ('submitted','verified','approved'))
     or (tg_op = 'UPDATE' and exists (select 1 from public.work_statements s where s.user_id = owner and s.month = date_trunc('month', old.plan_date)::date and s.status in ('submitted','verified','approved'))) then
    raise exception 'this month has been submitted, so its plan cannot be changed' using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  if new.status <> 'not_done' then new.reason := null; end if; -- a reason only goes with "not done"
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.guard_work_plan_item() from public, anon, authenticated;
drop trigger if exists guard_work_plan_item on public.work_plan_items;
create trigger guard_work_plan_item before insert or update or delete on public.work_plan_items
  for each row execute function public.guard_work_plan_item();

alter table public.work_plan_items enable row level security;
revoke all on table public.work_plan_items from anon, authenticated;
grant select, insert, update, delete on table public.work_plan_items to authenticated;

drop policy if exists work_plan_items_select on public.work_plan_items;
create policy work_plan_items_select on public.work_plan_items for select to authenticated
  using (user_id = (select auth.uid()) or public.has_any_role(array['executive','super_admin']::public.app_role[]));

drop policy if exists work_plan_items_insert on public.work_plan_items;
create policy work_plan_items_insert on public.work_plan_items for insert to authenticated
  with check (
    (user_id = (select auth.uid()) and public.is_staff_member() and (project_id is null or public.can_access_project(project_id)))
    or (user_id <> (select auth.uid()) and public.has_any_role(array['executive','super_admin']::public.app_role[]))
  );

drop policy if exists work_plan_items_update on public.work_plan_items;
create policy work_plan_items_update on public.work_plan_items for update to authenticated
  using (user_id = (select auth.uid()) or assigned_by = (select auth.uid()))
  with check (user_id = (select auth.uid()) or assigned_by = (select auth.uid()));

drop policy if exists work_plan_items_delete on public.work_plan_items;
create policy work_plan_items_delete on public.work_plan_items for delete to authenticated
  using ((user_id = (select auth.uid()) and not assigned) or assigned_by = (select auth.uid()));

-- ===== Work Statement: reviewers optional, and the NULL comparison gap closed =====
create or replace function public.guard_work_statement()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  is_ed boolean;
  rv public.work_reviewers%rowtype;
  month_end date;
  missing int;
  step_verify boolean;
begin
  if me is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    raise exception 'a work statement cannot be deleted' using errcode = '42501';
  end if;
  is_ed := public.has_any_role(array['executive','super_admin']::public.app_role[]); -- may step in so nothing waits on one absent person

  if tg_op = 'INSERT' then
    if new.user_id <> me or new.status <> 'draft' then
      raise exception 'a statement can only be started as a draft by the person it belongs to' using errcode = '42501';
    end if;
    if new.month > date_trunc('month', public.dhaka_today())::date then
      raise exception 'a statement cannot be started for a future month' using errcode = '42501';
    end if;
    new.verifier_id := null; new.approver_id := null; new.submitted_at := null;
    new.verified_by := null; new.verified_at := null; new.approved_by := null; new.approved_at := null; new.return_note := null;
    new.signed_prepared := false; new.signed_verified := false; new.signed_approved := false;
    return new;
  end if;

  -- UPDATE
  if new.user_id is distinct from old.user_id or new.month is distinct from old.month then
    raise exception 'the person and the month of a statement cannot change' using errcode = '42501';
  end if;
  if old.status = 'approved' then
    raise exception 'an approved statement cannot be changed' using errcode = '42501';
  end if;
  if new.status = old.status then
    new.verifier_id := old.verifier_id; new.approver_id := old.approver_id; new.submitted_at := old.submitted_at;
    new.verified_by := old.verified_by; new.verified_at := old.verified_at; new.approved_by := old.approved_by;
    new.approved_at := old.approved_at; new.return_note := old.return_note;
    new.signed_prepared := old.signed_prepared; new.signed_verified := old.signed_verified; new.signed_approved := old.signed_approved;
    return new;
  end if;

  if old.status in ('draft','returned') and new.status = 'submitted' then
    if me <> old.user_id then
      raise exception 'only the person can submit their own statement' using errcode = '42501';
    end if;
    month_end := (old.month + interval '1 month - 1 day')::date;
    if public.dhaka_today() < month_end then
      raise exception 'a month can be submitted from its last day' using errcode = '42501';
    end if;
    select count(*) into missing
      from generate_series(old.month::timestamp, month_end::timestamp, interval '1 day') d
      where extract(dow from d) not in (5, 6)
        and not exists (select 1 from public.work_days w where w.user_id = old.user_id and w.work_date = d::date);
    if missing > 0 then
      raise exception 'every working day must be filled in before submitting (% missing)', missing using errcode = '42501';
    end if;
    select * into rv from public.work_reviewers where user_id = old.user_id;
    if not found then
      rv.verifier_id := null; rv.approver_id := null;
    end if;
    new.verifier_id := rv.verifier_id; new.approver_id := rv.approver_id;
    new.submitted_at := now(); new.return_note := null;
    new.verified_by := null; new.verified_at := null; new.approved_by := null; new.approved_at := null;
    if new.signed_prepared and not exists (select 1 from public.staff_signatures g where g.user_id = me) then
      raise exception 'save your signature first, or submit without it' using errcode = '42501';
    end if;
    new.signed_verified := false; new.signed_approved := false;
    if rv.verifier_id is null and rv.approver_id is null then
      -- no reviewer set for this person: submitting makes the month final at once
      new.status := 'approved';
      new.approved_at := now();
    end if;
    return new;
  end if;

  if me = old.user_id then
    raise exception 'you cannot review your own statement' using errcode = '42501';
  end if;
  step_verify := old.status = 'submitted' and old.verifier_id is not null;

  if old.status = 'submitted' and new.status = 'verified' then
    if old.verifier_id is null or not (me = old.verifier_id or is_ed) then
      raise exception 'only the verifier can verify this statement' using errcode = '42501';
    end if;
    new.verified_by := me; new.verified_at := now();
    new.verifier_id := old.verifier_id; new.approver_id := old.approver_id; new.submitted_at := old.submitted_at; new.return_note := null;
    if new.signed_verified and not exists (select 1 from public.staff_signatures g where g.user_id = me) then
      raise exception 'save your signature first, or continue without it' using errcode = '42501';
    end if;
    new.signed_prepared := old.signed_prepared; new.signed_approved := false;
    return new;
  end if;

  if new.status = 'approved' and (old.status = 'verified' or (old.status = 'submitted' and old.verifier_id is null)) then
    if not (coalesce(me = old.approver_id, false) or is_ed) then
      raise exception 'only the approver can approve this statement' using errcode = '42501';
    end if;
    new.approved_by := me; new.approved_at := now();
    new.verifier_id := old.verifier_id; new.approver_id := old.approver_id; new.submitted_at := old.submitted_at;
    new.verified_by := old.verified_by; new.verified_at := old.verified_at; new.return_note := null;
    if new.signed_approved and not exists (select 1 from public.staff_signatures g where g.user_id = me) then
      raise exception 'save your signature first, or continue without it' using errcode = '42501';
    end if;
    new.signed_prepared := old.signed_prepared; new.signed_verified := old.signed_verified;
    return new;
  end if;

  if new.status = 'returned' and old.status in ('submitted','verified') then
    if not (
      is_ed
      or (old.status = 'submitted' and coalesce(me = case when step_verify then old.verifier_id else old.approver_id end, false))
      or (old.status = 'verified' and coalesce(me = old.approver_id, false))
    ) then
      raise exception 'only the reviewer of this step can return this statement' using errcode = '42501';
    end if;
    if new.return_note is null or btrim(new.return_note) = '' then
      raise exception 'a note is needed when a statement is returned' using errcode = '42501';
    end if;
    new.verifier_id := old.verifier_id; new.approver_id := old.approver_id; new.submitted_at := old.submitted_at;
    new.verified_by := null; new.verified_at := null; new.approved_by := null; new.approved_at := null;
    new.signed_prepared := false; new.signed_verified := false; new.signed_approved := false;
    return new;
  end if;

  raise exception 'this change of a statement is not allowed' using errcode = '42501';
end $$;
revoke execute on function public.guard_work_statement() from public, anon, authenticated;
