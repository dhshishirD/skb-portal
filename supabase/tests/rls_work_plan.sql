-- rls_work_plan.sql - proves the 0041 rules: the daily work plan (own tasks, tasks given by the Executive Director /
-- Super Admin, who reads what, frozen months) and reviewers being optional for the Work Statement.
-- One transaction, rolled back; any failed assert raises an error. LOCAL / STAGING Supabase only.
-- All values below are synthetic test data.
begin;

insert into auth.users (id) values
  ('e9000000-0000-0000-0000-000000000001'), -- staff member (project officer)
  ('e9000000-0000-0000-0000-000000000002'), -- other staff member (field officer)
  ('e9000000-0000-0000-0000-000000000003'), -- executive director
  ('e9000000-0000-0000-0000-000000000004'), -- super admin
  ('e9000000-0000-0000-0000-000000000005'); -- programme manager
insert into public.user_roles (user_id, role) values
  ('e9000000-0000-0000-0000-000000000001','project_officer'),
  ('e9000000-0000-0000-0000-000000000002','field_officer'),
  ('e9000000-0000-0000-0000-000000000003','executive'),
  ('e9000000-0000-0000-0000-000000000004','super_admin'),
  ('e9000000-0000-0000-0000-000000000005','programme_manager');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute 'set local role authenticated';
end $$;

create or replace function pg_temp.fill_month(m date) returns void language plpgsql as $$
begin
  insert into public.work_days (user_id, work_date, day_type, place, tasks)
  select 'e9000000-0000-0000-0000-000000000001', d::date, 'office', 'Central Office', 'Test work'
  from generate_series(m::timestamp, (m + interval '1 month - 1 day')::timestamp, interval '1 day') d
  where extract(dow from d) not in (5, 6)
  on conflict (user_id, work_date) do nothing;
end $$;

do $$
declare
  u1 uuid := 'e9000000-0000-0000-0000-000000000001';
  u2 uuid := 'e9000000-0000-0000-0000-000000000002';
  u3 uuid := 'e9000000-0000-0000-0000-000000000003';
  u4 uuid := 'e9000000-0000-0000-0000-000000000004';
  u5 uuid := 'e9000000-0000-0000-0000-000000000005';
  today date := public.dhaka_today();
  m1 date := date_trunc('month', public.dhaka_today() - interval '2 months')::date;
  m2 date := date_trunc('month', public.dhaka_today() - interval '3 months')::date;
  a uuid; g uuid; s1 uuid; s2 uuid;
  denied boolean;
