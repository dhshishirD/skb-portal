-- rls_stage_gates.sql - proves the 0015 rules for stage gates.
-- One transaction, rolled back; any failed assert raises an error. LOCAL / STAGING Supabase only.
begin;

insert into public.organizations (id, name, type) values ('a0000000-0000-0000-0000-0000000000a1','SKB (test)','internal');
insert into auth.users (id) values
  ('a1000000-0000-0000-0000-000000000001'), -- executive
  ('a1000000-0000-0000-0000-000000000002'), -- officer A (creator)
  ('a1000000-0000-0000-0000-000000000003'), -- officer B (never assigned)
  ('a1000000-0000-0000-0000-000000000004'); -- board
update public.profiles set org_id = 'a0000000-0000-0000-0000-0000000000a1' where id::text like 'a1000000-%';
insert into public.user_roles (user_id, role) values
  ('a1000000-0000-0000-0000-000000000001','executive'),
  ('a1000000-0000-0000-0000-000000000002','project_officer'),
  ('a1000000-0000-0000-0000-000000000003','project_officer'),
  ('a1000000-0000-0000-0000-000000000004','board');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute 'set local role authenticated';
end $$;

do $$
declare
  ed text := 'a1000000-0000-0000-0000-000000000001';
  a  text := 'a1000000-0000-0000-0000-000000000002';
  b  text := 'a1000000-0000-0000-0000-000000000003';
  bd text := 'a1000000-0000-0000-0000-000000000004';
  pid uuid; n int; denied boolean; item uuid; other_item uuid; st public.project_stage;
