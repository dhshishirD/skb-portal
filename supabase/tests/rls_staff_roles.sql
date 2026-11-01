-- rls_staff_roles.sql - proves the 0010/0011 rules for board, legal_officer and it_officer.
-- One transaction, rolled back; any failed assert raises an error. LOCAL Supabase only.
begin;

-- ---------- fixtures (superuser, RLS bypassed) ----------
insert into public.organizations (id, name, type) values
  ('70000000-0000-0000-0000-0000000000a1','SKB (test)','internal'),
  ('70000000-0000-0000-0000-0000000000d1','Donor (test)','donor');

insert into auth.users (id) values
  ('71000000-0000-0000-0000-000000000001'), -- board (Chairman)
  ('71000000-0000-0000-0000-000000000002'), -- legal officer
  ('71000000-0000-0000-0000-000000000003'), -- IT officer
  ('71000000-0000-0000-0000-000000000004'), -- project officer on P1 only
  ('71000000-0000-0000-0000-000000000005'); -- board member WITH a project assignment

update public.profiles set org_id = '70000000-0000-0000-0000-0000000000a1'
  where id::text like '71000000-0000-0000-0000-00000000000%';

insert into public.user_roles (user_id, role) values
  ('71000000-0000-0000-0000-000000000001','board'),
  ('71000000-0000-0000-0000-000000000002','legal_officer'),
  ('71000000-0000-0000-0000-000000000003','it_officer'),
  ('71000000-0000-0000-0000-000000000004','project_officer'),
  ('71000000-0000-0000-0000-000000000005','board');

insert into public.grants (id, code, title, donor_org_id, total_amount) values
  ('72000000-0000-0000-0000-000000000001','TG1','Test grant','70000000-0000-0000-0000-0000000000d1',1000);
insert into public.projects (id, code, title, grant_id) values
  ('73000000-0000-0000-0000-000000000001','TP1','Test project 1','72000000-0000-0000-0000-000000000001'),
  ('73000000-0000-0000-0000-000000000002','TP2','Test project 2','72000000-0000-0000-0000-000000000001');
insert into public.user_project_access (user_id, project_id) values
  ('71000000-0000-0000-0000-000000000004','73000000-0000-0000-0000-000000000001'),
  ('71000000-0000-0000-0000-000000000005','73000000-0000-0000-0000-000000000001');
insert into public.tasks (project_id, title) values
  ('73000000-0000-0000-0000-000000000001','Task in P1'),
  ('73000000-0000-0000-0000-000000000002','Task in P2');
insert into public.beneficiaries (project_id, full_name_enc, consent_at) values
  ('73000000-0000-0000-0000-000000000001','enc:test', now());

-- ---------- checks ----------
do $$
declare n int; denied boolean;
begin
  -- 1. Board (Chairman) reads all projects, grants and tasks ...
  perform set_config('request.jwt.claims','{"sub":"71000000-0000-0000-0000-000000000001"}',true);
  execute 'set local role authenticated';
  select count(*) into n from public.projects where code like 'TP%';
  assert n = 2, format('board should see both projects, got %s', n);
  select count(*) into n from public.tasks where title like 'Task in P%';
  assert n = 2, format('board should see all tasks, got %s', n);
  select count(*) into n from public.grants where code = 'TG1';
  assert n = 1, format('board should see the grant, got %s', n);
  -- ... but NOT individual beneficiaries
  select count(*) into n from public.beneficiaries;
  assert n = 0, format('board must not see beneficiary records, got %s', n);
  -- ... and cannot change anything
  update public.projects set title = 'hacked' where code = 'TP1';
  get diagnostics n = row_count;
  assert n = 0, 'board must not update projects';
  denied := false;
  begin
    insert into public.tasks (project_id, title) values ('73000000-0000-0000-0000-000000000001','board task');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'board must not create tasks';
  -- ... and can read the staff directory and community
  select count(*) into n from public.profiles where id::text like '71000000-%';
  assert n = 5, format('board should see the 5 test staff profiles, got %s', n);
  execute 'reset role';

  -- 2. Board member who also has a project assignment is STILL read-only
  perform set_config('request.jwt.claims','{"sub":"71000000-0000-0000-0000-000000000005"}',true);
  execute 'set local role authenticated';
  denied := false;
  begin
    insert into public.tasks (project_id, title) values ('73000000-0000-0000-0000-000000000001','board task 2');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'assigned board member must not create tasks';
  update public.tasks set title = 'changed' where title = 'Task in P1';
  get diagnostics n = row_count;
  assert n = 0, 'assigned board member must not update tasks';
  execute 'reset role';

  -- 3. Legal officer reads projects AND beneficiary consent records, cannot write
  perform set_config('request.jwt.claims','{"sub":"71000000-0000-0000-0000-000000000002"}',true);
  execute 'set local role authenticated';
  select count(*) into n from public.projects where code like 'TP%';
  assert n = 2, format('legal officer should see both projects, got %s', n);
  select count(*) into n from public.beneficiaries;
  assert n = 1, format('legal officer should see beneficiary records, got %s', n);
  update public.beneficiaries set sex = 'other';
  get diagnostics n = row_count;
  assert n = 0, 'legal officer must not edit beneficiaries';
  select count(*) into n from public.audit_log;  -- allowed (may be 0 rows): must not raise
  execute 'reset role';

  -- 4. IT officer: directory + audit log, but no project data
  perform set_config('request.jwt.claims','{"sub":"71000000-0000-0000-0000-000000000003"}',true);
  execute 'set local role authenticated';
  select count(*) into n from public.projects where code like 'TP%';
  assert n = 0, format('IT officer must not see projects, got %s', n);
  select count(*) into n from public.tasks;
  assert n = 0, format('IT officer must not see tasks, got %s', n);
  select count(*) into n from public.user_roles where user_id::text like '71000000-%';
  assert n = 5, format('IT officer should see staff roles, got %s', n);
  select count(*) into n from public.profiles where id::text like '71000000-%';
  assert n = 5, format('IT officer should see staff profiles, got %s', n);
  -- cannot change roles (no grant since 0008)
  denied := false;
  begin
    insert into public.user_roles (user_id, role) values ('71000000-0000-0000-0000-000000000003','super_admin');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'IT officer must not grant roles';
  execute 'reset role';

  -- 5. Project officer: unchanged, still only their own project
  perform set_config('request.jwt.claims','{"sub":"71000000-0000-0000-0000-000000000004"}',true);
  execute 'set local role authenticated';
  select count(*) into n from public.projects where code like 'TP%';
  assert n = 1, format('project officer should see only TP1, got %s', n);
  -- and cannot edit their own hierarchy fields
  denied := false;
  begin
    update public.profiles set designation = 'Chairman' where id = '71000000-0000-0000-0000-000000000004';
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'users must not edit their own designation';
  execute 'reset role';
end $$;

-- Community posting works for board / legal / IT (is_staff_member)
do $$
declare n int;
begin
  perform set_config('request.jwt.claims','{"sub":"71000000-0000-0000-0000-000000000001"}',true);
  execute 'set local role authenticated';
  insert into public.community_posts (author_id, author_name, author_role, category, title, content)
    values ('71000000-0000-0000-0000-000000000001','Chair','Chairman','HQ Announcements','Hello','Welcome');
  select count(*) into n from public.community_posts where title = 'Hello';
  assert n = 1, 'board should post and read community posts';
  execute 'reset role';
end $$;

select 'ALL STAFF ROLE RLS CHECKS PASSED' as result;
rollback;
