-- 0037: who may change which donor a project belongs to.
--
-- A project is linked to its donor through projects.grant_id (the grant belongs to the donor organisation,
-- and a donor sees exactly the projects of its own organisation's grants). Today any Project Officer who can
-- edit a project could also change grant_id and so move the project to another donor. From now on only the
-- Executive Director and the Programme Manager can change it. Direct database sessions with no signed-in
-- user (migrations, the trusted server actions that use the service role) still pass.
-- Only that rule is added to guard_project_update(); every other rule stays as it is.

do $$
declare
  def text;
  needle constant text := 'if new.stage is distinct from old.stage';
begin
  select pg_get_functiondef('public.guard_project_update()'::regprocedure) into def;
  if position(needle in def) = 0 then
    raise exception '0037: expected stage rule not found in guard_project_update(); review before applying';
  end if;
  if position('new.grant_id is distinct from old.grant_id' in def) = 0 then
    def := replace(
      def,
      needle,
      E'if new.grant_id is distinct from old.grant_id and not public.has_any_role(array[''executive'',''programme_manager'']::public.app_role[]) then\n    raise exception ''only the Executive Director or the Programme Manager can change the donor of a project'' using errcode = ''42501'';\n  end if;\n  ' || needle
    );
    execute def;
  end if;
end $$;
