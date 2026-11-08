-- rls_project_charter.sql - proves the 0018 rules for the project charter (versions and approval).
-- One transaction, rolled back; any failed assert raises an error. LOCAL / STAGING Supabase only.
begin;

insert into public.organizations (id, name, type) values
  ('d0000000-0000-0000-0000-0000000000a1','SKB (test)','internal'),
  ('d0000000-0000-0000-0000-0000000000d1','Donor (test)','donor');
insert into auth.users (id) values
  ('d1000000-0000-0000-0000-000000000001'), -- executive
  ('d1000000-0000-0000-0000-000000000002'), -- officer A (creator)
  ('d1000000-0000-0000-0000-000000000003'), -- officer B (never assigned)
  ('d1000000-0000-0000-0000-000000000004'), -- board
  ('d1000000-0000-0000-0000-000000000005'), -- donor
  ('d1000000-0000-0000-0000-000000000006'); -- field officer (assigned)
update public.profiles set org_id = 'd0000000-0000-0000-0000-0000000000a1' where id::text like 'd1000000-%' and id::text not like '%05';
update public.profiles set org_id = 'd0000000-0000-0000-0000-0000000000d1' where id = 'd1000000-0000-0000-0000-000000000005';
insert into public.user_roles (user_id, role) values
  ('d1000000-0000-0000-0000-000000000001','executive'),
  ('d1000000-0000-0000-0000-000000000002','project_officer'),
  ('d1000000-0000-0000-0000-000000000003','project_officer'),
  ('d1000000-0000-0000-0000-000000000004','board'),
  ('d1000000-0000-0000-0000-000000000005','donor'),
  ('d1000000-0000-0000-0000-000000000006','field_officer');
insert into public.grants (id, code, title, donor_org_id, total_amount) values
  ('d2000000-0000-0000-0000-00000000000a','CG','Charter grant','d0000000-0000-0000-0000-0000000000d1',1000);
insert into public.projects (id, code, title, grant_id) values
  ('d3000000-0000-0000-0000-00000000000a','CH-DONOR','Donor-funded project','d2000000-0000-0000-0000-00000000000a'),
  ('d3000000-0000-0000-0000-00000000000b','CH-PLAIN','Project for assignments',null);
insert into public.user_project_access (user_id, project_id) values
  ('d1000000-0000-0000-0000-000000000006','d3000000-0000-0000-0000-00000000000b');
insert into public.project_charter_versions (project_id, version, background)
  values ('d3000000-0000-0000-0000-00000000000a', 1, 'Donor project background');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute 'set local role authenticated';
end $$;

do $$
declare
  ed text := 'd1000000-0000-0000-0000-000000000001';
  a  text := 'd1000000-0000-0000-0000-000000000002';
  b  text := 'd1000000-0000-0000-0000-000000000003';
  bd text := 'd1000000-0000-0000-0000-000000000004';
  dn text := 'd1000000-0000-0000-0000-000000000005';
  fo text := 'd1000000-0000-0000-0000-000000000006';
  ppid uuid := 'd3000000-0000-0000-0000-00000000000b';
  pid uuid; v1 uuid; v2 uuid; n int; denied boolean;
