-- rls_logframe.sql - proves the 0019 rules for the logframe, indicators and indicator values.
-- One transaction, rolled back; any failed assert raises an error. LOCAL / STAGING Supabase only.
begin;

insert into public.organizations (id, name, type) values
  ('e0000000-0000-0000-0000-0000000000a1','SKB (test)','internal'),
  ('e0000000-0000-0000-0000-0000000000d1','Donor (test)','donor');
insert into auth.users (id) values
  ('e1000000-0000-0000-0000-000000000001'), -- executive
  ('e1000000-0000-0000-0000-000000000002'), -- project officer (assigned)
  ('e1000000-0000-0000-0000-000000000003'), -- M&E officer (assigned)
  ('e1000000-0000-0000-0000-000000000004'), -- board
  ('e1000000-0000-0000-0000-000000000005'), -- donor
  ('e1000000-0000-0000-0000-000000000006'), -- field officer (assigned)
  ('e1000000-0000-0000-0000-000000000007'), -- project officer (never assigned)
  ('e1000000-0000-0000-0000-000000000008'); -- programme manager (assigned)
update public.profiles set org_id = 'e0000000-0000-0000-0000-0000000000a1' where id::text like 'e1000000-%' and id::text not like '%05';
update public.profiles set org_id = 'e0000000-0000-0000-0000-0000000000d1' where id = 'e1000000-0000-0000-0000-000000000005';
insert into public.user_roles (user_id, role) values
  ('e1000000-0000-0000-0000-000000000001','executive'),
  ('e1000000-0000-0000-0000-000000000002','project_officer'),
  ('e1000000-0000-0000-0000-000000000003','me_officer'),
  ('e1000000-0000-0000-0000-000000000004','board'),
  ('e1000000-0000-0000-0000-000000000005','donor'),
  ('e1000000-0000-0000-0000-000000000006','field_officer'),
  ('e1000000-0000-0000-0000-000000000007','project_officer'),
  ('e1000000-0000-0000-0000-000000000008','programme_manager');
insert into public.grants (id, code, title, donor_org_id, total_amount) values
  ('e2000000-0000-0000-0000-00000000000a','LG','Logframe grant','e0000000-0000-0000-0000-0000000000d1',1000);
insert into public.projects (id, code, title, grant_id) values
  ('e3000000-0000-0000-0000-00000000000a','LF-DONOR','Donor-funded project','e2000000-0000-0000-0000-00000000000a'),
  ('e3000000-0000-0000-0000-00000000000b','LF-MAIN','Main test project',null),
  ('e3000000-0000-0000-0000-00000000000c','LF-OTHER','Other project',null);
insert into public.user_project_access (user_id, project_id) values
  ('e1000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-00000000000b'),
  ('e1000000-0000-0000-0000-000000000002','e3000000-0000-0000-0000-00000000000b'),
  ('e1000000-0000-0000-0000-000000000003','e3000000-0000-0000-0000-00000000000b'),
  ('e1000000-0000-0000-0000-000000000006','e3000000-0000-0000-0000-00000000000b'),
  ('e1000000-0000-0000-0000-000000000008','e3000000-0000-0000-0000-00000000000b');

-- donor project data (inserted as the database owner: no restrictions)
insert into public.logframe_nodes (id, project_id, kind, code, title) values
  ('e4000000-0000-0000-0000-00000000000a','e3000000-0000-0000-0000-00000000000a','goal','1','Donor goal');
insert into public.indicators (id, node_id, name, unit, target) values
  ('e5000000-0000-0000-0000-00000000000a','e4000000-0000-0000-0000-00000000000a','Donor indicator','people',100);
insert into public.indicator_values (indicator_id, period_start, period_end, value, validated_by, validated_at) values
  ('e5000000-0000-0000-0000-00000000000a','2026-01-01','2026-01-31',10,'e1000000-0000-0000-0000-000000000003', now());
insert into public.indicator_values (indicator_id, period_start, period_end, value) values
  ('e5000000-0000-0000-0000-00000000000a','2026-02-01','2026-02-28',20);

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute 'set local role authenticated';
end $$;

do $$
declare
  ed text := 'e1000000-0000-0000-0000-000000000001';
  po text := 'e1000000-0000-0000-0000-000000000002';
  me text := 'e1000000-0000-0000-0000-000000000003';
  bd text := 'e1000000-0000-0000-0000-000000000004';
  dn text := 'e1000000-0000-0000-0000-000000000005';
  fo text := 'e1000000-0000-0000-0000-000000000006';
  px text := 'e1000000-0000-0000-0000-000000000007';
  pm text := 'e1000000-0000-0000-0000-000000000008';
  pid uuid := 'e3000000-0000-0000-0000-00000000000b';
  other uuid := 'e3000000-0000-0000-0000-00000000000c';
  g uuid; o uuid; u uuid; a uuid; i uuid; i2 uuid; v1 uuid; v2 uuid; v3 uuid;
  n int; denied boolean;
