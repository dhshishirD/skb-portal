-- rls_project_donor_link.sql - proves the 0037 rule: only the Executive Director, the Programme Manager or the Super Admin can
-- change projects.grant_id, and a donor only sees the projects of its own organisation's grant.
-- One transaction, rolled back; any failed assert raises an error. LOCAL / STAGING Supabase only.
-- All values below are synthetic test data.
begin;

insert into public.organizations (id, name, type) values
  ('e7000000-0000-0000-0000-0000000000d1','Donor A (test)','donor'),
  ('e7000000-0000-0000-0000-0000000000d2','Donor B (test)','donor');
insert into auth.users (id) values
  ('e7100000-0000-0000-0000-000000000001'), -- executive
  ('e7100000-0000-0000-0000-000000000002'), -- programme manager
  ('e7100000-0000-0000-0000-000000000003'), -- project officer (on the project)
  ('e7100000-0000-0000-0000-000000000004'), -- donor A
  ('e7100000-0000-0000-0000-000000000005'), -- donor B
  ('e7100000-0000-0000-0000-000000000006'); -- super admin
update public.profiles set org_id = 'e7000000-0000-0000-0000-0000000000d1' where id = 'e7100000-0000-0000-0000-000000000004';
update public.profiles set org_id = 'e7000000-0000-0000-0000-0000000000d2' where id = 'e7100000-0000-0000-0000-000000000005';
insert into public.user_roles (user_id, role) values
  ('e7100000-0000-0000-0000-000000000001','executive'),
  ('e7100000-0000-0000-0000-000000000002','programme_manager'),
  ('e7100000-0000-0000-0000-000000000003','project_officer'),
  ('e7100000-0000-0000-0000-000000000004','donor'),
  ('e7100000-0000-0000-0000-000000000005','donor'),
  ('e7100000-0000-0000-0000-000000000006','super_admin');
insert into public.grants (id, code, title, donor_org_id, total_amount) values
  ('e7200000-0000-0000-0000-00000000000a','G-DL-A','Grant A','e7000000-0000-0000-0000-0000000000d1',1000),
  ('e7200000-0000-0000-0000-00000000000b','G-DL-B','Grant B','e7000000-0000-0000-0000-0000000000d2',1000);
insert into public.projects (id, code, title, grant_id, created_by) values
  ('e7300000-0000-0000-0000-00000000000a','DL-1','Donor link project','e7200000-0000-0000-0000-00000000000a','e7100000-0000-0000-0000-000000000001');
insert into public.user_project_access (user_id, project_id) values
  ('e7100000-0000-0000-0000-000000000002','e7300000-0000-0000-0000-00000000000a'),
  ('e7100000-0000-0000-0000-000000000003','e7300000-0000-0000-0000-00000000000a');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute 'set local role authenticated';
end $$;

do $$
declare
  ed text := 'e7100000-0000-0000-0000-000000000001';
  pm text := 'e7100000-0000-0000-0000-000000000002';
  po text := 'e7100000-0000-0000-0000-000000000003';
  da text := 'e7100000-0000-0000-0000-000000000004';
  db text := 'e7100000-0000-0000-0000-000000000005';
  sa text := 'e7100000-0000-0000-0000-000000000006';
  pid uuid := 'e7300000-0000-0000-0000-00000000000a';
  ga  uuid := 'e7200000-0000-0000-0000-00000000000a';
  gb  uuid := 'e7200000-0000-0000-0000-00000000000b';
  denied boolean;
begin
  -- 1. A Project Officer on the project cannot move it to another donor, but can still edit other fields
  perform pg_temp.as_user(po);
  denied := false;
  begin update public.projects set grant_id = gb where id = pid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a project officer cannot change the donor of a project';
  update public.projects set title = 'Renamed by the officer' where id = pid;
  assert (select title from public.projects where id = pid) = 'Renamed by the officer', 'a project officer can still edit other fields';

  -- 2. The Executive Director and the Programme Manager can
  perform pg_temp.as_user(ed);
  update public.projects set grant_id = gb where id = pid;
  assert (select grant_id from public.projects where id = pid) = gb, 'the executive director can change the donor';
  perform pg_temp.as_user(pm);
  update public.projects set grant_id = ga where id = pid;
  assert (select grant_id from public.projects where id = pid) = ga, 'the programme manager can change the donor';

  perform pg_temp.as_user(sa);
  perform public.set_project_donor(pid, gb);
  assert (select grant_id from public.projects where id = pid) = gb, 'the super admin can change the donor';
  perform public.set_project_donor(pid, ga);
  -- a project officer cannot use the function either
  perform pg_temp.as_user(po);
  denied := false;
  begin perform public.set_project_donor(pid, gb);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a project officer cannot use set_project_donor';
  perform pg_temp.as_user(sa);

  -- 3. A donor sees only the projects of its own organisation
  perform pg_temp.as_user(da);
  assert (select count(*) from public.projects where id = pid) = 1, 'donor A sees its own project';
  perform pg_temp.as_user(db);
  assert (select count(*) from public.projects where id = pid) = 0, 'donor B does not see donor A''s project';
  assert (select count(*) from public.grants where id = ga) = 0, 'donor B does not see donor A''s grant';

  -- 4. After the project moves to donor B, donor A loses it and donor B gets it
  perform pg_temp.as_user(ed);
  update public.projects set grant_id = gb where id = pid;
  perform pg_temp.as_user(da);
  assert (select count(*) from public.projects where id = pid) = 0, 'donor A no longer sees the moved project';
  perform pg_temp.as_user(db);
  assert (select count(*) from public.projects where id = pid) = 1, 'donor B now sees the moved project';
end $$;

rollback;