begin
  -- 1. Officer A (creator) writes version 1, then version 2: numbers come from the database
  perform pg_temp.as_user(a);
  insert into public.projects (code, title, created_by) values ('CH-1','Charter project', a::uuid) returning id into pid;
  insert into public.project_charter_versions (project_id, version, background, objectives)
    values (pid, 99, 'Background one', 'Objectives one') returning id into v1;
  assert (select version from public.project_charter_versions where id = v1) = 1, 'first version is 1, whatever was sent';
  insert into public.project_charter_versions (project_id, background, change_note)
    values (pid, 'Background two', 'Added background') returning id into v2;
  assert (select version from public.project_charter_versions where id = v2) = 2, 'second version is 2';
  assert (select created_by from public.project_charter_versions where id = v2) = a::uuid, 'created_by is the signed-in user';

  -- created_by and approval cannot be faked on insert
  insert into public.project_charter_versions (project_id, background, created_by, approved_by, approved_at)
    values (pid, 'Sneaky', b::uuid, b::uuid, now()) returning id into v1;
  assert (select created_by from public.project_charter_versions where id = v1) = a::uuid, 'created_by cannot be faked';
  assert (select approved_at from public.project_charter_versions where id = v1) is null, 'a new version starts unapproved';
  assert (select version from public.project_charter_versions where id = v1) = 3, 'third version is 3';

  -- text limits
  denied := false;
  begin insert into public.project_charter_versions (project_id, background) values (pid, repeat('x', 8001));
  exception when check_violation then denied := true; end;
  assert denied, 'text is limited to 8000 characters';

  -- 2. A saved version cannot be edited or deleted by the author
  denied := false;
  begin update public.project_charter_versions set background = 'Rewritten' where id = v2;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a saved version cannot be edited';
  update public.project_charter_versions set approved_by = a::uuid, approved_at = now() where id = v2;
  get diagnostics n = row_count;
  assert n = 0, 'officer must not approve (no update policy for officers)';
  delete from public.project_charter_versions where id = v2;
  get diagnostics n = row_count;
  assert n = 0, 'a version cannot be deleted';
  select count(*) into n from public.project_charter_versions where project_id = pid;
  assert n = 3, format('officer A should see 3 versions, got %s', n);
  execute 'reset role';

  -- 3. Officer B (never assigned) sees and does nothing
  perform pg_temp.as_user(b);
  select count(*) into n from public.project_charter_versions where project_id = pid;
  assert n = 0, format('unassigned officer must see no versions, got %s', n);
  denied := false;
  begin insert into public.project_charter_versions (project_id, background) values (pid, 'Intruder');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'unassigned officer must not write a version';
  execute 'reset role';

  -- 4. Field officer (assigned) may read but not write
  perform pg_temp.as_user(ed);
  insert into public.project_charter_versions (project_id, background) values (ppid, 'Plain project charter');
  execute 'reset role';
  perform pg_temp.as_user(fo);
  select count(*) into n from public.project_charter_versions where project_id = ppid;
  assert n = 1, 'field officer reads the charter of an assigned project';
  denied := false;
  begin insert into public.project_charter_versions (project_id, background) values (ppid, 'Not allowed');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'field officer must not write a version';
  execute 'reset role';

  -- 5. The Executive Director approves one version; the database records who and when; only once
  perform pg_temp.as_user(ed);
  update public.project_charter_versions set approved_by = a::uuid, approved_at = now() where id = v2;
  get diagnostics n = row_count;
  assert n = 1, 'executive may approve';
  assert (select approved_by from public.project_charter_versions where id = v2) = ed::uuid, 'approved_by is the Executive Director, not what was sent';
  assert (select approved_at from public.project_charter_versions where id = v2) is not null, 'approved_at recorded';
  denied := false;
  begin update public.project_charter_versions set approved_at = now() where id = v2;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'an approved version cannot be approved again or changed';
  denied := false;
  begin update public.project_charter_versions set background = 'Edit by executive' where id = v1;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'even the Executive Director cannot edit a saved version';
  execute 'reset role';

  -- 6. Board read-only; donor sees nothing; anonymous denied
  perform pg_temp.as_user(bd);
  select count(*) into n from public.project_charter_versions;
  assert n >= 5, format('board should see all versions, got %s', n);
  denied := false;
  begin insert into public.project_charter_versions (project_id, background) values (pid, 'Board write');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'board must not write';
  execute 'reset role';
  perform pg_temp.as_user(dn);
  select count(*) into n from public.project_charter_versions;
  assert n = 0, format('donor must see no versions, got %s', n);
  execute 'reset role';
  execute 'set local role anon';
  denied := false;
  begin perform 1 from public.project_charter_versions;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'anonymous must be denied';
  execute 'reset role';

  -- 7. Closed project is frozen (new versions and approval)
  perform set_config('request.jwt.claims', '', true);
  update public.projects set stage = 'closed' where id = pid;
  perform pg_temp.as_user(a);
  denied := false;
  begin insert into public.project_charter_versions (project_id, background) values (pid, 'Late version');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'no new versions on a closed project';
  execute 'reset role';
  perform pg_temp.as_user(ed);
  denied := false;
  begin update public.project_charter_versions set approved_by = ed::uuid, approved_at = now() where id = v1;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'no approval on a closed project';
  execute 'reset role';

  -- 8. The audit log recorded the changes
  select count(*) into n from public.audit_log where table_name = 'project_charter_versions';
  assert n >= 4, format('audit log should hold charter changes, got %s', n);
end $$;

select 'ALL PROJECT CHARTER RLS CHECKS PASSED' as result;
rollback;