BEGIN
  -- 1. A person plans their own tasks, today and ahead
  perform pg_temp.as_user(u1::text);
  insert into public.work_plan_items (user_id, plan_date, title) values (u1, today, 'Visit the camp') returning id into a;
  insert into public.work_plan_items (user_id, plan_date, title) values (u1, today + 3, 'Prepare the report');
  assert (select assigned from public.work_plan_items where id = a) = false, 'own task is not assigned';
  denied := false;
  begin insert into public.work_plan_items (user_id, plan_date, title) values (u2, today, 'For someone else');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a staff member cannot add a task for someone else';
  update public.work_plan_items set status = 'not_done', reason = 'Road closed' where id = a;
  assert (select reason from public.work_plan_items where id = a) = 'Road closed', 'a reason goes with not done';
  update public.work_plan_items set status = 'done' where id = a;
  assert (select reason from public.work_plan_items where id = a) is null, 'the reason is cleared when the task is done';

  -- 2. Who reads a plan: the person, the Executive Director and the Super Admin; nobody else
  perform pg_temp.as_user(u2::text);
  assert (select count(*) from public.work_plan_items) = 0, 'other staff do not read a plan';
  perform pg_temp.as_user(u5::text);
  assert (select count(*) from public.work_plan_items) = 0, 'a programme manager does not read a plan';
  perform pg_temp.as_user(u3::text);
  assert (select count(*) from public.work_plan_items where user_id = u1) = 2, 'the executive reads every plan';
  perform pg_temp.as_user(u4::text);
  assert (select count(*) from public.work_plan_items where user_id = u1) = 2, 'the super admin reads every plan';

  -- 3. The Executive Director gives a task
  perform pg_temp.as_user(u3::text);
  insert into public.work_plan_items (user_id, plan_date, title, status, reason) values (u1, today, 'Send the donor note', 'done', 'x') returning id into g;
  assert (select assigned from public.work_plan_items where id = g) = true, 'a given task is marked assigned';
  assert (select assigned_by from public.work_plan_items where id = g) = u3, 'the giver is recorded';
  assert (select status from public.work_plan_items where id = g) = 'planned', 'a given task starts as planned';
  assert (select reason from public.work_plan_items where id = g) is null, 'a given task starts without a reason';
  perform pg_temp.as_user(u1::text);
  assert (select count(*) from public.work_plan_items where id = g) = 1, 'the person sees the task they were given';

  -- 4. The person reports on a given task but does not rewrite or remove it
  update public.work_plan_items set title = 'Something else', status = 'doing' where id = g;
  assert (select title from public.work_plan_items where id = g) = 'Send the donor note', 'the person cannot rewrite a given task';
  assert (select status from public.work_plan_items where id = g) = 'doing', 'the person reports on a given task';
  delete from public.work_plan_items where id = g;
  assert (select count(*) from public.work_plan_items where id = g) = 1, 'the person cannot remove a given task';
  update public.work_plan_items set plan_date = today + 1 where id = g;
  assert (select plan_date from public.work_plan_items where id = g) = today + 1, 'the person may move a given task to another day';

  -- 5. The giver edits the task but not the person's own report
  perform pg_temp.as_user(u3::text);
  update public.work_plan_items set title = 'Send the donor note today', status = 'done' where id = g;
  assert (select title from public.work_plan_items where id = g) = 'Send the donor note today', 'the giver edits the title';
  assert (select status from public.work_plan_items where id = g) = 'doing', 'the giver cannot change the person''s status';
  perform pg_temp.as_user(u4::text);
  update public.work_plan_items set title = 'Super admin edit' where id = g;
  assert (select title from public.work_plan_items where id = g) = 'Send the donor note today', 'another admin cannot edit a task they did not give';
  perform pg_temp.as_user(u3::text);
  delete from public.work_plan_items where id = g;
  assert (select count(*) from public.work_plan_items where id = g) = 0, 'the giver removes a task they gave';

  -- 6. Other staff cannot touch someone else's plan
  perform pg_temp.as_user(u2::text);
  update public.work_plan_items set title = 'hacked' where id = a;
  delete from public.work_plan_items where id = a;
  perform pg_temp.as_user(u1::text);
  assert (select title from public.work_plan_items where id = a) = 'Visit the camp', 'another staff member cannot change my task';

  -- 7. Reviewers optional: no reviewer set, so submitting makes the month final
  perform pg_temp.fill_month(m1);
  insert into public.work_statements (user_id, month) values (u1, m1) returning id into s1;
  update public.work_statements set status = 'submitted' where id = s1;
  assert (select status from public.work_statements where id = s1) = 'approved', 'with no reviewer the month is final at once';
  assert (select approved_by from public.work_statements where id = s1) is null, 'nobody approved it, so approved_by stays empty';
  assert (select approved_at from public.work_statements where id = s1) is not null, 'the time is recorded';
  perform pg_temp.as_user(u3::text);
  assert (select count(*) from public.work_statements where id = s1) = 1, 'the executive reads a month that was final at submit';

  -- 8. A submitted month freezes the plan too
  perform pg_temp.as_user(u1::text);
  denied := false;
  begin insert into public.work_plan_items (user_id, plan_date, title) values (u1, m1 + 5, 'Late task');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a task cannot be added to a submitted month';
  perform pg_temp.as_user(u3::text);
  denied := false;
  begin insert into public.work_plan_items (user_id, plan_date, title) values (u1, m1 + 5, 'Late given task');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a task cannot be given into a submitted month either';

  -- 9. An approver that is missing never lets just anyone approve
  perform pg_temp.as_user(u4::text);
  insert into public.work_reviewers (user_id, verifier_id, approver_id) values (u1, u5, null);
  perform pg_temp.as_user(u1::text);
  perform pg_temp.fill_month(m2);
  insert into public.work_statements (user_id, month) values (u1, m2) returning id into s2;
  update public.work_statements set status = 'submitted' where id = s2;
  assert (select status from public.work_statements where id = s2) = 'submitted', 'with a verifier set the month waits';
  perform pg_temp.as_user(u5::text);
  update public.work_statements set status = 'verified' where id = s2;
  assert (select status from public.work_statements where id = s2) = 'verified', 'the verifier verifies';
  denied := false;
  begin update public.work_statements set status = 'approved' where id = s2;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the verifier cannot approve when no approver is set';
  perform pg_temp.as_user(u3::text);
  update public.work_statements set status = 'approved' where id = s2;
  assert (select approved_by from public.work_statements where id = s2) = u3, 'the executive approves when no approver is set';
end $$;

rollback;
