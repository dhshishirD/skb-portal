-- rls_file_records.sql - proves the 0024 rules for distribution list and NID sheet tracking.
-- One transaction, rolled back; any failed assert raises an error. LOCAL / STAGING Supabase only.
-- All values below are synthetic test data.
begin;

insert into auth.users (id) values
  ('d1000000-0000-0000-0000-000000000001'), -- executive
  ('d1000000-0000-0000-0000-000000000002'), -- project officer (assigned)
  ('d1000000-0000-0000-0000-000000000003'), -- field officer (assigned)
  ('d1000000-0000-0000-0000-000000000004'), -- board
  ('d1000000-0000-0000-0000-000000000005'), -- donor
  ('d1000000-0000-0000-0000-000000000006'), -- finance (assigned)
  ('d1000000-0000-0000-0000-000000000007'), -- field officer (never assigned)
  ('d1000000-0000-0000-0000-000000000008'), -- M&E officer (assigned)
  ('d1000000-0000-0000-0000-000000000009'); -- legal officer
insert into public.user_roles (user_id, role) values
  ('d1000000-0000-0000-0000-000000000001','executive'),
  ('d1000000-0000-0000-0000-000000000002','project_officer'),
  ('d1000000-0000-0000-0000-000000000003','field_officer'),
  ('d1000000-0000-0000-0000-000000000004','board'),
  ('d1000000-0000-0000-0000-000000000005','donor'),
  ('d1000000-0000-0000-0000-000000000006','finance'),
  ('d1000000-0000-0000-0000-000000000007','field_officer'),
  ('d1000000-0000-0000-0000-000000000008','me_officer'),
  ('d1000000-0000-0000-0000-000000000009','legal_officer');
insert into public.projects (id, code, title) values
  ('d3000000-0000-0000-0000-00000000000b','FR-MAIN','Main test project'),
  ('d3000000-0000-0000-0000-00000000000c','FR-SHUT','Project to close');
insert into public.user_project_access (user_id, project_id) values
  ('d1000000-0000-0000-0000-000000000002','d3000000-0000-0000-0000-00000000000b'),
  ('d1000000-0000-0000-0000-000000000003','d3000000-0000-0000-0000-00000000000b'),
  ('d1000000-0000-0000-0000-000000000006','d3000000-0000-0000-0000-00000000000b'),
  ('d1000000-0000-0000-0000-000000000008','d3000000-0000-0000-0000-00000000000b'),
  ('d1000000-0000-0000-0000-000000000003','d3000000-0000-0000-0000-00000000000c');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute 'set local role authenticated';
end $$;

do $$
declare
  ed text := 'd1000000-0000-0000-0000-000000000001';
  po text := 'd1000000-0000-0000-0000-000000000002';
  fo text := 'd1000000-0000-0000-0000-000000000003';
  bd text := 'd1000000-0000-0000-0000-000000000004';
  dn text := 'd1000000-0000-0000-0000-000000000005';
  fin text := 'd1000000-0000-0000-0000-000000000006';
  fx text := 'd1000000-0000-0000-0000-000000000007';
  me text := 'd1000000-0000-0000-0000-000000000008';
  lg text := 'd1000000-0000-0000-0000-000000000009';
  pid uuid := 'd3000000-0000-0000-0000-00000000000b';
  sid uuid := 'd3000000-0000-0000-0000-00000000000c';
  r1 uuid; n int; denied boolean;
