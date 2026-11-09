-- 0022_project_documents.sql
-- Documents (projects step 7): files attached to a real project, versioned, with the real uploader
-- and a "release to donor" switch.
--
-- Before this, documents had one broad "for all" policy for any internal user on the project, and
-- document_versions had RLS on but NO policy (so nobody could use it). This migration adds:
--   * documents.description, released_to_donor / released_by / released_at.
--   * Who may do what: the Executive Director, Programme Manager and Program Officers add documents
--     and new versions on their projects. Only the Executive Director and Programme Manager release a
--     document to the donor. Nobody deletes for good: a document is "removed" (hidden) and the file
--     stays in storage and in the audit log.
--   * Versions are never edited or deleted. The database numbers them (1, 2, 3...), records the
--     uploader, and refuses a file path that belongs to another project.
--   * Donors see ONLY documents that were released to them, on the project funded by their own
--     organisation. Board, Law Officer and Auditors keep read access (as in 0013 and later).
--   * A closed project is frozen. Every change is in the audit log (triggers from 0002).
--
-- The files themselves stay in the private "project-documents" bucket. Browsers never get direct
-- storage access: the server checks the person, then hands out a short-lived signed link.
--
-- Additive for data: the 6 existing rows (no file attached yet) are kept as they are.
-- Direct database sessions with no signed-in user (SQL editor, migrations, service role) are not restricted,
-- as in 0012 and later.

-- ===== table changes =====
alter table public.documents add column if not exists description text;
alter table public.documents add column if not exists released_to_donor boolean not null default false;
alter table public.documents add column if not exists released_by uuid references auth.users(id);
alter table public.documents add column if not exists released_at timestamptz;
alter table public.document_versions add column if not exists original_name text;

create index if not exists documents_project_idx on public.documents (project_id, created_at desc);
create index if not exists documents_created_by_idx on public.documents (created_by);
create index if not exists documents_released_by_idx on public.documents (released_by);
create index if not exists documents_current_version_idx on public.documents (current_version_id);
create index if not exists document_versions_doc_idx on public.document_versions (document_id, version_no);
create index if not exists document_versions_uploaded_by_idx on public.document_versions (uploaded_by);
create unique index if not exists document_versions_doc_no_unique on public.document_versions (document_id, version_no);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'documents_text_limits') then
    alter table public.documents add constraint documents_text_limits check (
      char_length(title) between 2 and 200
      and char_length(category) between 1 and 40
      and (description is null or char_length(description) <= 1000)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'document_versions_limits') then
    alter table public.document_versions add constraint document_versions_limits check (
      size <= 26214400
      and (original_name is null or char_length(original_name) <= 200)) not valid;
  end if;
end $$;

-- ===== rules: documents (signed-in users only) =====
create or replace function public.guard_document()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  stage_now public.project_stage;
  pid uuid;
begin
  if (select auth.uid()) is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    raise exception 'a document cannot be deleted; remove it instead' using errcode = '42501';
  end if;
  pid := new.project_id;
  select p.stage into stage_now from public.projects p where p.id = pid;
  if stage_now = 'closed' then
    raise exception 'the documents of a closed project cannot be changed' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
    new.current_version_id := null;
    new.released_to_donor := false;
    new.released_by := null;
    new.released_at := null;
    new.deleted_at := null;
    new.updated_at := now();
    return new;
  end if;

  -- update
  if new.project_id is distinct from old.project_id
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'a document cannot move to another project or change who added it' using errcode = '42501';
  end if;
  if new.current_version_id is distinct from old.current_version_id
     and new.current_version_id is not null
     and not exists (select 1 from public.document_versions v
                     where v.id = new.current_version_id and v.document_id = new.id) then
    raise exception 'the current version must be a version of this document' using errcode = '23514';
  end if;
  if old.deleted_at is not null then
    raise exception 'a removed document cannot be changed' using errcode = '42501';
  end if;
  if new.released_to_donor is distinct from old.released_to_donor then
    if not public.has_any_role(array['executive','programme_manager']::public.app_role[]) then
      raise exception 'only the Executive Director or Programme Manager can release a document to the donor' using errcode = '42501';
    end if;
    if new.released_to_donor and new.current_version_id is null then
      raise exception 'a document with no file cannot be released' using errcode = '23514';
    end if;
    new.released_by := case when new.released_to_donor then (select auth.uid()) else null end;
    new.released_at := case when new.released_to_donor then now() else null end;
  else
    new.released_by := old.released_by;
    new.released_at := old.released_at;
  end if;
  if new.deleted_at is not null then
    -- removing a document also withdraws it from the donor
    new.released_to_donor := false;
    new.released_by := null;
    new.released_at := null;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.guard_document() from public, anon, authenticated;

