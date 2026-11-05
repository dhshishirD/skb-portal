-- rls_project_budget.sql - proves the 0016 rules for the project budget (packages, items, exchange rate).
-- One transaction, rolled back; any failed assert raises an error. LOCAL / STAGING Supabase only.
begin;

insert into public.organizations (id, name, type) values
  ('b0000000-0000-0000-0000-0000000000a1','SKB (test)','internal'),
  ('b0000000-0000-0000-0000-0000000000d1','Donor (test)','donor');
insert into auth.users (id) values
  ('b1000000-0000-0000-0000-000000000001'), -- executive
  ('b1000000-0000-0000-0000-000000000002'), -- officer A (creator, assigned)
  ('b1000000-0000-0000-0000-000000000003'), -- officer B (never assigned)
  ('b1000000-0000-0000-0000-000000000004'), -- board
  ('b1000000-0000-0000-0000-000000000005'); -- donor
update public.profiles set org_id = 'b0000000-0000-0000-0000-0000000000a1' where id::text like 'b1000000-%' and id::text not like '%05';
update public.profiles set org_id = 'b0000000-0000-0000-0000-0000000000d1' where id = 'b1000000-0000-0000-0000-000000000005';
insert into public.user_roles (user_id, role) values
  ('b1000000-0000-0000-0000-000000000001','executive'),
  ('b1000000-0000-0000-0000-000000000002','project_officer'),
  ('b1000000-0000-0000-0000-000000000003','project_officer'),
  ('b1000000-0000-0000-0000-000000000004','board'),
  ('b1000000-0000-0000-0000-000000000005','donor');
insert into public.grants (id, code, title, donor_org_id, total_amount) values
  ('b2000000-0000-0000-0000-00000000000a','BG','Budget grant','b0000000-0000-0000-0000-0000000000d1',1000);
insert into public.projects (id, code, title, grant_id) values
  ('b3000000-0000-0000-0000-00000000000a','BD-DONOR','Donor-funded project','b2000000-0000-0000-0000-00000000000a');
insert into public.project_budget_settings (project_id, packages_count) values ('b3000000-0000-0000-0000-00000000000a', 10);
insert into public.project_budget_items (project_id, name, quantity, unit_price_bdt)
  values ('b3000000-0000-0000-0000-00000000000a', 'Donor project item', 1, 100);

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute 'set local role authenticated';
end $$;

do $$
declare
  ed text := 'b1000000-0000-0000-0000-000000000001';
  a  text := 'b1000000-0000-0000-0000-000000000002';
  b  text := 'b1000000-0000-0000-0000-000000000003';
  bd text := 'b1000000-0000-0000-0000-000000000004';
  dn text := 'b1000000-0000-0000-0000-000000000005';
  dpid uuid := 'b3000000-0000-0000-0000-00000000000a';
  pid uuid; item uuid; one_off uuid; n int; denied boolean;