begin
  -- 1. A field officer adds a record: the author is recorded by the database
  perform pg_temp.as_user(fo);
  insert into public.project_file_records (id, project_id, kind, name, status, link, created_by)
    values ('d4000000-0000-0000-0000-000000000001', pid, 'nid_sheet', 'NID sheet batch 1', 'prepared', 'https://example.org/sheet1', po::uuid);
  r1 := 'd4000000-0000-0000-0000-000000000001';
  assert (select created_by from public.project_file_records where id = r1) = fo::uuid, 'created_by is the signed-in user';

  -- 2. Values are checked
  denied := false;
  begin insert into public.project_file_records (project_id, kind, name, link) values (pid, 'nid_sheet', 'Bad link sheet', 'http://example.org');
  exception when check_violation then denied := true; end;
  assert denied, 'a link that is not https is refused';
  denied := false;
  begin insert into public.project_file_records (project_id, kind, name, link) values (pid, 'nid_sheet', 'Script link sheet', 'https://x.org/a b');
  exception when check_violation then denied := true; end;
  assert denied, 'a link with a space is refused';
  denied := false;
  begin insert into public.project_file_records (project_id, kind, name) values (pid, 'passport', 'Unknown kind file');
  exception when check_violation then denied := true; end;
  assert denied, 'an unknown kind is refused';
  denied := false;
  begin insert into public.project_file_records (project_id, kind, name, status) values (pid, 'nid_sheet', 'Odd status file', 'lost');
  exception when check_violation then denied := true; end;
  assert denied, 'an unknown status is refused';

  -- 3. The field officer moves the status along but cannot change kind, project or author, or delete
  update public.project_file_records set status = 'signed' where id = r1;
  assert (select status from public.project_file_records where id = r1) = 'signed', 'status can be updated';
  denied := false;
  begin update public.project_file_records set kind = 'distribution_list' where id = r1;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the kind cannot be changed';
  denied := false;
  begin update public.project_file_records set project_id = sid where id = r1;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a record cannot move to another project';
  denied := false;
  begin update public.project_file_records set created_by = ed::uuid where id = r1;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the author cannot be rewritten';
  update public.project_file_records set name = 'NID sheet batch 1 (renamed)' where id = r1;
  assert (select name from public.project_file_records where id = r1) = 'NID sheet batch 1 (renamed)', 'the name can be edited';
  delete from public.project_file_records where id = r1;
  assert (select count(*) from public.project_file_records where id = r1) = 1, 'a field officer cannot delete (no row is removed)';

  -- 4. Who reads and who writes
  perform pg_temp.as_user(fx);
  assert (select count(*) from public.project_file_records) = 0, 'an unassigned field officer sees nothing';
  denied := false;
  begin insert into public.project_file_records (project_id, kind, name) values (pid, 'nid_sheet', 'Sneaky sheet entry');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'an unassigned field officer cannot add';
  perform pg_temp.as_user(me);
  assert (select count(*) from public.project_file_records where project_id = pid) = 1, 'the M&E officer on the project reads';
  denied := false;
  begin insert into public.project_file_records (project_id, kind, name) values (pid, 'nid_sheet', 'M and E entry file');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the M&E officer cannot add';
  perform pg_temp.as_user(fin);
  assert (select count(*) from public.project_file_records) = 0, 'finance sees nothing';
  perform pg_temp.as_user(dn);
  assert (select count(*) from public.project_file_records) = 0, 'the donor sees nothing';
  perform pg_temp.as_user(bd);
  assert (select count(*) from public.project_file_records) >= 1, 'the board reads';
  perform pg_temp.as_user(lg);
  assert (select count(*) from public.project_file_records) >= 1, 'the legal officer reads';
  denied := false;
  begin insert into public.project_file_records (project_id, kind, name) values (pid, 'nid_sheet', 'Legal entry file');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the legal officer cannot add';

  -- 5. A project officer and the executive may delete
  perform pg_temp.as_user(po);
  delete from public.project_file_records where id = r1;
  assert (select count(*) from public.project_file_records where id = r1) = 0, 'a project officer deletes a record';

  -- 6. Audit log
  reset role;
  perform set_config('request.jwt.claims', '', true);
  assert (select count(*) from public.audit_log where table_name = 'project_file_records' and record_id = r1::text) >= 4, 'changes are in the audit log';

  -- 7. A closed project is frozen
  insert into public.project_file_records (id, project_id, kind, name) values ('d4000000-0000-0000-0000-000000000002', sid, 'distribution_list', 'List before closing');
  update public.projects set stage = 'closed' where id = sid;
  perform pg_temp.as_user(fo);
  denied := false;
  begin insert into public.project_file_records (project_id, kind, name) values (sid, 'distribution_list', 'List after closing');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a closed project cannot get new records';
  denied := false;
  begin update public.project_file_records set status = 'sent' where id = 'd4000000-0000-0000-0000-000000000002';
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a closed project record cannot be edited';
end $$;

rollback;
