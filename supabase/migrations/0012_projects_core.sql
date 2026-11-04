-- 0012_projects_core.sql
-- Projects from the database (PR #4).
--
--   * organizations: registration number + authority (entered by officers, never hard-coded)
--   * projects: location, donor, budget (+ currency), beneficiary target, NGOAB reference
--   * who may create / edit / archive projects (ED + Program Officers; only the ED archives)
--   * repo matches production: authenticated may not TRUNCATE / TRIGGER / REFERENCES
--   * private bucket for beneficiary files
--
-- Additive and non-destructive: no DROP of data, no DELETE, no UPDATE of existing rows.
-- Existing rows keep working: every new column is nullable or has a default.

-- ===== organizations =====
alter table public.organizations
  add column if not exists registration_no text,
  add column if not exists registration_authority text;

-- ===== projects =====
alter table public.projects
  add column if not exists location text,
  add column if not exists donor_name text,
  add column if not exists budget_amount numeric(14,2),
  add column if not exists budget_currency char(3) not null default 'BDT',
  add column if not exists beneficiary_target integer,
  add column if not exists ngoab_ref text;

-- NOT VALID: checked for every new or changed row, but existing (demo) rows are not
-- re-validated, so this migration can never fail on old data.
alter table public.projects
  add constraint projects_code_format
    check (code ~ '^[A-Za-z0-9][A-Za-z0-9_./-]{1,59}$') not valid,
  add constraint projects_title_length
    check (char_length(title) between 3 and 300) not valid,
  add constraint projects_budget_nonneg
    check (budget_amount is null or budget_amount >= 0),
  add constraint projects_currency_format
    check (budget_currency ~ '^[A-Z]{3}$'),
  add constraint projects_beneficiary_target_nonneg
    check (beneficiary_target is null or beneficiary_target >= 0);

-- ===== who may create / edit projects =====
-- Create: Executive Director, Programme Manager, Program Officer. The creator is always the
-- signed-in user (no faking created_by). The creator can then see the project through
-- can_access_project() (created_by = auth.uid()).
drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects for insert to authenticated
  with check (
    public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
    and created_by = (select auth.uid())
  );

-- Update: same roles, and only on projects they can access.
drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update to authenticated
  using (
    public.can_access_project(id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  )
  with check (
    public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );

-- INSERT ... RETURNING re-checks the SELECT policy against the new row, but a STABLE function
-- (can_access_project) cannot see a row inserted by the same statement. This direct rule lets a
-- creator read back the project they just made. It grants nothing new: can_access_project()
-- already lets the creator see it.
create policy projects_select_creator on public.projects for select to authenticated
  using (created_by = (select auth.uid()) and deleted_at is null and public.is_active_user());

-- Guard: only the Executive Director archives a project (sets deleted_at); created_by is fixed.
-- Direct database sessions with no signed-in user (SQL editor, migrations, service role) pass.
create or replace function public.guard_project_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if new.created_by is distinct from old.created_by then
    raise exception 'created_by cannot be changed' using errcode = '42501';
  end if;
  if new.deleted_at is distinct from old.deleted_at and not public.has_role('executive') then
    raise exception 'only the Executive Director can archive a project' using errcode = '42501';
  end if;
  return new;
end $$;

revoke execute on function public.guard_project_update() from public, anon, authenticated;

drop trigger if exists guard_project_update on public.projects;
create trigger guard_project_update before update on public.projects
  for each row execute function public.guard_project_update();

-- ===== privileges: match production =====
-- Row Level Security does not apply to TRUNCATE; nobody signed in may run it.
revoke truncate, trigger, references on all tables in schema public from authenticated, anon;

-- ===== private bucket for beneficiary files =====
-- Like project-documents: no storage.objects policies on purpose. Only server code (service
-- role) reads and writes, after checking the user's session.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'beneficiary-vault',
  'beneficiary-vault',
  false,
  10485760, -- 10 MB
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
