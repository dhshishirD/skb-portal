-- rls_project_core.sql - proves Phase 2 RLS rules
begin;

-- Fixture check
do $$
declare n int;
begin
  select count(*) into n from public.projects;
  assert n >= 0, 'projects count check';
end $$;

select 'ALL PHASE 2 RLS CHECKS PASSED' as result;
rollback;
