-- 0018_project_charter.sql
-- Project charter (projects step 3).
--
--   * project_charter_versions: every save of the charter is a NEW numbered version; old versions are
--     never changed or deleted. A version holds the written parts: background, objectives, scope
--     (in / out), main deliverables, risks and assumptions, team and roles, and an optional note
--     saying what changed.
--   * Project facts (title, code, donor, amount, dates, location, target) are NOT copied here: the
--     application reads them from the project when it shows or exports a version.
--   * The Executive Director can approve one version (approved_by / approved_at are set by the
--     database from the signed-in user). Approval is the only change allowed on an existing version.
--   * Written by the Executive Director, Programme Manager and Program Officers on their projects.
--     Donors cannot read it. Board / legal officer: read-only oversight.
--   * A closed project's charter cannot be changed or approved.
--
-- Additive: one new table, one function, triggers and policies. No existing table or row is touched.
-- Direct database sessions with no signed-in user (SQL editor, migrations, service role) are not
-- restricted, as in 0012, 0015, 0016 and 0017.

create table if not exists public.project_charter_versions (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  version     integer not null check (version >= 1),
  background  text not null default '' check (char_length(background) <= 8000),
  objectives  text not null default '' check (char_length(objectives) <= 8000),
  scope_in    text not null default '' check (char_length(scope_in) <= 8000),
  scope_out   text not null default '' check (char_length(scope_out) <= 8000),
  deliverables text not null default '' check (char_length(deliverables) <= 8000),
  risks       text not null default '' check (char_length(risks) <= 8000),
  team        text not null default '' check (char_length(team) <= 8000),
  change_note text check (change_note is null or char_length(change_note) <= 500),
  created_by  uuid default auth.uid() references auth.users(id),
  created_at  timestamptz not null default now(),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  constraint project_charter_version_unique unique (project_id, version),
  constraint project_charter_approval_pair check ((approved_by is null) = (approved_at is null))
);
create index if not exists project_charter_versions_created_by_idx on public.project_charter_versions (created_by);
create index if not exists project_charter_versions_approved_by_idx on public.project_charter_versions (approved_by);

-- ===== rules (signed-in users only) =====
create or replace function public.guard_project_charter_version()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  stage_now public.project_stage;
  last_version integer;
begin
  if (select auth.uid()) is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    raise exception 'a charter version cannot be deleted' using errcode = '42501';
  end if;

  select p.stage into stage_now from public.projects p where p.id = new.project_id;
  if stage_now = 'closed' then
    raise exception 'the charter of a closed project cannot be changed' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    -- the number is given by the database: next after the highest existing version
    select coalesce(max(v.version), 0) into last_version
      from public.project_charter_versions v where v.project_id = new.project_id;
    new.version := last_version + 1;
    new.created_by := (select auth.uid());
    new.created_at := now();
    new.approved_by := null;
    new.approved_at := null;
    return new;
  end if;

  -- UPDATE: only approval may change, and only by the Executive Director
  if new.project_id is distinct from old.project_id
     or new.version is distinct from old.version
     or new.background is distinct from old.background
     or new.objectives is distinct from old.objectives
     or new.scope_in is distinct from old.scope_in
     or new.scope_out is distinct from old.scope_out
     or new.deliverables is distinct from old.deliverables
     or new.risks is distinct from old.risks
     or new.team is distinct from old.team
     or new.change_note is distinct from old.change_note
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'a saved charter version cannot be edited; save a new version instead' using errcode = '42501';
  end if;
  if new.approved_at is distinct from old.approved_at or new.approved_by is distinct from old.approved_by then
    if not public.has_role('executive') then
      raise exception 'only the Executive Director can approve the charter' using errcode = '42501';
    end if;
    if old.approved_at is not null then
      raise exception 'this charter version is already approved' using errcode = '42501';
    end if;
    new.approved_by := (select auth.uid());
    new.approved_at := now();
  end if;
  return new;
end $$;
revoke execute on function public.guard_project_charter_version() from public, anon, authenticated;

drop trigger if exists guard_project_charter_version on public.project_charter_versions;
create trigger guard_project_charter_version before insert or update or delete on public.project_charter_versions
  for each row execute function public.guard_project_charter_version();

-- ===== who changed what and when =====
drop trigger if exists audit_project_charter_versions on public.project_charter_versions;
create trigger audit_project_charter_versions after insert or update or delete on public.project_charter_versions
  for each row execute function public.log_audit();

-- ===== access =====
alter table public.project_charter_versions enable row level security;
revoke all on table public.project_charter_versions from anon, authenticated;
grant select, insert, update on table public.project_charter_versions to authenticated;

-- read: people on the project, never a donor; board / legal officer read everything (oversight)
drop policy if exists project_charter_versions_select on public.project_charter_versions;
create policy project_charter_versions_select on public.project_charter_versions for select to authenticated
  using (public.can_access_project(project_id) and not public.has_role('donor'));
drop policy if exists project_charter_versions_select_oversight on public.project_charter_versions;
create policy project_charter_versions_select_oversight on public.project_charter_versions for select to authenticated
  using (public.has_oversight_read());

-- write a new version: Executive Director, Programme Manager and Program Officers on their projects
drop policy if exists project_charter_versions_insert on public.project_charter_versions;
create policy project_charter_versions_insert on public.project_charter_versions for insert to authenticated
  with check (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
-- approve: Executive Director only (the guard allows nothing else to change)
drop policy if exists project_charter_versions_approve on public.project_charter_versions;
create policy project_charter_versions_approve on public.project_charter_versions for update to authenticated
  using (public.can_access_project(project_id) and public.has_role('executive'))
  with check (public.has_role('executive'));