drop trigger if exists guard_document on public.documents;
create trigger guard_document before insert or update or delete on public.documents
  for each row execute function public.guard_document();

-- ===== rules: versions =====
create or replace function public.guard_document_version()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  d public.documents%rowtype;
  stage_now public.project_stage;
begin
  if (select auth.uid()) is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op <> 'INSERT' then
    raise exception 'a document version cannot be changed or deleted' using errcode = '42501';
  end if;
  select * into d from public.documents where id = new.document_id;
  if not found then
    raise exception 'unknown document' using errcode = '23503';
  end if;
  if d.deleted_at is not null then
    raise exception 'a removed document cannot get new versions' using errcode = '42501';
  end if;
  select p.stage into stage_now from public.projects p where p.id = d.project_id;
  if stage_now = 'closed' then
    raise exception 'the documents of a closed project cannot be changed' using errcode = '42501';
  end if;
  if left(new.storage_path, 37) <> d.project_id::text || '/' then
    raise exception 'the file does not belong to this project' using errcode = '23514';
  end if;
  new.uploaded_by := (select auth.uid());
  new.version_no := coalesce((select max(v.version_no) from public.document_versions v where v.document_id = new.document_id), 0) + 1;
  new.created_at := now();
  return new;
end $$;
revoke execute on function public.guard_document_version() from public, anon, authenticated;

drop trigger if exists guard_document_version on public.document_versions;
create trigger guard_document_version before insert or update or delete on public.document_versions
  for each row execute function public.guard_document_version();

-- ===== access =====
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
revoke all on table public.document_versions from anon, authenticated;
grant select, insert on table public.document_versions to authenticated;
revoke delete on table public.documents from authenticated;

-- documents: staff on the project and the oversight roles keep their read policies (0013, 0010)
drop policy if exists docs_write on public.documents;
drop policy if exists docs_insert on public.documents;
create policy docs_insert on public.documents for insert to authenticated
  with check (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
drop policy if exists docs_update on public.documents;
create policy docs_update on public.documents for update to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  )
  with check (
    public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
drop policy if exists docs_select_donor on public.documents;
create policy docs_select_donor on public.documents for select to authenticated
  using (
    public.has_role('donor')
    and public.can_access_project(project_id)
    and released_to_donor
    and deleted_at is null
  );

-- versions: readable wherever the document is readable; added only by the roles that add documents
drop policy if exists dv_select_staff on public.document_versions;
create policy dv_select_staff on public.document_versions for select to authenticated
  using (
    exists (select 1 from public.documents d
            where d.id = document_id and public.can_access_project(d.project_id) and not public.has_role('donor'))
  );
drop policy if exists dv_select_oversight on public.document_versions;
create policy dv_select_oversight on public.document_versions for select to authenticated
  using (public.has_oversight_read());
drop policy if exists dv_select_donor on public.document_versions;
create policy dv_select_donor on public.document_versions for select to authenticated
  using (
    public.has_role('donor')
    and exists (select 1 from public.documents d
                where d.id = document_id and public.can_access_project(d.project_id)
                  and d.released_to_donor and d.deleted_at is null)
  );
drop policy if exists dv_insert on public.document_versions;
create policy dv_insert on public.document_versions for insert to authenticated
  with check (
    exists (select 1 from public.documents d
            where d.id = document_id and public.can_access_project(d.project_id))
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
