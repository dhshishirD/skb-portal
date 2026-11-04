-- rls_donor_me.sql - proves DONOR ISOLATION (migration 0013).
-- A donor sees only the projects and grant of their own organisation, only PUBLISHED donor
-- reports, and none of SKB's internal working data. Donors can never write.
-- One transaction, rolled back; any failed assert raises an error. LOCAL Supabase only.
begin;

-- ---------- fixtures (superuser, RLS bypassed) ----------
insert into public.organizations (id, name, type) values
  ('90000000-0000-0000-0000-0000000000a1','SKB (test)','internal'),
  ('90000000-0000-0000-0000-0000000000d1','Donor A (test)','donor'),
  ('90000000-0000-0000-0000-0000000000d2','Donor B (test)','donor');

insert into auth.users (id) values
  ('91000000-0000-0000-0000-000000000001'), -- donor A
  ('91000000-0000-0000-0000-000000000002'), -- donor B
  ('91000000-0000-0000-0000-000000000003'), -- donor A, deactivated
  ('91000000-0000-0000-0000-000000000004'), -- staff: project officer assigned to PA only
  ('91000000-0000-0000-0000-000000000005'); -- donor role but no organisation

update public.profiles set org_id = '90000000-0000-0000-0000-0000000000d1' where id in
  ('91000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000003');
update public.profiles set org_id = '90000000-0000-0000-0000-0000000000d2' where id = '91000000-0000-0000-0000-000000000002';
update public.profiles set org_id = '90000000-0000-0000-0000-0000000000a1' where id = '91000000-0000-0000-0000-000000000004';
update public.profiles set is_active = false where id = '91000000-0000-0000-0000-000000000003';

insert into public.user_roles (user_id, role) values
  ('91000000-0000-0000-0000-000000000001','donor'),
  ('91000000-0000-0000-0000-000000000002','donor'),
  ('91000000-0000-0000-0000-000000000003','donor'),
  ('91000000-0000-0000-0000-000000000004','project_officer'),
  ('91000000-0000-0000-0000-000000000005','donor');

insert into public.grants (id, code, title, donor_org_id, total_amount) values
  ('92000000-0000-0000-0000-00000000000a','GA','Grant A','90000000-0000-0000-0000-0000000000d1',1000),
  ('92000000-0000-0000-0000-00000000000b','GB','Grant B','90000000-0000-0000-0000-0000000000d2',2000);
insert into public.projects (id, code, title, grant_id) values
  ('93000000-0000-0000-0000-00000000000a','DPA','Project of donor A','92000000-0000-0000-0000-00000000000a'),
  ('93000000-0000-0000-0000-00000000000b','DPB','Project of donor B','92000000-0000-0000-0000-00000000000b'),
  ('93000000-0000-0000-0000-00000000000c','DPC','Project with no donor',null);
insert into public.user_project_access (user_id, project_id) values
  ('91000000-0000-0000-0000-000000000004','93000000-0000-0000-0000-00000000000a');

-- internal working data, one row on each of the three projects
do $$
declare p uuid; staff uuid := '91000000-0000-0000-0000-000000000004';
begin
  foreach p in array array[
    '93000000-0000-0000-0000-00000000000a','93000000-0000-0000-0000-00000000000b','93000000-0000-0000-0000-00000000000c'
  ]::uuid[] loop
    insert into public.tasks (project_id, title) values (p, 'Internal task');
    insert into public.documents (project_id, title) values (p, 'Internal document');
    insert into public.field_reports (project_id, period, reporter_id) values (p, date '2026-10-01', staff);
    insert into public.expenses (project_id, amount, expense_date, description, claimant_id) values (p, 10, date '2026-10-01', 'Internal expense', staff);
    insert into public.purchase_requests (project_id, description, estimated_amount, requester_id) values (p, 'Internal purchase', 5, staff);
    insert into public.stage_gate_items (project_id, stage, label) values (p, 'concept', 'Internal gate');
    insert into public.project_stage_history (project_id, to_stage) values (p, 'concept');
    insert into public.beneficiaries (project_id, full_name_enc, consent_at) values (p, 'enc:test', now());
    insert into public.budget_lines (project_id, code, description, amount) values (p, 'B1', 'Budget line', 100);
    insert into public.logframe_nodes (project_id, kind, code, title) values (p, 'goal', 'G1', 'Goal');
  end loop;
end $$;
insert into public.donor_reports (grant_id, period, status) values
  ('92000000-0000-0000-0000-00000000000a','2026-Q3','published'),
  ('92000000-0000-0000-0000-00000000000a','2026-Q4','draft'),
  ('92000000-0000-0000-0000-00000000000b','2026-Q3','published');

-- ---------- checks ----------
create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute 'set local role authenticated';
end $$;

do $$
declare n int; denied boolean;
  donor_a text := '91000000-0000-0000-0000-000000000001';
  donor_b text := '91000000-0000-0000-0000-000000000002';
