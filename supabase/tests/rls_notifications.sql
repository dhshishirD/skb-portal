-- rls_notifications.sql - proves the 0044 rules: a message and a task assignment each notify the right person,
-- people see and mark only their own notifications, and nobody can create or edit one from the browser.
-- One transaction, rolled back. LOCAL / STAGING Supabase only. All values are synthetic test data.
begin;

insert into auth.users (id) values
  ('fb000000-0000-0000-0000-000000000001'), -- project officer (assigns tasks, sends messages)
  ('fb000000-0000-0000-0000-000000000002'), -- field officer (on the project team)
  ('fb000000-0000-0000-0000-000000000003'); -- finance (bystander)
update public.profiles set full_name = 'Test Officer', is_active = true where id = 'fb000000-0000-0000-0000-000000000001';
update public.profiles set full_name = 'Test Field', is_active = true where id = 'fb000000-0000-0000-0000-000000000002';
insert into public.user_roles (user_id, role) values
  ('fb000000-0000-0000-0000-000000000001','project_officer'),
  ('fb000000-0000-0000-0000-000000000002','field_officer'),
  ('fb000000-0000-0000-0000-000000000003','finance');
insert into public.projects (id, code, title) values ('fb100000-0000-0000-0000-00000000000a','NT-1','Notify project');
insert into public.user_project_access (user_id, project_id) values
  ('fb000000-0000-0000-0000-000000000001','fb100000-0000-0000-0000-00000000000a'),
  ('fb000000-0000-0000-0000-000000000002','fb100000-0000-0000-0000-00000000000a');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute 'set local role authenticated';
end $$;

do $$
declare
  po text := 'fb000000-0000-0000-0000-000000000001';
  fa text := 'fb000000-0000-0000-0000-000000000002';
  fin text := 'fb000000-0000-0000-0000-000000000003';
  pid uuid := 'fb100000-0000-0000-0000-00000000000a';
  t1 uuid; n int; denied boolean;
begin
  -- 1. a direct message notifies only the person it was sent to
  perform pg_temp.as_user(po);
  insert into public.direct_messages (recipient_id, text, sender_name, recipient_name, sender_role)
    values (fa::uuid, repeat('x', 400), '', '', '');
  perform pg_temp.as_user(fa);
  assert (select count(*) from public.notifications where kind = 'message') = 1, 'the recipient gets one message notification';
  assert (select title from public.notifications where kind = 'message') = 'New message from Test Officer', 'the title names the sender';
  assert (select char_length(body) from public.notifications where kind = 'message') = 140, 'the preview is cut to 140 characters';
  assert (select link from public.notifications where kind = 'message') = '/community', 'the link opens the messages';
  perform pg_temp.as_user(po);
  assert (select count(*) from public.notifications) = 0, 'the sender gets no notification';
  perform pg_temp.as_user(fin);
  assert (select count(*) from public.notifications) = 0, 'a bystander sees no notification';

  -- 2. assigning a task notifies the assignee; assigning to yourself or leaving it unassigned does not
  perform pg_temp.as_user(po);
  insert into public.tasks (project_id, title, assignee_id) values (pid, 'Buy kits', fa::uuid) returning id into t1;
  insert into public.tasks (project_id, title) values (pid, 'Unassigned task');
  insert into public.tasks (project_id, title, assignee_id) values (pid, 'My own task', po::uuid);
  perform pg_temp.as_user(fa);
  assert (select count(*) from public.notifications where kind = 'task_assigned') = 1, 'one task notification, only for the assigned task';
  assert (select title from public.notifications where kind = 'task_assigned') = 'Test Officer assigned you a task', 'the title names who assigned';
  assert (select body from public.notifications where kind = 'task_assigned') = 'Buy kits · NT-1', 'the body names the task and project';
  assert (select link from public.notifications where kind = 'task_assigned') = '/projects/' || pid || '/tasks', 'the link opens the project tasks';
  perform pg_temp.as_user(po);
  assert (select count(*) from public.notifications) = 0, 'assigning to yourself notifies nobody';

  -- editing the task without changing the assignee sends nothing new
  update public.tasks set priority = 'high' where id = t1;
  perform pg_temp.as_user(fa);
  assert (select count(*) from public.notifications where kind = 'task_assigned') = 1, 'no new notification when the assignee did not change';

  -- 3. the recipient can mark as read; nobody else can; nobody can create, edit or delete
  update public.notifications set read_at = now() where kind = 'message';
  assert (select read_at is not null from public.notifications where kind = 'message'), 'the recipient can mark a notification read';
  denied := false;
  begin update public.notifications set title = 'changed'; exception when others then denied := true; end;
  assert denied, 'a notification text cannot be edited';
  denied := false;
  begin insert into public.notifications (recipient_id, kind, title, link) values (fa::uuid, 'message', 'forged', '/x');
  exception when others then denied := true; end;
  assert denied, 'a notification cannot be created from the browser';
  denied := false;
  begin delete from public.notifications; exception when others then denied := true; end;
  assert denied, 'a notification cannot be deleted from the browser';
  perform pg_temp.as_user(fin);
  update public.notifications set read_at = null;
  get diagnostics n = row_count;
  assert n = 0, 'a bystander cannot touch someone else''s notifications';
  perform pg_temp.as_user(fa);
  assert (select read_at is not null from public.notifications where kind = 'message'), 'the other person''s update changed nothing';
end $$;

rollback;
