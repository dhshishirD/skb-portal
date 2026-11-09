-- rls_tasks.sql - proves the 0020 rules for project tasks and task comments.
-- One transaction, rolled back; any failed assert raises an error. LOCAL / STAGING Supabase only.
begin;

insert into public.organizations (id, name, type) values
  ('f0000000-0000-0000-0000-0000000000a1','SKB (test)','internal'),
  ('f0000000-0000-0000-0000-0000000000d1','Donor (test)','donor');
insert into auth.users (id) values
  ('f1000000-0000-0000-0000-000000000001'), -- executive
  ('f1000000-0000-0000-0000-000000000002'), -- project officer (assigned)
  ('f1000000-0000-0000-0000-000000000003'), -- field officer A (task assignee)
  ('f1000000-0000-0000-0000-000000000004'), -- board
  ('f1000000-0000-0000-0000-000000000005'), -- donor
  ('f1000000-0000-0000-0000-000000000006'), -- field officer B (on team, not the assignee)
  ('f1000000-0000-0000-0000-000000000007'), -- project officer (never assigned)
  ('f1000000-0000-0000-0000-000000000008'); -- programme manager (assigned)
update public.profiles set org_id = 'f0000000-0000-0000-0000-0000000000a1' where id::text like 'f1000000-%' and id::text not like '%05';
update public.profiles set org_id = 'f0000000-0000-0000-0000-0000000000d1' where id = 'f1000000-0000-0000-0000-000000000005';
insert into public.user_roles (user_id, role) values
  ('f1000000-0000-0000-0000-000000000001','executive'),
  ('f1000000-0000-0000-0000-000000000002','project_officer'),
  ('f1000000-0000-0000-0000-000000000003','field_officer'),
  ('f1000000-0000-0000-0000-000000000004','board'),
  ('f1000000-0000-0000-0000-000000000005','donor'),
  ('f1000000-0000-0000-0000-000000000006','field_officer'),
  ('f1000000-0000-0000-0000-000000000007','project_officer'),
  ('f1000000-0000-0000-0000-000000000008','programme_manager');
insert into public.grants (id, code, title, donor_org_id, total_amount) values
  ('f2000000-0000-0000-0000-00000000000a','TG','Tasks grant','f0000000-0000-0000-0000-0000000000d1',1000);
insert into public.projects (id, code, title, grant_id) values
  ('f3000000-0000-0000-0000-00000000000a','TK-DONOR','Donor-funded project','f2000000-0000-0000-0000-00000000000a'),
  ('f3000000-0000-0000-0000-00000000000b','TK-MAIN','Main test project',null),
  ('f3000000-0000-0000-0000-00000000000c','TK-OTHER','Other project',null);
insert into public.user_project_access (user_id, project_id) values
  ('f1000000-0000-0000-0000-000000000002','f3000000-0000-0000-0000-00000000000b'),
  ('f1000000-0000-0000-0000-000000000003','f3000000-0000-0000-0000-00000000000b'),
  ('f1000000-0000-0000-0000-000000000006','f3000000-0000-0000-0000-00000000000b'),
  ('f1000000-0000-0000-0000-000000000008','f3000000-0000-0000-0000-00000000000b');
insert into public.logframe_nodes (id, project_id, kind, code, title) values
  ('f4000000-0000-0000-0000-00000000000b','f3000000-0000-0000-0000-00000000000b','goal','1','Main goal'),
  ('f4000000-0000-0000-0000-00000000000c','f3000000-0000-0000-0000-00000000000c','goal','1','Other goal');

-- a task and a comment on the donor-funded project (inserted as the database owner)
insert into public.tasks (id, project_id, title) values
  ('f5000000-0000-0000-0000-00000000000a','f3000000-0000-0000-0000-00000000000a','Donor project task');
insert into public.task_comments (task_id, author_id, body) values
  ('f5000000-0000-0000-0000-00000000000a','f1000000-0000-0000-0000-000000000003','Donor project comment');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute 'set local role authenticated';