begin
  -- 1. Officer A (creator) builds the budget: settings, a package item, a one-off line
  perform pg_temp.as_user(a);
  insert into public.projects (code, title, created_by) values ('BD-1','Budget project', a::uuid) returning id into pid;
  insert into public.project_budget_settings (project_id, packages_count, admin_percent) values (pid, 266, 10);
  insert into public.project_budget_items (project_id, kind, group_name, position, name, measure, quantity, unit_price_bdt)
    values (pid, 'per_package', 'Sleeping kit', 1, 'Sleeping mat', 'Pcs', 1, 484) returning id into item;
  insert into public.project_budget_items (project_id, kind, position, name, measure, quantity, unit_price_bdt)
    values (pid, 'one_off', 2, 'Trainer fee', 'Month', 2, 15000) returning id into one_off;
  select count(*) into n from public.project_budget_items where project_id = pid;
  assert n = 2, format('officer A should see 2 items, got %s', n);
  assert (select created_by from public.project_budget_items where id = item) = a::uuid, 'created_by is the signed-in user';
  assert (select rate_set_by from public.project_budget_settings where project_id = pid) is null, 'no rate yet, so no rate_set_by';

  -- created_by cannot be faked
  denied := false;
  begin
    insert into public.project_budget_items (project_id, name, quantity, unit_price_bdt, created_by)
      values (pid, 'Faked author', 1, 10, b::uuid);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'created_by must be the signed-in user';

  -- invalid values are refused
  denied := false;
  begin insert into public.project_budget_items (project_id, name, quantity, unit_price_bdt) values (pid, 'Zero qty', 0, 10);
  exception when check_violation then denied := true; end;
  assert denied, 'quantity must be above zero';
  denied := false;
  begin insert into public.project_budget_items (project_id, name, quantity, unit_price_bdt) values (pid, 'Negative price', 1, -1);
  exception when check_violation then denied := true; end;
  assert denied, 'price cannot be negative';
  denied := false;
  begin insert into public.project_budget_items (project_id, kind, name, quantity, unit_price_bdt) values (pid, 'weird', 'Bad kind', 1, 1);
  exception when check_violation then denied := true; end;
  assert denied, 'kind must be per_package or one_off';
  denied := false;
  begin update public.project_budget_settings set admin_percent = 31 where project_id = pid;
  exception when check_violation then denied := true; end;
  assert denied, 'admin percent is limited to 0-30';

  -- an item cannot be moved to another project
  denied := false;
  begin update public.project_budget_items set project_id = dpid where id = item;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'an item cannot move to another project';

  -- 2. The officer cannot set the exchange rate
  denied := false;
  begin update public.project_budget_settings set exchange_rate = 140, rate_date = current_date where project_id = pid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'officer must not set the exchange rate';
  denied := false;
  begin update public.project_budget_settings set rate_note = 'sneaky' where project_id = pid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'officer must not set the rate note either';
  -- ... but can change the number of packages
  update public.project_budget_settings set packages_count = 270 where project_id = pid;
  assert (select packages_count from public.project_budget_settings where project_id = pid) = 270, 'officer changes packages_count';
  execute 'reset role';

  -- 3. The Executive Director sets the rate; the database records who and when
  perform pg_temp.as_user(ed);
  denied := false;
  begin update public.project_budget_settings set exchange_rate = 140 where project_id = pid;
  exception when check_violation then denied := true; end;
  assert denied, 'a rate needs a date';
  update public.project_budget_settings
    set exchange_rate = 140, rate_date = date '2026-11-05', rate_note = 'Agreed with donor', rate_set_by = a::uuid
    where project_id = pid;
  assert (select exchange_rate from public.project_budget_settings where project_id = pid) = 140, 'rate stored';
  assert (select rate_set_by from public.project_budget_settings where project_id = pid) = ed::uuid, 'rate_set_by is the Executive Director, not what was sent';
  assert (select rate_set_at from public.project_budget_settings where project_id = pid) is not null, 'rate_set_at recorded';
  execute 'reset role';

  -- 4. A later officer edit keeps the rate record intact and cannot forge it
  perform pg_temp.as_user(a);
  update public.project_budget_settings set packages_count = 266, rate_set_by = a::uuid, rate_set_at = now() - interval '5 years' where project_id = pid;
  assert (select rate_set_by from public.project_budget_settings where project_id = pid) = ed::uuid, 'rate_set_by cannot be forged';
  assert (select rate_set_at from public.project_budget_settings where project_id = pid) > now() - interval '1 day', 'rate_set_at cannot be forged';
  assert (select exchange_rate from public.project_budget_settings where project_id = pid) = 140, 'rate unchanged by officer edit';
  execute 'reset role';

  -- 5. Unassigned officer B: no access at all
  perform pg_temp.as_user(b);
  select count(*) into n from public.project_budget_items where project_id = pid;
  assert n = 0, 'unassigned officer must not see items';
  select count(*) into n from public.project_budget_settings where project_id = pid;
  assert n = 0, 'unassigned officer must not see settings';
  denied := false;
  begin insert into public.project_budget_items (project_id, name, quantity, unit_price_bdt) values (pid, 'Intruder', 1, 1);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'unassigned officer must not add items';
  update public.project_budget_items set unit_price_bdt = 1 where id = item;
  get diagnostics n = row_count;
  assert n = 0, 'unassigned officer must not edit items';
  delete from public.project_budget_items where id = item;
  get diagnostics n = row_count;
  assert n = 0, 'unassigned officer must not delete items';
  execute 'reset role';

  -- 6. Board: read-only oversight
  perform pg_temp.as_user(bd);
  select count(*) into n from public.project_budget_items where project_id = pid;
  assert n = 2, format('board reads the items, got %s', n);
  select count(*) into n from public.project_budget_settings where project_id = pid;
  assert n = 1, 'board reads the settings';
  denied := false;
  begin insert into public.project_budget_items (project_id, name, quantity, unit_price_bdt) values (pid, 'Board edit', 1, 1);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'board must not add items';
  update public.project_budget_items set unit_price_bdt = 1 where id = item;
  get diagnostics n = row_count;
  assert n = 0, 'board must not edit items';
  update public.project_budget_settings set packages_count = 1 where project_id = pid;
  get diagnostics n = row_count;
  assert n = 0, 'board must not edit settings';
  execute 'reset role';

  -- 7. Donor: sees nothing, writes nothing (even on their own project)
  perform pg_temp.as_user(dn);
  select count(*) into n from public.project_budget_items;
  assert n = 0, format('donor must not see budget items, got %s', n);
  select count(*) into n from public.project_budget_settings;
  assert n = 0, format('donor must not see budget settings, got %s', n);
  denied := false;
  begin insert into public.project_budget_items (project_id, name, quantity, unit_price_bdt) values (dpid, 'Donor edit', 1, 1);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'donor must not add items';
  execute 'reset role';

  -- 8. Anonymous visitors have no access
  execute 'set local role anon';
  denied := false;
  begin perform 1 from public.project_budget_items;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'anon must not read items';
  denied := false;
  begin perform 1 from public.project_budget_settings;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'anon must not read settings';
  execute 'reset role';

  -- 9. Officer deletes an item they own access to
  perform pg_temp.as_user(a);
  delete from public.project_budget_items where id = one_off;
  get diagnostics n = row_count;
  assert n = 1, 'officer can delete an item of their project';
  execute 'reset role';

  -- 10. A closed project's budget is frozen
  perform set_config('request.jwt.claims', '', true); -- session with no signed-in user
  update public.projects set stage = 'closed' where id = pid;
  perform pg_temp.as_user(a);
  denied := false;
  begin insert into public.project_budget_items (project_id, name, quantity, unit_price_bdt) values (pid, 'Late item', 1, 1);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'no new items on a closed project';
  denied := false;
  begin update public.project_budget_items set unit_price_bdt = 999 where id = item;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'no edits on a closed project';
  denied := false;
  begin delete from public.project_budget_items where id = item;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'no deletes on a closed project';
  denied := false;
  begin update public.project_budget_settings set packages_count = 5 where project_id = pid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'no settings edits on a closed project';
  execute 'reset role';
  perform pg_temp.as_user(ed);
  denied := false;
  begin update public.project_budget_settings set exchange_rate = 150, rate_date = current_date where project_id = pid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'even the Executive Director cannot change the rate of a closed project';
  execute 'reset role';

  -- 11. Everything above is in the audit log
  perform set_config('request.jwt.claims', '', true);
  select count(*) into n from public.audit_log where table_name = 'project_budget_items' and action = 'INSERT';
  assert n >= 2, format('item inserts must be audited, got %s', n);
  select count(*) into n from public.audit_log where table_name = 'project_budget_settings' and action = 'UPDATE';
  assert n >= 2, format('settings updates must be audited, got %s', n);
  select count(*) into n from public.audit_log where table_name = 'project_budget_items' and action = 'DELETE';
  assert n >= 1, 'item deletes must be audited';
end $$;

select 'ALL PROJECT BUDGET RLS CHECKS PASSED' as result;
rollback;
