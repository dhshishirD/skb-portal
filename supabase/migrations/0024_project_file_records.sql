-- 0024_project_file_records.sql
-- File tracking for distribution lists and NID sheets (follow-up to Beneficiaries and Closing).
--
-- The portal does NOT store these files. It records that each one exists, what state it is in
-- (prepared, signed, sent, received) and, when the file is kept online, an https link to it.
-- No names or ID numbers are stored here.
--
-- Who may do what: the Executive Director, Programme Manager, Project Officers and Field Officers on the
-- project add and update records; Project Officers, Programme Manager and Executive Director delete.
-- M&E Officers on the project read, and so do the Board and the Law Officer (oversight).
-- Donors, finance and procurement see nothing. A closed project is frozen. Every change is audited.
--
-- Direct database sessions with no signed-in user (SQL editor, migrations, service role) are not restricted,
-- as in 0012 and later.

create table if not exists public.project_file_records (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  kind        text not null check (kind in ('distribution_list', 'nid_sheet')),
  name        text not null check (char_length(name) between 3 and 200),
  status      text not null default 'prepared' check (status in ('prepared', 'signed', 'sent', 'received')),
  link        text check (link is null or (char_length(link) <= 500 and link ~ '^https://[^[:space:]]+$')),
  note        text check (note is null or char_length(note) <= 300),
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id),
  updated_at  timestamptz not null default now()
);
create index if not exists project_file_records_project_idx on public.project_file_records (project_id, kind, created_at desc);
create index if not exists project_file_records_created_by_idx on public.project_file_records (created_by);
create index if not exists project_file_records_updated_by_idx on public.project_file_records (updated_by);

create or replace function public.guard_file_record()
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
  select p.stage into stage_now from public.projects p where p.id = pid;
  if stage_now = 'closed' then
    raise exception 'the file records of a closed project cannot be changed' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
    new.created_at := now();
  else
    if new.project_id is distinct from old.project_id
       or new.kind is distinct from old.kind
       or new.created_by is distinct from old.created_by
       or new.created_at is distinct from old.created_at then
      raise exception 'a file record cannot move to another project, change its kind or change who added it' using errcode = '42501';
    end if;
  end if;
  new.updated_by := (select auth.uid());
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.guard_file_record() from public, anon, authenticated;

drop trigger if exists guard_file_record on public.project_file_records;
create trigger guard_file_record before insert or update or delete on public.project_file_records
  for each row execute function public.guard_file_record();

drop trigger if exists audit_project_file_records on public.project_file_records;
create trigger audit_project_file_records after insert or update or delete on public.project_file_records
  for each row execute function public.log_audit();

alter table public.project_file_records enable row level security;
revoke all on table public.project_file_records from anon, authenticated;
grant select, insert, update, delete on table public.project_file_records to authenticated;

drop policy if exists file_records_select on public.project_file_records;
create policy file_records_select on public.project_file_records for select to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer','field_officer','me_officer']::public.app_role[])
  );
drop policy if exists file_records_select_oversight on public.project_file_records;
create policy file_records_select_oversight on public.project_file_records for select to authenticated
  using (public.has_oversight_read());
drop policy if exists file_records_insert on public.project_file_records;
create policy file_records_insert on public.project_file_records for insert to authenticated
  with check (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer','field_officer']::public.app_role[])
  );
drop policy if exists file_records_update on public.project_file_records;
create policy file_records_update on public.project_file_records for update to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer','field_officer']::public.app_role[])
  )
  with check (
    public.has_any_role(array['executive','programme_manager','project_officer','field_officer']::public.app_role[])
  );
drop policy if exists file_records_delete on public.project_file_records;
create policy file_records_delete on public.project_file_records for delete to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
