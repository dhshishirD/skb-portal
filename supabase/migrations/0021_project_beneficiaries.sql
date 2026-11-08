-- 0021_project_beneficiaries.sql
-- Beneficiaries (projects step 6): the secure registry for one project.
--
-- Names, national ID numbers and phone numbers are encrypted by the application on the server
-- (AES-256-GCM) BEFORE they reach the database, so the database only ever holds ciphertext.
-- The database refuses anything that does not look like ciphertext when a signed-in user writes it,
-- so a plain name or number cannot be stored by mistake.
--
--   * beneficiaries: the existing table from 0005, now with rules.
--       - national_id_hash: a keyed one-way fingerprint of the ID number, so the same person is not
--         registered twice in one project without the number being readable.
--       - registered_by: the signed-in user who entered the record (set by the database).
--       - consent_at is no longer filled in automatically. It stays EMPTY ("consent not recorded")
--         until the consent wording approved by the Law Officer is built in a later step.
--   * beneficiary_access_log: one row each time someone reveals a national ID or phone number
--     (who, which person, which field, when, optional reason). Rows cannot be changed or deleted.
--   * Who may do what: the Executive Director, Programme Manager, Project Officers, Field Officers and
--     M&E Officers on the project read; Field Officers and Project Officers register and edit; Project
--     Officers, Programme Manager and Executive Director delete. The Law Officer keeps read access
--     (0005). Donors, finance, procurement and the board see nothing. A closed project is frozen.
--   * Every change is in the audit log (trigger from 0005).
--
-- The table is empty in production today (checked before applying).
-- Direct database sessions with no signed-in user (SQL editor, migrations, service role) are not restricted,
-- as in 0012 and later.

-- ===== table changes =====
alter table public.beneficiaries add column if not exists national_id_hash text;
alter table public.beneficiaries add column if not exists registered_by uuid default auth.uid() references auth.users(id);
alter table public.beneficiaries alter column consent_at drop not null;
alter table public.beneficiaries alter column consent_at drop default;

create index if not exists beneficiaries_project_idx on public.beneficiaries (project_id);
create index if not exists beneficiaries_registered_by_idx on public.beneficiaries (registered_by);
create index if not exists beneficiaries_consent_by_idx on public.beneficiaries (consent_by);
create index if not exists beneficiaries_location_idx on public.beneficiaries (location_id);
create unique index if not exists beneficiaries_project_nid_unique
  on public.beneficiaries (project_id, national_id_hash) where national_id_hash is not null;

