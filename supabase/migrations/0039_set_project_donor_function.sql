-- 0039: one narrow door for changing a project's donor.
--
-- The Super Admin may change which donor a project belongs to (0038), but the projects UPDATE policy only
-- covers people who can reach the project (Executive Director, Programme Manager, Project Officer on it), so
-- a direct update by the Super Admin would silently change nothing. Rather than giving the Super Admin edit
-- rights over every project field, this function changes ONLY projects.grant_id. It runs with the caller's
-- identity (auth.uid()), so guard_project_update() and the audit log still see who did it, and closed
-- projects stay frozen by the guard.

create or replace function public.set_project_donor(_project_id uuid, _grant_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_any_role(array['executive','programme_manager','super_admin']::public.app_role[]) then
    raise exception 'only the Executive Director, the Programme Manager or the Super Admin can change the donor of a project'
      using errcode = '42501';
  end if;
  update public.projects set grant_id = _grant_id where id = _project_id and deleted_at is null;
  if not found then
    raise exception 'project not found' using errcode = 'P0002';
  end if;
end $$;

revoke all on function public.set_project_donor(uuid, uuid) from public, anon;
grant execute on function public.set_project_donor(uuid, uuid) to authenticated;