begin
  -- 1. Donor A: own project and grant only
  perform pg_temp.as_user(donor_a);
  select count(*) into n from public.projects where code like 'DP%';
  assert n = 1, format('donor A should see exactly 1 project, got %s', n);
  assert exists (select 1 from public.projects where code = 'DPA'), 'donor A must see their own project';
  select count(*) into n from public.grants where code in ('GA','GB');
  assert n = 1, format('donor A should see exactly their own grant, got %s', n);
  select count(*) into n from public.organizations where name like '%(test)';
  assert n = 1, format('donor A should see only their own organisation, got %s', n);

  -- 2. Only PUBLISHED reports of their own grant
  select count(*) into n from public.donor_reports;
  assert n = 1, format('donor A should see only the 1 published report of their grant, got %s', n);
  select count(*) into n from public.donor_reports where status = 'draft';
  assert n = 0, 'donor A must not see draft reports';

  -- 3. Results information that is shared with donors by design
  select count(*) into n from public.logframe_nodes;
  assert n = 1, format('donor A should see the logframe of their own project only, got %s', n);
  select count(*) into n from public.budget_lines;
  assert n = 1, format('donor A should see the budget lines of their own project only, got %s', n);

  -- 4. SKB's internal working data stays internal
  select count(*) into n from public.tasks;            assert n = 0, format('donor must not see tasks, got %s', n);
  select count(*) into n from public.documents;        assert n = 0, format('donor must not see documents, got %s', n);
  select count(*) into n from public.field_reports;    assert n = 0, format('donor must not see raw field reports, got %s', n);
  select count(*) into n from public.expenses;         assert n = 0, format('donor must not see expense claims, got %s', n);
  select count(*) into n from public.purchase_requests;assert n = 0, format('donor must not see purchase requests, got %s', n);
  select count(*) into n from public.stage_gate_items; assert n = 0, format('donor must not see stage gates, got %s', n);
  select count(*) into n from public.project_stage_history; assert n = 0, format('donor must not see stage history, got %s', n);
  select count(*) into n from public.beneficiaries;    assert n = 0, format('donor must not see beneficiaries, got %s', n);
  select count(*) into n from public.audit_log;        assert n = 0, format('donor must not see the audit log, got %s', n);
  select count(*) into n from public.profiles where id::text like '91000000-%';
  assert n = 1, format('donor must see only their own profile, got %s', n);
  select count(*) into n from public.user_roles where user_id::text like '91000000-%';
  assert n = 1, format('donor must see only their own role, got %s', n);
  select count(*) into n from public.user_project_access;
  assert n = 0, format('donor must not see staff project assignments, got %s', n);
  select count(*) into n from public.community_posts;  assert n = 0, 'donor must not see community posts';
  select count(*) into n from public.vendors;          assert n = 0, 'donor must not see vendors';
  execute 'reset role';

  -- 5. Donor A can never write
  perform pg_temp.as_user(donor_a);
  update public.projects set title = 'hacked' where code = 'DPA';
  get diagnostics n = row_count;
  assert n = 0, 'donor must not update projects';
  update public.grants set title = 'hacked' where code = 'GA';
  get diagnostics n = row_count;
  assert n = 0, 'donor must not update grants';
  update public.donor_reports set status = 'draft';
  get diagnostics n = row_count;
  assert n = 0, 'donor must not change donor reports';
  denied := false;
  begin
    insert into public.tasks (project_id, title) values ('93000000-0000-0000-0000-00000000000a','donor task');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'donor must not create tasks';
  denied := false;
  begin
    insert into public.projects (code, title, created_by) values ('DP-NEW','Donor project', donor_a::uuid);
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'donor must not create projects';
  denied := false;
  begin
    insert into public.user_project_access (user_id, project_id)
    values (donor_a::uuid, '93000000-0000-0000-0000-00000000000b');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'donor must not give themselves access to another project';
  execute 'reset role';

  -- 6. Donor B is isolated the other way round
  perform pg_temp.as_user(donor_b);
  select count(*) into n from public.projects where code like 'DP%';
  assert n = 1 and exists (select 1 from public.projects where code = 'DPB'), 'donor B should see only their own project';
  select count(*) into n from public.donor_reports;
  assert n = 1, format('donor B should see only their own published report, got %s', n);
  select count(*) into n from public.tasks;
  assert n = 0, 'donor B must not see tasks';
  execute 'reset role';

  -- 7. A deactivated donor and a donor without an organisation see nothing
  perform pg_temp.as_user('91000000-0000-0000-0000-000000000003');
  select count(*) into n from public.projects where code like 'DP%';
  assert n = 0, format('deactivated donor must see no projects, got %s', n);
  select count(*) into n from public.donor_reports;
  assert n = 0, 'deactivated donor must see no reports';
  execute 'reset role';
  perform pg_temp.as_user('91000000-0000-0000-0000-000000000005');
  select count(*) into n from public.projects where code like 'DP%';
  assert n = 0, format('donor without an organisation must see no projects, got %s', n);
  select count(*) into n from public.donor_reports;
  assert n = 0, 'donor without an organisation must see no reports';
  execute 'reset role';

  -- 8. Control: the assigned Program Officer still has full working access to THEIR project
  perform pg_temp.as_user('91000000-0000-0000-0000-000000000004');
  select count(*) into n from public.tasks;
  assert n = 1, format('assigned officer should still see the task of their project, got %s', n);
  select count(*) into n from public.documents;
  assert n = 1, format('assigned officer should still see the document of their project, got %s', n);
  select count(*) into n from public.field_reports;
  assert n = 1, format('assigned officer should still see the field report of their project, got %s', n);
  select count(*) into n from public.expenses;
  assert n = 1, format('assigned officer should still see the expense of their project, got %s', n);
  select count(*) into n from public.purchase_requests;
  assert n = 1, format('assigned officer should still see the purchase request, got %s', n);
  select count(*) into n from public.stage_gate_items;
  assert n = 1, format('assigned officer should still see stage gates, got %s', n);
  execute 'reset role';
end $$;

select 'ALL DONOR ISOLATION RLS CHECKS PASSED' as result;
rollback;