do $$
begin
  -- the original check stopped at the year 2026; the guard below now refuses a birth year in the future
  alter table public.beneficiaries drop constraint if exists beneficiaries_birth_year_check;
  if not exists (select 1 from pg_constraint where conname = 'beneficiaries_birth_year_range') then
    alter table public.beneficiaries add constraint beneficiaries_birth_year_range check (
      birth_year is null or birth_year between 1900 and 2200);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'beneficiaries_hash_format') then
    alter table public.beneficiaries add constraint beneficiaries_hash_format check (
      national_id_hash is null or national_id_hash ~ '^[0-9a-f]{64}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'beneficiaries_enc_length') then
    alter table public.beneficiaries add constraint beneficiaries_enc_length check (
      char_length(full_name_enc) <= 2000
      and (national_id_enc is null or char_length(national_id_enc) <= 2000)
      and (phone_enc is null or char_length(phone_enc) <= 2000));
  end if;
end $$;

-- ===== access log =====
create table if not exists public.beneficiary_access_log (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  -- no foreign key on purpose: the log must survive if the person's record is deleted
  beneficiary_id uuid not null,
  field          text not null check (field in ('national_id', 'phone')),
  reason         text check (reason is null or char_length(reason) <= 200),
  accessed_by    uuid not null default auth.uid() references auth.users(id),
  accessed_at    timestamptz not null default now()
);
create index if not exists beneficiary_access_log_project_idx on public.beneficiary_access_log (project_id, accessed_at desc);
create index if not exists beneficiary_access_log_person_idx on public.beneficiary_access_log (beneficiary_id);
create index if not exists beneficiary_access_log_by_idx on public.beneficiary_access_log (accessed_by);

-- ===== rules: beneficiaries (signed-in users only) =====
create or replace function public.guard_beneficiary()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  stage_now public.project_stage;
  pid uuid;
  enc_format constant text := '^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$';
begin
  if (select auth.uid()) is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  pid := case when tg_op = 'DELETE' then old.project_id else new.project_id end;
  select p.stage into stage_now from public.projects p where p.id = pid;
  if stage_now = 'closed' then
    raise exception 'the beneficiaries of a closed project cannot be changed' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;

  if tg_op = 'UPDATE' and (new.project_id is distinct from old.project_id
                           or new.registered_by is distinct from old.registered_by
                           or new.created_at is distinct from old.created_at) then
    raise exception 'a beneficiary cannot move to another project or change who registered it' using errcode = '42501';
  end if;

  -- personal data must arrive encrypted by the application, never as plain text
  if new.full_name_enc !~ enc_format
     or (new.national_id_enc is not null and new.national_id_enc !~ enc_format)
     or (new.phone_enc is not null and new.phone_enc !~ enc_format) then
    raise exception 'personal data must be encrypted before it is saved' using errcode = '23514';
  end if;
  if (new.national_id_enc is null) is distinct from (new.national_id_hash is null) then
    raise exception 'the national ID and its fingerprint must be saved together' using errcode = '23514';
  end if;
  if new.birth_year is not null and new.birth_year > extract(year from now())::int then
    raise exception 'the birth year is in the future' using errcode = '23514';
  end if;

  -- consent is not recorded by this step: it can only be filled by a later, approved process
  if tg_op = 'INSERT' then
    new.registered_by := (select auth.uid());
    new.consent_at := null;
    new.consent_by := null;
  else
    new.consent_at := old.consent_at;
    new.consent_by := old.consent_by;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.guard_beneficiary() from public, anon, authenticated;

drop trigger if exists guard_beneficiary on public.beneficiaries;
create trigger guard_beneficiary before insert or update or delete on public.beneficiaries
  for each row execute function public.guard_beneficiary();

-- ===== rules: access log =====
create or replace function public.guard_beneficiary_access_log()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  new.accessed_by := (select auth.uid());
  new.accessed_at := now();
  return new;
end $$;
revoke execute on function public.guard_beneficiary_access_log() from public, anon, authenticated;

drop trigger if exists guard_beneficiary_access_log on public.beneficiary_access_log;
create trigger guard_beneficiary_access_log before insert on public.beneficiary_access_log
  for each row execute function public.guard_beneficiary_access_log();

-- ===== access =====
alter table public.beneficiaries enable row level security;
alter table public.beneficiary_access_log enable row level security;
revoke all on table public.beneficiary_access_log from anon, authenticated;
grant select, insert on table public.beneficiary_access_log to authenticated;

-- beneficiaries: the legal officer read policy from 0005 stays
drop policy if exists beneficiaries_select on public.beneficiaries;
create policy beneficiaries_select on public.beneficiaries for select to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer','field_officer','me_officer']::public.app_role[])
  );
drop policy if exists beneficiaries_insert on public.beneficiaries;
create policy beneficiaries_insert on public.beneficiaries for insert to authenticated
  with check (
    public.can_access_project(project_id)
    and public.has_any_role(array['field_officer','project_officer']::public.app_role[])
  );
drop policy if exists beneficiaries_update on public.beneficiaries;
create policy beneficiaries_update on public.beneficiaries for update to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['field_officer','project_officer']::public.app_role[])
  )
  with check (
    public.has_any_role(array['field_officer','project_officer']::public.app_role[])
  );
drop policy if exists beneficiaries_delete on public.beneficiaries;
create policy beneficiaries_delete on public.beneficiaries for delete to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['project_officer','programme_manager','executive']::public.app_role[])
  );

-- access log: anyone allowed to read a person may reveal a field, but only as themselves;
-- who has looked is visible to the Executive Director, Programme Manager (on the project) and Law Officer
drop policy if exists beneficiary_access_log_insert on public.beneficiary_access_log;
create policy beneficiary_access_log_insert on public.beneficiary_access_log for insert to authenticated
  with check (
    accessed_by = (select auth.uid())
    and public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer','field_officer','me_officer']::public.app_role[])
  );
drop policy if exists beneficiary_access_log_select on public.beneficiary_access_log;
create policy beneficiary_access_log_select on public.beneficiary_access_log for select to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager']::public.app_role[])
  );
drop policy if exists beneficiary_access_log_select_legal on public.beneficiary_access_log;
create policy beneficiary_access_log_select_legal on public.beneficiary_access_log for select to authenticated
  using (public.has_role('legal_officer'));