begin
  -- 1. Project officer builds the tree: goal > outcome > output > activity
  perform pg_temp.as_user(po);
  insert into public.logframe_nodes (project_id, kind, code, title) values (pid, 'goal', '1', 'Goal') returning id into g;
  insert into public.logframe_nodes (project_id, parent_id, kind, code, title) values (pid, g, 'outcome', '1.1', 'Outcome') returning id into o;
  insert into public.logframe_nodes (project_id, parent_id, kind, code, title) values (pid, o, 'output', '1.1.1', 'Output') returning id into u;
  insert into public.logframe_nodes (project_id, parent_id, kind, code, title) values (pid, u, 'activity', '1.1.1.1', 'Activity') returning id into a;

  -- wrong level / wrong project / goal with parent
  denied := false;
  begin insert into public.logframe_nodes (project_id, parent_id, kind, code, title) values (pid, g, 'output', '9', 'Skips a level');
  exception when check_violation then denied := true; end;
  assert denied, 'an output cannot sit directly under a goal';
  denied := false;
  begin insert into public.logframe_nodes (project_id, parent_id, kind, code, title) values (pid, g, 'goal', '8', 'Goal with parent');
  exception when check_violation then denied := true; end;
  assert denied, 'a goal has no parent';
  denied := false;
  begin insert into public.logframe_nodes (project_id, parent_id, kind, code, title) values (other, g, 'outcome', '7', 'Wrong project');
  exception when others then denied := true; end;
  assert denied, 'a parent from another project (or a project the user is not on) is refused';

  -- duplicate code, text limits
  denied := false;
  begin insert into public.logframe_nodes (project_id, parent_id, kind, code, title) values (pid, g, 'outcome', '1.1', 'Same code');
  exception when unique_violation then denied := true; end;
  assert denied, 'a code is unique inside a project';
  denied := false;
  begin insert into public.logframe_nodes (project_id, kind, code, title) values (pid, 'goal', 'x', repeat('t', 301));
  exception when check_violation then denied := true; end;
  assert denied, 'title is limited to 300 characters';

  -- level and parent cannot be changed
  denied := false;
  begin update public.logframe_nodes set kind = 'outcome' where id = g;
  exception when others then denied := true; end;
  assert denied, 'the level of an item cannot change';
  update public.logframe_nodes set title = 'Goal renamed' where id = g;
  assert (select title from public.logframe_nodes where id = g) = 'Goal renamed', 'a title can be renamed';

  -- 2. Roles for the structure
  perform pg_temp.as_user(me);
  denied := false;
  begin insert into public.logframe_nodes (project_id, kind, code, title) values (pid, 'goal', 'M', 'By M&E');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the M&E officer cannot change the structure';
  perform pg_temp.as_user(fo);
  denied := false;
  begin insert into public.logframe_nodes (project_id, kind, code, title) values (pid, 'goal', 'F', 'By field');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a field officer cannot change the structure';
  perform pg_temp.as_user(px);
  denied := false;
  begin insert into public.logframe_nodes (project_id, kind, code, title) values (pid, 'goal', 'X', 'Unassigned');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'an officer not on the project cannot add to it';
  assert (select count(*) from public.logframe_nodes where project_id = pid) = 0, 'an unassigned officer cannot read it';

  -- 3. Indicators: project officer and M&E officer may add; field officer may not
  perform pg_temp.as_user(po);
  insert into public.indicators (node_id, name, unit, baseline, target) values (u, 'People reached', 'people', 0, 200) returning id into i;
  perform pg_temp.as_user(me);
  insert into public.indicators (node_id, name, unit, baseline, target, measure) values (o, 'Satisfaction', '%', 20, 80, 'latest') returning id into i2;
  assert (select measure from public.indicators where id = i2) = 'latest', 'measure is stored';
  denied := false;
  begin insert into public.indicators (node_id, name, unit, target) values (o, 'Bad', 'x', -5);
  exception when check_violation then denied := true; end;
  assert denied, 'a target cannot be negative';
  denied := false;
  begin update public.indicators set node_id = g where id = i2;
  exception when others then denied := true; end;
  assert denied, 'an indicator cannot move to another item';
  perform pg_temp.as_user(fo);
  denied := false;
  begin insert into public.indicators (node_id, name, unit, target) values (u, 'By field', 'x', 5);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a field officer cannot add an indicator';

  -- 4. Values: entered by one person, validated by another
  perform pg_temp.as_user(po);
  insert into public.indicator_values (indicator_id, period_start, period_end, value, created_by, validated_by, validated_at)
    values (i, '2026-01-01', '2026-01-31', 50, 'e1000000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000007', now()) returning id into v1;
  assert (select created_by from public.indicator_values where id = v1) = po::uuid, 'created_by is the signed-in user, not what was sent';
  assert (select validated_at from public.indicator_values where id = v1) is null, 'a new value starts unvalidated';
  denied := false;
  begin insert into public.indicator_values (indicator_id, period_start, period_end, value) values (i, '2026-03-01', '2026-02-01', 5);
  exception when check_violation then denied := true; end;
  assert denied, 'a period cannot end before it starts';
  denied := false;
  begin insert into public.indicator_values (indicator_id, period_start, period_end, value) values (i, '2026-03-01', '2026-03-31', -5);
  exception when check_violation then denied := true; end;
  assert denied, 'a value cannot be negative';

  -- the author (project officer) cannot validate: not a validator role
  denied := false;
  begin update public.indicator_values set validated_at = now() where id = v1;
  exception when others then denied := true; end;
  assert denied, 'a project officer cannot validate';

  -- M&E officer who entered a value cannot validate their own entry
  perform pg_temp.as_user(me);
  insert into public.indicator_values (indicator_id, period_start, period_end, value) values (i, '2026-02-01', '2026-02-28', 30) returning id into v2;
  denied := false;
  begin update public.indicator_values set validated_at = now() where id = v2;
  exception when others then denied := true; end;
  assert denied, 'you cannot validate a value you entered yourself';

  -- M&E officer validates the project officer's value; the database fills who and when
  update public.indicator_values set validated_by = po::uuid, validated_at = now() where id = v1;
  assert (select validated_by from public.indicator_values where id = v1) = me::uuid, 'validated_by is the signed-in validator';
  assert (select validated_at from public.indicator_values where id = v1) is not null, 'validated_at is set';

  -- a validated value is frozen
  denied := false;
  begin update public.indicator_values set value = 999 where id = v1;
  exception when others then denied := true; end;
  assert denied, 'a validated value cannot be changed';
  denied := false;
  begin delete from public.indicator_values where id = v1;
  exception when others then denied := true; end;
  assert denied, 'a validated value cannot be deleted';

  -- the programme manager can validate the M&E officer's value
  perform pg_temp.as_user(pm);
  update public.indicator_values set validated_at = now() where id = v2;
  assert (select validated_by from public.indicator_values where id = v2) = pm::uuid, 'programme manager can validate';

  -- an unvalidated value can be deleted by its team
  perform pg_temp.as_user(po);
  insert into public.indicator_values (indicator_id, period_start, period_end, value) values (i, '2026-04-01', '2026-04-30', 5) returning id into v3;
  delete from public.indicator_values where id = v3;
  get diagnostics n = row_count;
  assert n = 1, 'an unvalidated value can be removed';

  -- 5. Donor sees only validated values of the donor project; never other projects
  perform pg_temp.as_user(dn);
  assert (select count(*) from public.indicator_values where indicator_id = 'e5000000-0000-0000-0000-00000000000a') = 1, 'donor sees only the validated value';
  assert (select count(*) from public.indicator_values where indicator_id = i) = 0, 'donor sees nothing from other projects';
  denied := false;
  begin insert into public.indicator_values (indicator_id, period_start, period_end, value)
    values ('e5000000-0000-0000-0000-00000000000a', '2026-05-01', '2026-05-31', 1);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a donor cannot add values';

  -- 6. Board: read-only everywhere
  perform pg_temp.as_user(bd);
  assert (select count(*) from public.indicator_values where indicator_id = i) = 2, 'board reads values of any project';
  denied := false;
  begin insert into public.logframe_nodes (project_id, kind, code, title) values (pid, 'goal', 'B', 'By board');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'board cannot write';

  -- 7. Delete is blocked for people not assigned (RLS: 0 rows) and works for the team (children go too)
  perform pg_temp.as_user(px);
  delete from public.logframe_nodes where id = a;
  get diagnostics n = row_count;
  assert n = 0, 'an unassigned officer deletes nothing';

  -- 8. Audit trail
  perform pg_temp.as_user(ed);
  reset role;
  assert (select count(*) from public.audit_log where table_name = 'indicator_values' and record_id = v1::text) >= 2, 'value changes are in the audit log';

  -- 9. Closed project is frozen
  perform set_config('request.jwt.claims', '', true);
  update public.projects set stage = 'closed' where id = pid;
  perform pg_temp.as_user(po);
  denied := false;
  begin insert into public.logframe_nodes (project_id, kind, code, title) values (pid, 'goal', 'Z', 'After close');
  exception when others then denied := true; end;
  assert denied, 'a closed project logframe is frozen (add)';
  denied := false;
  begin insert into public.indicator_values (indicator_id, period_start, period_end, value) values (i, '2026-06-01', '2026-06-30', 1);
  exception when others then denied := true; end;
  assert denied, 'a closed project logframe is frozen (values)';
  denied := false;
  begin delete from public.logframe_nodes where id = a;
  exception when others then denied := true; end;
  assert denied, 'a closed project logframe is frozen (delete)';
end $$;

rollback;
