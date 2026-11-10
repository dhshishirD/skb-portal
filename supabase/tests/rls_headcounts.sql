-- rls_headcounts.sql - proves the 0025 rules for the project head count (numbers only).
-- One transaction, rolled back; any failed assert raises an error. LOCAL / STAGING Supabase only.
-- All values below are synthetic test data.
begin;

insert into auth.users (id) values
  ('e1000000-0000-0000-0000-000000000001'), -- executive
  ('e1000000-0000-0000-0000-000000000002'), -- project officer (assigned)
  ('e1000000-0000-0000-0000-000000000003'), -- field officer (assigned)
  ('e1000000-0000-0000-0000-000000000004'), -- board
  ('e1000000-0000-0000-0000-000000000005'), -- donor
  ('e1000000-0000-0000-0000-000000000006'), -- project officer (never assigned)
  ('e1000000-0000-0000-0000-000000000008'), -- M&E officer (assigned)
  ('e1000000-0000-0000-0000-000000000009'); -- legal officer
insert into public.user_roles (user_id, role) values
  ('e1000000-0000-0000-0000-000000000001','executive'),
  ('e1000000-0000-0000-0000-000000000002','project_officer'),
  ('e1000000-0000-0000-0000-000000000003','field_officer'),
  ('e1000000-0000-0000-0000-000000000004','board'),
  ('e1000000-0000-0000-0000-000000000005','donor'),
  ('e1000000-0000-0000-0000-000000000006','project_officer'),
  ('e1000000-0000-0000-0000-000000000008','me_officer'),
  ('e1000000-0000-0000-0000-000000000009','legal_officer');
insert into public.projects (id, code, title) values
  ('e3000000-0000-0000-0000-00000000000b','HC-MAIN','Main test project'),
  ('e3000000-0000-0000-0000-00000000000c','HC-SHUT','Project to close');
insert into public.user_project_access (user_id, project_id) values
  ('e1000000-0000-0000-0000-000000000002','e3000000-0000-0000-0000-00000000000b'),
  ('e1000000-0000-0000-0000-000000000003','e3000000-0000-0000-0000-00000000000b'),
  ('e1000000-0000-0000-0000-000000000008','e3000000-0000-0000-0000-00000000000b'),
  ('e1000000-0000-0000-0000-000000000002','e3000000-0000-0000-0000-00000000000c');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute 'set local role authenticated';
end $$;

do $$
declare
  ed text := 'e1000000-0000-0000-0000-000000000001';
  po text := 'e1000000-0000-0000-0000-000000000002';
  fo text := 'e1000000-0000-0000-0000-000000000003';
  bd text := 'e1000000-0000-0000-0000-000000000004';
  dn text := 'e1000000-0000-0000-0000-000000000005';
  px text := 'e1000000-0000-0000-0000-000000000006';
  me text := 'e1000000-0000-0000-0000-000000000008';
  lg text := 'e1000000-0000-0000-0000-000000000009';
  pid uuid := 'e3000000-0000-0000-0000-00000000000b';
  sid uuid := 'e3000000-0000-0000-0000-00000000000c';
  denied boolean;
begin
  -- 1. A project officer on the project records the head count; the author is the signed-in user
  perform pg_temp.as_user(po);
  insert into public.project_headcounts (project_id, women, men, girls, boys, created_by)
    values (pid, 50, 0, 0, 0, ed::uuid);
  assert (select created_by from public.project_headcounts where project_id = pid) = po::uuid, 'created_by is the signed-in user';
  assert (select women from public.project_headcounts where project_id = pid) = 50, 'the number is saved';

  -- 2. Values are checked
  denied := false;
  begin update public.project_headcounts set women = -1 where project_id = pid;
  exception when check_violation then denied := true; end;
  assert denied, 'a negative number is refused';
  denied := false;
  begin update public.project_headcounts set men = 2000000 where project_id = pid;
  exception when check_violation then denied := true; end;
  assert denied, 'an absurd number is refused';

  -- 3. Update works; the project and author cannot be changed
  update public.project_headcounts set men = 3, note = 'From the signed list' where project_id = pid;
  assert (select men from public.project_headcounts where project_id = pid) = 3, 'the count can be updated';
  assert (select updated_by from public.project_headcounts where project_id = pid) = po::uuid, 'updated_by is recorded';
  denied := false;
  begin update public.project_headcounts set project_id = sid where project_id = pid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a head count cannot move to another project';
  denied := false;
  begin update public.project_headcounts set created_by = ed::uuid where project_id = pid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the author cannot be rewritten';

  -- 4. Who reads and who writes
  perform pg_temp.as_user(px);
  assert (select count(*) from public.project_headcounts) = 0, 'an unassigned officer sees nothing';
  denied := false;
  begin insert into public.project_headcounts (project_id, women) values (sid, 5);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'an unassigned officer cannot write';
  perform pg_temp.as_user(fo);
  assert (select count(*) from public.project_headcounts) = 0, 'a field officer sees nothing';
  perform pg_temp.as_user(me);
  assert (select count(*) from public.project_headcounts where project_id = pid) = 1, 'the M&E officer on the project reads';
  update public.project_headcounts set women = 99 where project_id = pid;
  assert (select women from public.project_headcounts where project_id = pid) = 50, 'the M&E officer cannot change it (no row updated)' ;
  perform pg_temp.as_user(dn);
  assert (select count(*) from public.project_headcounts) = 0, 'the donor sees nothing';
  perform pg_temp.as_user(bd);
  assert (select count(*) from public.project_headcounts) >= 1, 'the board reads';
  perform pg_temp.as_user(lg);
  assert (select count(*) from public.project_headcounts) >= 1, 'the legal officer reads';
  denied := false;
  begin insert into public.project_headcounts (project_id, women) values (sid, 1);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the legal officer cannot write';

  -- 5. Nobody can delete (no grant)
  perform pg_temp.as_user(po);
  denied := false;
  begin delete from public.project_headcounts where project_id = pid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'delete is not granted';

  -- 6. Audit log
  reset role;
  perform set_config('request.jwt.claims', '', true);
  assert (select count(*) from public.audit_log where table_name = 'project_headcounts') >= 2, 'changes are in the audit log';

  -- 7. A closed project is frozen
  insert into public.project_headcounts (project_id, women) values (sid, 7);
  update public.projects set stage = 'closed' where id = sid;
  perform pg_temp.as_user(po);
  denied := false;
  begin update public.project_headcounts set women = 8 where project_id = sid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a closed project head count cannot be edited';
end $$;

rollback;
