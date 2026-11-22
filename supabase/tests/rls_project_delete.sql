-- rls_project_delete.sql - proves the 0043 rules: only the Executive Director and the Super Admin delete, restore and
-- remove a project; only a deleted project can be removed for good; a project with money, people or file records is
-- never removed; the audit log names who did it. One transaction, rolled back. LOCAL / STAGING Supabase only.
-- All values below are synthetic test data.
begin;

insert into auth.users (id) values
  ('fa000000-0000-0000-0000-000000000001'), -- project officer
  ('fa000000-0000-0000-0000-000000000002'), -- executive director
  ('fa000000-0000-0000-0000-000000000003'); -- super admin
insert into public.user_roles (user_id, role) values
  ('fa000000-0000-0000-0000-000000000001','project_officer'),
  ('fa000000-0000-0000-0000-000000000002','executive'),
  ('fa000000-0000-0000-0000-000000000003','super_admin');

insert into public.projects (id, code, title) values
  ('fa100000-0000-0000-0000-00000000000a','DEL-PLAIN','Plain project'),
  ('fa100000-0000-0000-0000-00000000000b','DEL-MONEY','Project with an expense claim'),
  ('fa100000-0000-0000-0000-00000000000c','DEL-ED','Deleted by the executive');
insert into public.tasks (project_id, title) values ('fa100000-0000-0000-0000-00000000000a','A task');
insert into public.project_budget_items (project_id, name, quantity, unit_price_bdt) values ('fa100000-0000-0000-0000-00000000000a','An item',1,10);
insert into public.expenses (project_id, amount, expense_date, description, claimant_id)
  values ('fa100000-0000-0000-0000-00000000000b', 10, date '2026-10-01', 'A claim', 'fa000000-0000-0000-0000-000000000001');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute 'set local role authenticated';
end $$;

do $$
declare
  po uuid := 'fa000000-0000-0000-0000-000000000001';
  ed uuid := 'fa000000-0000-0000-0000-000000000002';
  sa uuid := 'fa000000-0000-0000-0000-000000000003';
  a uuid := 'fa100000-0000-0000-0000-00000000000a';
  b uuid := 'fa100000-0000-0000-0000-00000000000b';
  c uuid := 'fa100000-0000-0000-0000-00000000000c';
  denied boolean; msg text;
begin
  -- 1. who may delete
  perform pg_temp.as_user(po::text);
  begin perform public.delete_project(a); exception when insufficient_privilege then denied := true; end;
  assert denied, 'a project officer cannot delete a project';
  perform pg_temp.as_user(sa::text);
  perform public.delete_project(a);
  perform public.delete_project(b);
  reset role;
  assert (select deleted_at from public.projects where id = a) is not null, 'the super admin deleted the project';
  perform pg_temp.as_user(ed::text);
  perform public.delete_project(c);
  reset role;
  assert (select deleted_at from public.projects where id = c) is not null, 'the executive deleted the project';

  -- 2. a deleted project is hidden; only ED / SA can list the deleted ones
  perform pg_temp.as_user(po::text);
  assert (select count(*) from public.projects where id = a) = 0, 'a deleted project is hidden';
  denied := false;
  begin perform * from public.list_deleted_projects(); exception when insufficient_privilege then denied := true; end;
  assert denied, 'a project officer cannot list deleted projects';
  perform pg_temp.as_user(sa::text);
  assert (select count(*) from public.list_deleted_projects()) = 3, 'the super admin lists the deleted projects';
  assert (select keep_reasons from public.list_deleted_projects() where id = b) = array['expense claims'], 'the list says what must be kept';
  assert (select coalesce(array_length(keep_reasons,1),0) from public.list_deleted_projects() where id = a) = 0, 'a plain project has nothing to keep';

  -- 3. restore
  perform public.restore_project(c);
  reset role;
  assert (select deleted_at from public.projects where id = c) is null, 'restore brings the project back';
  perform pg_temp.as_user(po::text);
  denied := false;
  begin perform public.restore_project(a); exception when insufficient_privilege then denied := true; end;
  assert denied, 'a project officer cannot restore a project';

  -- 4. removing for good
  perform pg_temp.as_user(po::text);
  denied := false;
  begin perform public.purge_project(a); exception when insufficient_privilege then denied := true; end;
  assert denied, 'a project officer cannot remove a project for good';
  perform pg_temp.as_user(sa::text);
  denied := false;
  begin perform public.purge_project(c); exception when insufficient_privilege then denied := true; end;
  assert denied, 'a project that is not deleted cannot be removed for good';
  denied := false;
  begin perform public.purge_project(b);
  exception when insufficient_privilege then denied := true; msg := sqlerrm; end;
  assert denied and msg like '%expense claims%', 'a project with an expense claim cannot be removed for good';
  perform public.purge_project(a);
  reset role;
  assert (select count(*) from public.projects where id = a) = 0, 'the project is gone';
  assert (select count(*) from public.tasks where project_id = a) = 0, 'its tasks are gone';
  assert (select count(*) from public.project_budget_items where project_id = a) = 0, 'its budget items are gone';
  assert (select count(*) from public.projects where id = b) = 1, 'the project with money is still there';
  assert (select count(*) from public.expenses where project_id = b) = 1, 'its expense claim is untouched';

  -- 5. the audit log names the person
  assert exists (select 1 from public.audit_log where table_name = 'projects' and action = 'DELETE' and record_id = a::text and actor_id = sa),
    'the audit log names the super admin';
end $$;

rollback;
