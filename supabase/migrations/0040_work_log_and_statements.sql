-- 0040: the daily work log and the monthly Work Statement.
--
-- Every staff member records each working day (where they were, what they did). At the end of the month the
-- month becomes a Work Statement that goes to a verifier and then an approver, and is frozen once submitted.
-- Friday and Saturday are the weekly off days: they need no entry (they count as "off" unless the person
-- entered a working day on them).
--
-- Who sees what (this is personal data about staff, so it is narrow):
--   * work_days:       the person; the person's verifier / approver, the Executive Director and the Super Admin (who may step
--                      in as reviewers), but only once the
--                      month has been submitted (not while it is still a draft). Nobody else, not even the Board.
--   * work_statements: same people, same rule.
--   * work_reviewers:  who verifies and who approves each person. The person, the two reviewers, the Executive
--                      Director and the Super Admin read; only the Executive Director and the Super Admin change.
-- Donors, partners and auditors have no staff role, so they see nothing.
--
-- A signature is never required: every step can be done without it.
-- Digital signature (optional, per step): each person may save an image of their signature once
-- (staff_signatures, private bucket 'staff-signatures'; only server code reads or writes the file). At each step
-- (submit, verify, approve) the person may tick "sign with my saved signature"; the tick is stored on the
-- statement (signed_prepared / signed_verified / signed_approved) and the image is added to the Word file only for
-- steps that are done and ticked. This is a picture of a signature plus the portal's record of who did the step and
-- when; it is not a certified electronic signature.
--
-- Statement steps (enforced by the database, not only by the page):
--   draft/returned -> submitted   by the person, once the month has ended and every working day is filled in;
--                                  the verifier and approver are copied from work_reviewers at that moment.
--   submitted -> verified | returned   by the verifier (or, when the person has no verifier, the approver
--                                  approves directly: submitted -> approved).
--   verified -> approved | returned    by the approver.
--   The Executive Director and the Super Admin may act in either review step for other people's statements (so work never
--   waits on one absent person), never for their own; the statement records who really acted.
--   An approved statement cannot change. A returned one needs a note and goes back to the person.
-- Days of a submitted, verified or approved month are frozen. A day cannot be recorded for a future date.
-- Statements and reviewer changes are audited; single days are not (they are frozen with the statement).
-- Additive: four new tables, helper functions, triggers and policies. No existing row is touched.

create table if not exists public.work_reviewers (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  verifier_id uuid references public.profiles(id) on delete set null,
  approver_id uuid references public.profiles(id) on delete set null,
  updated_by  uuid references auth.users(id),
  updated_at  timestamptz not null default now(),
  check (verifier_id is distinct from user_id and approver_id is distinct from user_id)
);
create index if not exists work_reviewers_verifier_idx on public.work_reviewers (verifier_id);
create index if not exists work_reviewers_approver_idx on public.work_reviewers (approver_id);
create index if not exists work_reviewers_updated_by_idx on public.work_reviewers (updated_by);

create table if not exists public.work_days (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  work_date  date not null,
  day_type   text not null check (day_type in ('office','field','tour','leave','off')),
  place      text check (place is null or char_length(place) <= 120),
  project_id uuid references public.projects(id) on delete set null,
  tasks      text check (tasks is null or char_length(tasks) <= 1500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, work_date)
);
create index if not exists work_days_project_idx on public.work_days (project_id);

create table if not exists public.work_statements (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  month        date not null check (month = date_trunc('month', month)::date),
  status       text not null default 'draft' check (status in ('draft','submitted','verified','approved','returned')),
  verifier_id  uuid references public.profiles(id) on delete set null,
  approver_id  uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz,
  verified_by  uuid references public.profiles(id) on delete set null,
  verified_at  timestamptz,
  approved_by  uuid references public.profiles(id) on delete set null,
  approved_at  timestamptz,
  return_note  text check (return_note is null or char_length(return_note) <= 500),
  signed_prepared boolean not null default false,
  signed_verified boolean not null default false,
  signed_approved boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, month)
);
create index if not exists work_statements_verifier_idx on public.work_statements (verifier_id);
create index if not exists work_statements_approver_idx on public.work_statements (approver_id);
create index if not exists work_statements_verified_by_idx on public.work_statements (verified_by);
create index if not exists work_statements_approved_by_idx on public.work_statements (approved_by);

create table if not exists public.staff_signatures (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  image_path text not null,
  mime_type  text not null check (mime_type in ('image/png','image/jpeg')),
  updated_at timestamptz not null default now()
);

-- Private bucket, like project-documents: no storage.objects policies on purpose. Only server code (service role)
-- reads and writes, after checking the user's session and the statement the signature belongs to.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('staff-signatures', 'staff-signatures', false, 524288, array['image/png', 'image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Today's date in Dhaka (the database clock is UTC; between 00:00 and 06:00 in Dhaka the UTC date is still yesterday).
create or replace function public.dhaka_today()
returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'Asia/Dhaka')::date;
$$;

-- Who may read the days and the statement of one person for one month.
create or replace function public.can_read_work_statement(_user uuid, _month date)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) = _user
    or exists (
      select 1 from public.work_statements s
      where s.user_id = _user and s.month = _month
        and s.status in ('submitted','verified','approved','returned')
        and ((select auth.uid()) in (s.verifier_id, s.approver_id) or public.has_any_role(array['executive','super_admin']::public.app_role[]))
    );
$$;
revoke execute on function public.can_read_work_statement(uuid, date) from public, anon;
grant execute on function public.can_read_work_statement(uuid, date) to authenticated;

