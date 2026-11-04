-- 0013_donor_isolation.sql
-- Donors are external. can_access_project() lets a donor reach the projects funded by their
-- own organisation's grant, and several read policies relied on that function alone, so a donor
-- could also read SKB's internal working data for those projects: tasks, documents, raw field
-- reports, expense claims, purchase requests, stage gates and stage history.
--
-- From now on those tables are NOT readable by a donor. What donors keep seeing (unchanged):
--   projects and the grant of their own organisation, PUBLISHED donor reports of their grant,
--   the logframe / indicators and budget lines of their own projects.
--
-- Only SELECT policies change; staff, partners and auditors are unaffected. No data is touched.
-- Write policies were already internal-only (is_internal_user()).

do $$
declare r record;
begin
  for r in
    select * from (values
      ('tasks',                 'tasks_select'),
      ('documents',             'docs_select'),
      ('field_reports',         'field_reports_select'),
      ('expenses',              'expenses_select'),
      ('purchase_requests',     'purchase_requests_select'),
      ('stage_gate_items',      'stage_gate_select'),
      ('project_stage_history', 'stage_history_select')
    ) as v(tbl, pol)
  loop
    execute format('drop policy %I on public.%I', r.pol, r.tbl);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.can_access_project(project_id) and not public.has_role(''donor''))',
      r.pol, r.tbl
    );
  end loop;
end $$;
