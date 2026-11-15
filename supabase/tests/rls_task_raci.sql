-- rls_task_raci.sql - proves the 0034 rules for RACI on tasks.
-- One transaction, rolled back; any failed assert raises an error. LOCAL / STAGING Supabase only.
-- All values below are synthetic test data.
begin;

insert into auth.users (id) values
  ('c1000000-0000-0000-0000-000000000001'), -- executive
  ('c1000000-0000-0000-0000-000000000002'), -- project officer (assigned)
  ('c1000000-0000-0000-0000-000000000003'), -- field officer (assigned, on team)
  ('c1000000-0000-0000-0000-000000000004'), -- board
  ('c1000000-0000-0000-0000-000000000005'), -- donor
  ('c1000000-0000-0000-0000-000000000006'), -- field officer (never on the project)
  ('c1000000-0000-0000-0000-000000000007'), -- project officer (never assigned)
  ('c1000000-0000-0000-0000-000000000008'); -- programme manager (assigned)
insert into public.user_roles (user_id, role) values
  ('c1000000-0000-0000-0000-000000000001','executive'),
  ('c1000000-0000-0000-0000-000000000002','project_officer'),
  ('c1000000-0000-0000-0000-000000000003','field_officer'),
  ('c1000000-0000-0000-0000-000000000004','board'),
  ('c1000000-0000-0000-0000-000000000005','donor'),
  ('c1000000-0000-0000-0000-000000000006','field_officer'),
  ('c1000000-0000-0000-0000-000000000007','project_officer'),
  ('c1000000-0000-0000-0000-000000000008','programme_manager');
insert into public.projects (id, code, title) values
  ('c3000000-0000-0000-0000-00000000000b','RC-MAIN','Main test project'),
  ('c3000000-0000-0000-0000-00000000000c','RC-SHUT','Project to close');
insert into public.user_project_access (user_id, project_id) values
  ('c1000000-0000-0000-0000-000000000002','c3000000-0000-0000-0000-00000000000b'),
  ('c1000000-0000-0000-0000-000000000003','c3000000-0000-0000-0000-00000000000b'),
  ('c1000000-0000-0000-0000-000000000008','c3000000-0000-0000-0000-00000000000b'),
  ('c1000000-0000-0000-0000-000000000002','c3000000-0000-0000-0000-00000000000c');
insert into public.tasks (id, project_id, title) values
  ('c5000000-0000-0000-0000-00000000000b','c3000000-0000-0000-0000-00000000000b','Main task'),
  ('c5000000-0000-0000-0000-00000000000c','c3000000-0000-0000-0000-00000000000c','Task to freeze');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute 'set local role authenticated';
end $$;

do $$
declare
  ed text := 'c1000000-0000-0000-0000-000000000001';
  po text := 'c1000000-0000-0000-0000-000000000002';
  fo text := 'c1000000-0000-0000-0000-000000000003';
  bd text := 'c1000000-0000-0000-0000-000000000004';
  dn text := 'c1000000-0000-0000-0000-000000000005';
  fx text := 'c1000000-0000-0000-0000-000000000006';
  px text := 'c1000000-0000-0000-0000-000000000007';
  pm text := 'c1000000-0000-0000-0000-000000000008';
  tid uuid := 'c5000000-0000-0000-0000-00000000000b';
  sid uuid := 'c5000000-0000-0000-0000-00000000000c';
  denied boolean;
begin
  -- 1. A project officer on the project gives letters
  perform pg_temp.as_user(po);
  insert into public.task_raci (task_id, user_id, raci_role) values (tid, pm::uuid, 'accountable');
  insert into public.task_raci (task_id, user_id, raci_role) values (tid, fo::uuid, 'consulted');
  assert (select count(*) from public.task_raci where task_id = tid) = 2, 'two letters set';
  assert (select created_by from public.task_raci where task_id = tid and user_id = pm::uuid) = po::uuid, 'created_by is the signed-in user';

  -- 2. Only one Accountable per task; a person holds one letter per task
  denied := false;
  begin insert into public.task_raci (task_id, user_id, raci_role) values (tid, ed::uuid, 'accountable');
  exception when unique_violation then denied := true; end;
  assert denied, 'a second accountable person is refused';
  denied := false;
  begin insert into public.task_raci (task_id, user_id, raci_role) values (tid, fo::uuid, 'informed');
  exception when unique_violation then denied := true; end;
  assert denied, 'one person cannot hold two letters on a task';
  denied := false;
  begin update public.task_raci set raci_role = 'owner' where task_id = tid and user_id = fo::uuid;
  exception when check_violation then denied := true; end;
  assert denied, 'an unknown letter is refused';

  -- 3. Only people on the project team can be given a letter
  denied := false;
  begin insert into public.task_raci (task_id, user_id, raci_role) values (tid, fx::uuid, 'informed');
  exception when check_violation then denied := true; end;
  assert denied, 'someone outside the team cannot be given a role';

  -- 4. A letter can change, but not move to another person or task
  update public.task_raci set raci_role = 'informed' where task_id = tid and user_id = fo::uuid;
  assert (select raci_role from public.task_raci where task_id = tid and user_id = fo::uuid) = 'informed', 'letter changed';
  denied := false;
  begin update public.task_raci set user_id = ed::uuid where task_id = tid and user_id = fo::uuid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a letter cannot move to another person';

  -- 5. Who reads and who writes
  perform pg_temp.as_user(fo);
  assert (select count(*) from public.task_raci where task_id = tid) = 2, 'staff on the project can read';
  denied := false;
  begin insert into public.task_raci (task_id, user_id, raci_role) values (tid, ed::uuid, 'consulted');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a field officer cannot give letters';
  delete from public.task_raci where task_id = tid;
  assert (select count(*) from public.task_raci where task_id = tid) = 2, 'a field officer cannot remove letters';
  perform pg_temp.as_user(px);
  assert (select count(*) from public.task_raci) = 0, 'an unassigned officer sees nothing';
  denied := false;
  begin insert into public.task_raci (task_id, user_id, raci_role) values (tid, ed::uuid, 'consulted');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'an unassigned officer cannot write';
  perform pg_temp.as_user(dn);
  assert (select count(*) from public.task_raci) = 0, 'the donor sees nothing';
  perform pg_temp.as_user(bd);
  assert (select count(*) from public.task_raci) >= 2, 'the board reads';

  -- 6. Remove works for the officer
  perform pg_temp.as_user(po);
  delete from public.task_raci where task_id = tid and user_id = fo::uuid;
  assert (select count(*) from public.task_raci where task_id = tid) = 1, 'the officer removed a letter';

  -- 7. Audit log
  reset role;
  perform set_config('request.jwt.claims', '', true);
  assert (select count(*) from public.audit_log where table_name = 'task_raci') >= 3, 'changes are in the audit log';

  -- 8. A closed project is frozen
  insert into public.task_raci (task_id, user_id, raci_role) values (sid, po::uuid, 'accountable');
  update public.projects set stage = 'closed' where id = 'c3000000-0000-0000-0000-00000000000c';
  perform pg_temp.as_user(po);
  denied := false;
  begin update public.task_raci set raci_role = 'consulted' where task_id = sid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a closed project cannot be changed';
  denied := false;
  begin delete from public.task_raci where task_id = sid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a closed project letters cannot be removed';
end $$;

rollback;