begin
  -- 1. A new project starts at 'concept' and gets the standard checklist
  perform pg_temp.as_user(a);
  denied := false;
  begin
    insert into public.projects (code, title, stage, created_by) values ('SG-BAD','Starts late','closed', a::uuid);
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'a project cannot be created at a later stage';
  insert into public.projects (code, title, created_by) values ('SG-1','Stage gate project', a::uuid) returning id into pid;
  select count(*) into n from public.stage_gate_items where project_id = pid;
  assert n = (select count(*) from public.stage_gate_templates), format('new project should get the full checklist, got %s', n);
  select count(*) into n from public.stage_gate_items where project_id = pid and stage = 'concept';
  assert n = 5, format('concept checklist should have 5 items, got %s', n);
  execute 'reset role';

  -- 2. Officer ticks an item of the CURRENT stage; the database records who and when
  perform pg_temp.as_user(a);
  select id into item from public.stage_gate_items where project_id = pid and stage = 'concept' order by position limit 1;
  update public.stage_gate_items set done = true, done_by = b::uuid where id = item;
  get diagnostics n = row_count;
  assert n = 1, 'officer must be able to tick an item';
  assert (select done_by from public.stage_gate_items where id = item) = a::uuid, 'done_by must be the person who ticked, not what was sent';
  assert (select done_at from public.stage_gate_items where id = item) is not null, 'done_at must be recorded';
  update public.stage_gate_items set done = false where id = item;
  assert (select done_by from public.stage_gate_items where id = item) is null, 'un-ticking clears done_by';
  denied := false;
  begin update public.stage_gate_items set label = 'Renamed' where id = item;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the label of a gate item must not change';
  select id into other_item from public.stage_gate_items where project_id = pid and stage = 'proposal' limit 1;
  denied := false;
  begin update public.stage_gate_items set done = true where id = other_item;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'items of a later stage cannot be ticked yet';
  execute 'reset role';

  -- 3. Unassigned officer and board cannot tick
  perform pg_temp.as_user(b);
  select count(*) into n from public.stage_gate_items where project_id = pid;
  assert n = 0, 'unassigned officer must not see the checklist';
  update public.stage_gate_items set done = true where id = item;
  get diagnostics n = row_count;
  assert n = 0, 'unassigned officer must not tick';
  execute 'reset role';
  perform pg_temp.as_user(bd);
  select count(*) into n from public.stage_gate_items where project_id = pid;
  assert n > 0, 'board reads the checklist';
  update public.stage_gate_items set done = true where id = item;
  get diagnostics n = row_count;
  assert n = 0, 'board must not tick';
  execute 'reset role';

  -- 4. Nobody changes the stage directly; only the Executive Director through the function
  perform pg_temp.as_user(a);
  denied := false;
  begin update public.projects set stage = 'proposal' where id = pid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'officer must not change the stage directly';
  denied := false;
  begin perform public.advance_project_stage(pid, 'proposal', null);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'officer must not advance a stage';
  execute 'reset role';
  perform pg_temp.as_user(ed);
  denied := false;
  begin update public.projects set stage = 'proposal' where id = pid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'even the Executive Director must go through the stage gate';
  denied := false;
  begin
    insert into public.project_stage_history (project_id, from_stage, to_stage, changed_by) values (pid, 'concept', 'proposal', ed::uuid);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the history cannot be written directly';

  -- 5. Advance rules
  denied := false;
  begin perform public.advance_project_stage(pid, 'proposal', null);
  exception when check_violation then denied := true; end;
  assert denied, 'cannot advance while required items are open';
  update public.stage_gate_items set done = true where project_id = pid and stage = 'concept' and required;
  denied := false;
  begin perform public.advance_project_stage(pid, 'approved', null);
  exception when invalid_parameter_value then denied := true; end;
  assert denied, 'cannot skip a stage';
  st := public.advance_project_stage(pid, 'proposal', 'Concept approved');
  assert st = 'proposal', 'stage advanced';
  assert (select stage from public.projects where id = pid) = 'proposal', 'project is now at proposal';
  select count(*) into n from public.project_stage_history where project_id = pid and from_stage = 'concept' and to_stage = 'proposal' and changed_by = ed::uuid;
  assert n = 1, 'the move is in the history';
  denied := false;
  begin perform public.advance_project_stage(pid, 'concept', null);
  exception when check_violation then denied := true; end;
  assert denied, 'moving back needs a written reason';
  perform public.advance_project_stage(pid, 'concept', 'Donor asked for a new concept note');
  assert (select stage from public.projects where id = pid) = 'concept', 'moved back with a reason';
  select count(*) into n from public.project_stage_history where project_id = pid;
  assert n = 2, format('history should have 2 rows, got %s', n);
  execute 'reset role';

  -- 6. Closed projects: only the Executive Director can reopen, with a reason, one step back (0026)
  perform set_config('request.jwt.claims', '', true); -- back to a session with no signed-in user
  update public.projects set stage = 'closed' where id = pid;
  perform pg_temp.as_user(a);
  denied := false;
  begin perform public.advance_project_stage(pid, 'monitoring_evaluation', 'Reopen please');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'an officer cannot reopen a closed project';
  execute 'reset role';
  perform pg_temp.as_user(ed);
  denied := false;
  begin perform public.advance_project_stage(pid, 'monitoring_evaluation', '  ');
  exception when check_violation then denied := true; end;
  assert denied, 'reopening needs a written reason';
  denied := false;
  begin perform public.advance_project_stage(pid, 'implementation', 'Skip a step');
  exception when invalid_parameter_value then denied := true; end;
  assert denied, 'reopening goes only one step back';
  perform public.advance_project_stage(pid, 'monitoring_evaluation', 'Donor asked us to redo the final report');
  assert (select stage from public.projects where id = pid) = 'monitoring_evaluation', 'reopened';
  assert (select count(*) from public.project_stage_history where project_id = pid and from_stage = 'closed' and note like 'Donor asked%') = 1, 'reopen is in the history';
  execute 'reset role';

  -- 7. The checklist templates are not writable by signed-in users
  perform pg_temp.as_user(ed);
  denied := false;
  begin delete from public.stage_gate_templates;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'templates are managed by migrations only';
  execute 'reset role';
end $$;

select 'ALL STAGE GATE RLS CHECKS PASSED' as result;
rollback;
