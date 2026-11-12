-- rls_project_areas.sql - proves the 0032 rules for project areas.
-- One transaction, rolled back; any failed assert raises an error. LOCAL / STAGING Supabase only.
-- All values below are synthetic test data.
begin;

insert into auth.users (id) values
  ('e2000000-0000-0000-0000-000000000001'), -- executive
  ('e2000000-0000-0000-0000-000000000002'), -- project officer (assigned)
  ('e2000000-0000-0000-0000-000000000003'), -- field officer (assigned)
  ('e2000000-0000-0000-0000-000000000004'), -- board
  ('e2000000-0000-0000-0000-000000000005'), -- donor
  ('e2000000-0000-0000-0000-000000000006'), -- project officer (never assigned)
  ('e2000000-0000-0000-0000-000000000008'), -- M&E officer (assigned)
  ('e2000000-0000-0000-0000-000000000009'); -- legal officer
insert into public.user_roles (user_id, role) values
  ('e2000000-0000-0000-0000-000000000001','executive'),
  ('e2000000-0000-0000-0000-000000000002','project_officer'),
  ('e2000000-0000-0000-0000-000000000003','field_officer'),
  ('e2000000-0000-0000-0000-000000000004','board'),
  ('e2000000-0000-0000-0000-000000000005','donor'),
  ('e2000000-0000-0000-0000-000000000006','project_officer'),
  ('e2000000-0000-0000-0000-000000000008','me_officer'),
  ('e2000000-0000-0000-0000-000000000009','legal_officer');
insert into public.projects (id, code, title) values
  ('e4000000-0000-0000-0000-00000000000b','AR-MAIN','Main test project'),
  ('e4000000-0000-0000-0000-00000000000c','AR-SHUT','Project to close');
insert into public.user_project_access (user_id, project_id) values
  ('e2000000-0000-0000-0000-000000000002','e4000000-0000-0000-0000-00000000000b'),
  ('e2000000-0000-0000-0000-000000000003','e4000000-0000-0000-0000-00000000000b'),
  ('e2000000-0000-0000-0000-000000000008','e4000000-0000-0000-0000-00000000000b'),
  ('e2000000-0000-0000-0000-000000000002','e4000000-0000-0000-0000-00000000000c');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute 'set local role authenticated';
end $$;

do $$
declare
  ed text := 'e2000000-0000-0000-0000-000000000001';
  po text := 'e2000000-0000-0000-0000-000000000002';
  fo text := 'e2000000-0000-0000-0000-000000000003';
  bd text := 'e2000000-0000-0000-0000-000000000004';
  dn text := 'e2000000-0000-0000-0000-000000000005';
  px text := 'e2000000-0000-0000-0000-000000000006';
  me text := 'e2000000-0000-0000-0000-000000000008';
  lg text := 'e2000000-0000-0000-0000-000000000009';
  pid uuid := 'e4000000-0000-0000-0000-00000000000b';
  sid uuid := 'e4000000-0000-0000-0000-00000000000c';
  aid uuid;
  denied boolean;
begin
  -- 1. A project officer on the project adds an area; the author is the signed-in user
  perform pg_temp.as_user(po);
  insert into public.project_areas (project_id, region, cities, families, item_quantity, item_unit, created_by)
    values (pid, 'Cox''s Bazar', 'Ukhiya', 1000, 25, 'cows', ed::uuid) returning id into aid;
  assert (select created_by from public.project_areas where id = aid) = po::uuid, 'created_by is the signed-in user';

  -- 2. Values are checked
  denied := false;
  begin update public.project_areas set families = -1 where id = aid;
  exception when check_violation then denied := true; end;
  assert denied, 'negative families are refused';
  denied := false;
  begin update public.project_areas set region = '   ' where id = aid;
  exception when check_violation then denied := true; end;
  assert denied, 'a blank region is refused';
  denied := false;
  begin update public.project_areas set item_quantity = 1000000000 where id = aid;
  exception when check_violation then denied := true; end;
  assert denied, 'an absurd quantity is refused';

  -- 3. Update works; project and author cannot change
  update public.project_areas set families = 1200 where id = aid;
  assert (select families from public.project_areas where id = aid) = 1200, 'update works';
  assert (select updated_by from public.project_areas where id = aid) = po::uuid, 'updated_by is recorded';
  denied := false;
  begin update public.project_areas set project_id = sid where id = aid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'an area cannot move to another project';
  denied := false;
  begin update public.project_areas set created_by = ed::uuid where id = aid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the author cannot be rewritten';

  -- 4. Who reads and who writes
  perform pg_temp.as_user(px);
  assert (select count(*) from public.project_areas) = 0, 'an unassigned officer sees nothing';
  denied := false;
  begin insert into public.project_areas (project_id, region) values (sid, 'X');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'an unassigned officer cannot write';
  perform pg_temp.as_user(fo);
  assert (select count(*) from public.project_areas) = 0, 'a field officer sees nothing';
  perform pg_temp.as_user(me);
  assert (select count(*) from public.project_areas where project_id = pid) = 1, 'the M&E officer on the project reads';
  update public.project_areas set families = 99 where id = aid;
  assert (select families from public.project_areas where id = aid) = 1200, 'the M&E officer cannot change it';
  perform pg_temp.as_user(dn);
  assert (select count(*) from public.project_areas) = 0, 'the donor sees nothing';
  perform pg_temp.as_user(bd);
  assert (select count(*) from public.project_areas) >= 1, 'the board reads';
  perform pg_temp.as_user(lg);
  assert (select count(*) from public.project_areas) >= 1, 'the legal officer reads';
  denied := false;
  begin insert into public.project_areas (project_id, region) values (sid, 'Y');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the legal officer cannot write';

  -- 5. Delete: the officer on the project may; others may not
  perform pg_temp.as_user(me);
  delete from public.project_areas where id = aid;
  assert (select count(*) from public.project_areas where id = aid) = 1, 'the M&E officer cannot delete';
  perform pg_temp.as_user(po);
  delete from public.project_areas where id = aid;
  assert (select count(*) from public.project_areas where id = aid) = 0, 'the project officer can delete';

  -- 6. Audit log
  reset role;
  perform set_config('request.jwt.claims', '', true);
  assert (select count(*) from public.audit_log where table_name = 'project_areas') >= 3, 'changes are in the audit log';

  -- 7. A closed project is frozen
  insert into public.project_areas (project_id, region) values (sid, 'Frozen');
  update public.projects set stage = 'closed' where id = sid;
  perform pg_temp.as_user(po);
  denied := false;
  begin update public.project_areas set families = 8 where project_id = sid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a closed project area cannot be edited';
  denied := false;
  begin delete from public.project_areas where project_id = sid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a closed project area cannot be deleted';
end $$;

rollback;
