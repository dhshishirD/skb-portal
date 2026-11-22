-- 0043: delete, restore and permanently remove a project.
--
-- "Delete" hides a project from every list (it sets deleted_at, as Archive did) and can be undone with Restore.
-- It is open to the Executive Director and the Super Admin. A deleted project can then be removed for good
-- ("Delete permanently"), which also removes its plan data (tasks, logframe, charter, budget, areas, closing text).
-- To protect records that matter, a project is NEVER removed for good while it still has any of: expense claims,
-- purchase requests, fund receipts, registered beneficiaries, documents, file records or field reports. Those must
-- stay (hidden) so the money trail and the people's records are not lost, and their stored files are not orphaned.
-- Every change is written to the audit log with the person who did it.
-- Additive: new functions and a changed guard only. No table changes.

-- Only the delete rule of guard_project_update() changes (the Executive Director still deletes directly; the
-- functions below set a flag for the Super Admin's turn). Every other rule in it (created_by, stage gate, donor)
-- stays exactly as it is, so the function is patched in place, as 0037 and 0038 did.
do $$
declare
  def text;
  old_rule constant text := 'if new.deleted_at is distinct from old.deleted_at and not public.has_role(''executive'') then';
  new_rule constant text := 'if new.deleted_at is distinct from old.deleted_at and coalesce(current_setting(''app.project_trash'', true), '''') <> ''1'' and not public.has_role(''executive'') then';
begin
  select pg_get_functiondef('public.guard_project_update()'::regprocedure) into def;
  if position('app.project_trash' in def) > 0 then
    return; -- already patched
  end if;
  if position(old_rule in def) = 0 then
    raise exception '0043: the delete rule was not found in guard_project_update(); review before applying';
  end if;
  def := replace(def, old_rule, new_rule);
  def := replace(def, 'only the Executive Director can archive a project', 'only the Executive Director or the Super Admin can delete a project');
  execute def;
end $$;

-- what stops a project from being removed for good (empty array = nothing)
create or replace function public.project_keep_reasons(_id uuid)
returns text[] language sql stable security definer set search_path = '' as $$
  select array_remove(array[
    case when exists (select 1 from public.expenses where project_id = _id) then 'expense claims' end,
    case when exists (select 1 from public.purchase_requests where project_id = _id) then 'purchase requests' end,
    case when exists (select 1 from public.project_fund_receipts where project_id = _id) then 'fund receipts' end,
    case when exists (select 1 from public.beneficiaries where project_id = _id) then 'registered beneficiaries' end,
    case when exists (select 1 from public.documents where project_id = _id) then 'documents' end,
    case when exists (select 1 from public.project_file_records where project_id = _id) then 'file records' end,
    case when exists (select 1 from public.field_reports where project_id = _id) then 'field reports' end
  ], null);
$$;
revoke execute on function public.project_keep_reasons(uuid) from public, anon, authenticated;

create or replace function public.delete_project(_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if (select auth.uid()) is null or not public.has_any_role(array['executive','super_admin']::public.app_role[]) then
    raise exception 'only the Executive Director or the Super Admin can delete a project' using errcode = '42501';
  end if;
  perform set_config('app.project_trash', '1', true);
  update public.projects set deleted_at = now() where id = _id and deleted_at is null;
  get diagnostics n = row_count;
  perform set_config('app.project_trash', '', true);
  if n = 0 then
    raise exception 'project not found' using errcode = 'P0002';
  end if;
end $$;
revoke execute on function public.delete_project(uuid) from public, anon;
grant execute on function public.delete_project(uuid) to authenticated;

create or replace function public.restore_project(_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if (select auth.uid()) is null or not public.has_any_role(array['executive','super_admin']::public.app_role[]) then
    raise exception 'only the Executive Director or the Super Admin can restore a project' using errcode = '42501';
  end if;
  perform set_config('app.project_trash', '1', true);
  update public.projects set deleted_at = null where id = _id and deleted_at is not null;
  get diagnostics n = row_count;
  perform set_config('app.project_trash', '', true);
  if n = 0 then
    raise exception 'project not found' using errcode = 'P0002';
  end if;
end $$;
revoke execute on function public.restore_project(uuid) from public, anon;
grant execute on function public.restore_project(uuid) to authenticated;

-- the deleted projects, for the Executive Director and the Super Admin (normal lists never show them)
create or replace function public.list_deleted_projects()
returns table (id uuid, code text, title text, stage text, donor_name text, deleted_at timestamptz, keep_reasons text[])
language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not public.has_any_role(array['executive','super_admin']::public.app_role[]) then
    raise exception 'only the Executive Director or the Super Admin can see deleted projects' using errcode = '42501';
  end if;
  return query
    select p.id, p.code::text, p.title::text, p.stage::text, p.donor_name::text, p.deleted_at, public.project_keep_reasons(p.id)
    from public.projects p where p.deleted_at is not null order by p.deleted_at desc;
end $$;
revoke execute on function public.list_deleted_projects() from public, anon;
grant execute on function public.list_deleted_projects() to authenticated;

create or replace function public.purge_project(_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  reasons text[];
begin
  if me is null or not public.has_any_role(array['executive','super_admin']::public.app_role[]) then
    raise exception 'only the Executive Director or the Super Admin can remove a project for good' using errcode = '42501';
  end if;
  if not exists (select 1 from public.projects where id = _id and deleted_at is not null) then
    raise exception 'delete the project first; only a deleted project can be removed for good' using errcode = '42501';
  end if;
  reasons := public.project_keep_reasons(_id);
  if coalesce(array_length(reasons, 1), 0) > 0 then
    raise exception 'this project still has % and cannot be removed for good', array_to_string(reasons, ', ') using errcode = '42501';
  end if;
  -- The removal cascades into the project's plan data. Those tables each have their own guards, which look at the
  -- signed-in person; for this one transaction the work is done as a trusted database session and the audit log
  -- still names the person who asked.
  perform set_config('app.actor_id', me::text, true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  delete from public.projects where id = _id;
end $$;
revoke execute on function public.purge_project(uuid) from public, anon;
grant execute on function public.purge_project(uuid) to authenticated;
