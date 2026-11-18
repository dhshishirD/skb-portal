-- 0038: the Super Admin may also change which donor a project belongs to.
--
-- 0037 let only the Executive Director and the Programme Manager change projects.grant_id. The Super Admin
-- (who runs the portal and creates the donor organisations) now needs to do it as well. Only the role list
-- of that one rule in guard_project_update() changes; every other rule stays as it is.

do $$
declare
  def text;
  old_list constant text := 'array[''executive'',''programme_manager'']::public.app_role[]';
  new_list constant text := 'array[''executive'',''programme_manager'',''super_admin'']::public.app_role[]';
begin
  select pg_get_functiondef('public.guard_project_update()'::regprocedure) into def;
  if position('new.grant_id is distinct from old.grant_id' in def) = 0 then
    raise exception '0038: the donor rule from 0037 was not found in guard_project_update(); apply 0037 first';
  end if;
  if position('''super_admin''' in substring(def from position('new.grant_id is distinct from old.grant_id' in def) for 260)) = 0 then
    if position(old_list in def) = 0 then
      raise exception '0038: expected role list not found; review before applying';
    end if;
    def := replace(def, old_list, new_list);
    def := replace(def, 'only the Executive Director or the Programme Manager can change the donor of a project',
                        'only the Executive Director, the Programme Manager or the Super Admin can change the donor of a project');
    execute def;
  end if;
end $$;