-- ===== guards =====
create or replace function public.guard_work_day()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  who uuid;
  m date;
begin
  if me is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  who := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  if who <> me then
    raise exception 'a work day can only be recorded by the person it belongs to' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and (new.user_id is distinct from old.user_id or new.work_date is distinct from old.work_date) then
    raise exception 'the person and the date of a work day cannot change' using errcode = '42501';
  end if;
  m := date_trunc('month', case when tg_op = 'DELETE' then old.work_date else new.work_date end)::date;
  if exists (select 1 from public.work_statements s where s.user_id = who and s.month = m and s.status in ('submitted','verified','approved')) then
    raise exception 'this month has been submitted, so its days cannot be changed' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if new.work_date > public.dhaka_today() then
    raise exception 'a work day cannot be recorded for a future date' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.guard_work_day() from public, anon, authenticated;
drop trigger if exists guard_work_day on public.work_days;
create trigger guard_work_day before insert or update or delete on public.work_days
  for each row execute function public.guard_work_day();

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
    -- no step: nothing else may be edited either
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
    if not found or rv.approver_id is null then
      raise exception 'no approver is set for this person yet; ask the administrator' using errcode = '42501';
    end if;
    new.verifier_id := rv.verifier_id; new.approver_id := rv.approver_id;
    new.submitted_at := now(); new.return_note := null;
    new.verified_by := null; new.verified_at := null; new.approved_by := null; new.approved_at := null;
    if new.signed_prepared and not exists (select 1 from public.staff_signatures g where g.user_id = me) then
      raise exception 'save your signature first, or submit without it' using errcode = '42501';
    end if;
    new.signed_verified := false; new.signed_approved := false;
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
    if not (me = old.approver_id or is_ed) then
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
      or (old.status = 'submitted' and me = case when step_verify then old.verifier_id else old.approver_id end)
      or (old.status = 'verified' and me = old.approver_id)
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
drop trigger if exists guard_work_statement on public.work_statements;
create trigger guard_work_statement before insert or update or delete on public.work_statements
  for each row execute function public.guard_work_statement();
drop trigger if exists audit_work_statements on public.work_statements;
create trigger audit_work_statements after insert or update on public.work_statements
  for each row execute function public.log_audit();

create or replace function public.guard_work_reviewers()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_by := (select auth.uid());
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.guard_work_reviewers() from public, anon, authenticated;
drop trigger if exists guard_work_reviewers on public.work_reviewers;
create trigger guard_work_reviewers before insert or update on public.work_reviewers
  for each row execute function public.guard_work_reviewers();
drop trigger if exists audit_work_reviewers on public.work_reviewers;
create trigger audit_work_reviewers after insert or update or delete on public.work_reviewers
  for each row execute function public.log_audit();

-- ===== row level security =====
alter table public.staff_signatures enable row level security;
revoke all on table public.staff_signatures from anon, authenticated;
grant select on table public.staff_signatures to authenticated;
drop policy if exists staff_signatures_select on public.staff_signatures;
create policy staff_signatures_select on public.staff_signatures for select to authenticated
  using (user_id = (select auth.uid()));
drop trigger if exists audit_staff_signatures on public.staff_signatures;
create trigger audit_staff_signatures after insert or update or delete on public.staff_signatures
  for each row execute function public.log_audit();

alter table public.work_reviewers  enable row level security;
alter table public.work_days       enable row level security;
alter table public.work_statements enable row level security;
revoke all on table public.work_reviewers, public.work_days, public.work_statements from anon, authenticated;
grant select, insert, update, delete on table public.work_reviewers to authenticated;
grant select, insert, update, delete on table public.work_days to authenticated;
grant select, insert, update on table public.work_statements to authenticated;

drop policy if exists work_reviewers_select on public.work_reviewers;
create policy work_reviewers_select on public.work_reviewers for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select auth.uid()) in (verifier_id, approver_id)
    or public.has_any_role(array['super_admin','executive']::public.app_role[])
  );
drop policy if exists work_reviewers_write on public.work_reviewers;
create policy work_reviewers_write on public.work_reviewers for all to authenticated
  using (public.has_any_role(array['super_admin','executive']::public.app_role[]))
  with check (public.has_any_role(array['super_admin','executive']::public.app_role[]));

drop policy if exists work_days_select on public.work_days;
create policy work_days_select on public.work_days for select to authenticated
  using (public.can_read_work_statement(user_id, date_trunc('month', work_date)::date));
drop policy if exists work_days_insert on public.work_days;
create policy work_days_insert on public.work_days for insert to authenticated
  with check (
    user_id = (select auth.uid()) and public.is_staff_member()
    and (project_id is null or public.can_access_project(project_id))
  );
drop policy if exists work_days_update on public.work_days;
create policy work_days_update on public.work_days for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (project_id is null or public.can_access_project(project_id)));
drop policy if exists work_days_delete on public.work_days;
create policy work_days_delete on public.work_days for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists work_statements_select on public.work_statements;
create policy work_statements_select on public.work_statements for select to authenticated
  using (public.can_read_work_statement(user_id, month));
drop policy if exists work_statements_insert on public.work_statements;
create policy work_statements_insert on public.work_statements for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_staff_member());
drop policy if exists work_statements_update on public.work_statements;
create policy work_statements_update on public.work_statements for update to authenticated
  using (
    user_id = (select auth.uid())
    or (select auth.uid()) in (verifier_id, approver_id)
    or public.has_any_role(array['executive','super_admin']::public.app_role[])
  )
  with check (true);