end $$;

do $$
declare
  ed text := 'f1000000-0000-0000-0000-000000000001';
  po text := 'f1000000-0000-0000-0000-000000000002';
  fa text := 'f1000000-0000-0000-0000-000000000003';
  bd text := 'f1000000-0000-0000-0000-000000000004';
  dn text := 'f1000000-0000-0000-0000-000000000005';
  fb text := 'f1000000-0000-0000-0000-000000000006';
  px text := 'f1000000-0000-0000-0000-000000000007';
  pm text := 'f1000000-0000-0000-0000-000000000008';
  pid uuid := 'f3000000-0000-0000-0000-00000000000b';
  node_main uuid := 'f4000000-0000-0000-0000-00000000000b';
  node_other uuid := 'f4000000-0000-0000-0000-00000000000c';
  t1 uuid; t2 uuid; c1 uuid; n int; denied boolean;
begin
  -- 1. Project officer adds tasks
  perform pg_temp.as_user(po);
  insert into public.tasks (project_id, title, assignee_id, node_id, created_by)
    values (pid, 'Buy kits', fa::uuid, node_main, px::uuid) returning id into t1;
  assert (select created_by from public.tasks where id = t1) = po::uuid, 'created_by is the signed-in user, not what was sent';
  insert into public.tasks (project_id, title) values (pid, 'Unassigned task') returning id into t2;

  denied := false;
  begin insert into public.tasks (project_id, title) values (pid, 'x');
  exception when check_violation then denied := true; end;
  assert denied, 'a title needs at least 2 characters';
  denied := false;
  begin insert into public.tasks (project_id, title, assignee_id) values (pid, 'Assign outsider', px::uuid);
  exception when check_violation then denied := true; end;
  assert denied, 'a task cannot be assigned to someone not on the project team';
  denied := false;
  begin insert into public.tasks (project_id, title, assignee_id) values (pid, 'Assign donor', dn::uuid);
  exception when check_violation then denied := true; end;
  assert denied, 'a task cannot be assigned to a donor';
  denied := false;
  begin insert into public.tasks (project_id, title, node_id) values (pid, 'Wrong logframe', node_other);
  exception when check_violation then denied := true; end;
  assert denied, 'a task can only link to a logframe item of its own project';

  -- the assignable team list
  assert exists (select 1 from public.project_team(pid) where id = fa::uuid), 'team list includes the field officer';
  assert exists (select 1 from public.project_team(pid) where id = po::uuid), 'team list includes the project officer';
  assert not exists (select 1 from public.project_team(pid) where id = px::uuid), 'team list excludes an unassigned officer';
  assert not exists (select 1 from public.project_team(pid) where id = dn::uuid), 'team list excludes donors';

  -- 2. The assignee may change only the status
  perform pg_temp.as_user(fa);
  update public.tasks set status = 'doing' where id = t1;
  get diagnostics n = row_count;
  assert n = 1, 'the assignee can change the status';
  update public.tasks set status = 'done' where id = t1;
  assert (select completed_at from public.tasks where id = t1) is not null, 'completed_at is set when done';
  update public.tasks set status = 'doing' where id = t1;
  assert (select completed_at from public.tasks where id = t1) is null, 'completed_at is cleared when reopened';
  denied := false;
  begin update public.tasks set title = 'Renamed by assignee' where id = t1;
  exception when others then denied := true; end;
  assert denied, 'the assignee cannot change anything but the status';
  denied := false;
  begin update public.tasks set assignee_id = fb::uuid where id = t1;
  exception when others then denied := true; end;
  assert denied, 'the assignee cannot reassign the task';
  denied := false;
  begin insert into public.tasks (project_id, title) values (pid, 'By field officer');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a field officer cannot create tasks';
  delete from public.tasks where id = t1;
  get diagnostics n = row_count;
  assert n = 0, 'a field officer cannot delete tasks';

  -- 3. Another field officer on the team: reads, but cannot change someone else''s task
  perform pg_temp.as_user(fb);
  assert (select count(*) from public.tasks where project_id = pid) = 2, 'team members read the project tasks';
  update public.tasks set status = 'done' where id = t1;
  get diagnostics n = row_count;
  assert n = 0, 'a team member cannot change the status of someone else''s task';

  -- 4. Comments: author is forced, no edit, no delete
  perform pg_temp.as_user(fa);
  insert into public.task_comments (task_id, author_id, body) values (t1, px::uuid, 'Reached the site') returning id into c1;
  assert (select author_id from public.task_comments where id = c1) = fa::uuid, 'the comment author is the signed-in user';
  denied := false;
  begin insert into public.task_comments (task_id, body) values (t1, '');
  exception when check_violation then denied := true; end;
  assert denied, 'a comment cannot be empty';
  denied := false;
  begin update public.task_comments set body = 'Edited' where id = c1;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a comment cannot be edited';
  denied := false;
  begin delete from public.task_comments where id = c1;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a comment cannot be deleted';
  perform pg_temp.as_user(fb);
  assert (select count(*) from public.task_comments where task_id = t1) = 1, 'team members read comments';

  -- 5. An officer not on the project sees and does nothing
  perform pg_temp.as_user(px);
  assert (select count(*) from public.tasks where project_id = pid) = 0, 'an unassigned officer sees no tasks';
  assert (select count(*) from public.task_comments where task_id = t1) = 0, 'an unassigned officer sees no comments';
  assert not exists (select 1 from public.project_team(pid)), 'an unassigned officer gets no team list';
  denied := false;
  begin insert into public.tasks (project_id, title) values (pid, 'Not on this project');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'an unassigned officer cannot add tasks';

  -- 6. Donor: no tasks, no comments, cannot comment
  perform pg_temp.as_user(dn);
  assert (select count(*) from public.tasks) = 0, 'a donor sees no tasks, even on its own projects';
  assert (select count(*) from public.task_comments) = 0, 'a donor sees no comments';
  denied := false;
  begin insert into public.task_comments (task_id, body) values ('f5000000-0000-0000-0000-00000000000a', 'Donor comment');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a donor cannot comment';

  -- 7. Board reads everything, writes nothing
  perform pg_temp.as_user(bd);
  assert (select count(*) from public.tasks where project_id = pid) = 2, 'board reads tasks';
  denied := false;
  begin insert into public.tasks (project_id, title) values (pid, 'By board');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'board cannot write';

  -- 8. Programme manager edits and deletes
  perform pg_temp.as_user(pm);
  update public.tasks set priority = 'urgent', due_date = '2026-12-01' where id = t2;
  get diagnostics n = row_count;
  assert n = 1, 'a programme manager can edit tasks';
  delete from public.tasks where id = t2;
  get diagnostics n = row_count;
  assert n = 1, 'a programme manager can delete tasks';

  -- 9. Audit
  reset role;
  assert (select count(*) from public.audit_log where table_name = 'tasks' and record_id = t1::text) >= 3, 'task changes are in the audit log';

  -- 10. Closed project is frozen
  perform set_config('request.jwt.claims', '', true);
  update public.projects set stage = 'closed' where id = pid;
  perform pg_temp.as_user(po);
  denied := false;
  begin insert into public.tasks (project_id, title) values (pid, 'After close');
  exception when others then denied := true; end;
  assert denied, 'a closed project cannot get new tasks';
  denied := false;
  begin update public.tasks set priority = 'low' where id = t1;
  exception when others then denied := true; end;
  assert denied, 'a closed project task cannot be edited';
  perform pg_temp.as_user(fa);
  denied := false;
  begin insert into public.task_comments (task_id, body) values (t1, 'After close');
  exception when others then denied := true; end;
  assert denied, 'a closed project cannot get new comments';
end $$;

rollback;
