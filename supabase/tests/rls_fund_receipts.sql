-- rls_fund_receipts.sql - proves the 0017 rules for fund receipts.
-- One transaction, rolled back; any failed assert raises an error. LOCAL / STAGING Supabase only.
begin;

insert into public.organizations (id, name, type) values
  ('c0000000-0000-0000-0000-0000000000a1','SKB (test)','internal'),
  ('c0000000-0000-0000-0000-0000000000d1','Donor (test)','donor');
insert into auth.users (id) values
  ('c1000000-0000-0000-0000-000000000001'), -- executive
  ('c1000000-0000-0000-0000-000000000002'), -- officer A (creator)
  ('c1000000-0000-0000-0000-000000000003'), -- officer B (never assigned)
  ('c1000000-0000-0000-0000-000000000004'), -- board
  ('c1000000-0000-0000-0000-000000000005'), -- donor
  ('c1000000-0000-0000-0000-000000000006'), -- finance (assigned)
  ('c1000000-0000-0000-0000-000000000007'); -- field officer (assigned)
update public.profiles set org_id = 'c0000000-0000-0000-0000-0000000000a1' where id::text like 'c1000000-%' and id::text not like '%05';
update public.profiles set org_id = 'c0000000-0000-0000-0000-0000000000d1' where id = 'c1000000-0000-0000-0000-000000000005';
insert into public.user_roles (user_id, role) values
  ('c1000000-0000-0000-0000-000000000001','executive'),
  ('c1000000-0000-0000-0000-000000000002','project_officer'),
  ('c1000000-0000-0000-0000-000000000003','project_officer'),
  ('c1000000-0000-0000-0000-000000000004','board'),
  ('c1000000-0000-0000-0000-000000000005','donor'),
  ('c1000000-0000-0000-0000-000000000006','finance'),
  ('c1000000-0000-0000-0000-000000000007','field_officer');
insert into public.grants (id, code, title, donor_org_id, total_amount) values
  ('c2000000-0000-0000-0000-00000000000a','FG','Receipt grant','c0000000-0000-0000-0000-0000000000d1',1000);
insert into public.projects (id, code, title, grant_id) values
  ('c3000000-0000-0000-0000-00000000000a','FR-DONOR','Donor-funded project','c2000000-0000-0000-0000-00000000000a'),
  ('c3000000-0000-0000-0000-00000000000b','FR-PLAIN','Project for assignments',null);
insert into public.user_project_access (user_id, project_id) values
  ('c1000000-0000-0000-0000-000000000006','c3000000-0000-0000-0000-00000000000b'),
  ('c1000000-0000-0000-0000-000000000007','c3000000-0000-0000-0000-00000000000b');
insert into public.project_fund_receipts (project_id, received_on, amount, currency)
  values ('c3000000-0000-0000-0000-00000000000a', date '2026-10-01', 500, 'EUR');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute 'set local role authenticated';
end $$;

do $$
declare
  ed text := 'c1000000-0000-0000-0000-000000000001';
  a  text := 'c1000000-0000-0000-0000-000000000002';
  b  text := 'c1000000-0000-0000-0000-000000000003';
  bd text := 'c1000000-0000-0000-0000-000000000004';
  dn text := 'c1000000-0000-0000-0000-000000000005';
  fin text := 'c1000000-0000-0000-0000-000000000006';
  fo text := 'c1000000-0000-0000-0000-000000000007';
  dpid uuid := 'c3000000-0000-0000-0000-00000000000a';
  ppid uuid := 'c3000000-0000-0000-0000-00000000000b';
  pid uuid; r1 uuid; r2 uuid; n int; denied boolean;
begin
  -- 1. Officer A (creator) records two instalments
  perform pg_temp.as_user(a);
  insert into public.projects (code, title, created_by) values ('FR-1','Receipt project', a::uuid) returning id into pid;
  insert into public.project_fund_receipts (project_id, received_on, amount, currency, reference, from_name)
    values (pid, date '2026-10-05', 5000, 'EUR', 'TT-1', 'IHH South Asia Desk') returning id into r1;
  insert into public.project_fund_receipts (project_id, received_on, amount, currency)
    values (pid, date '2026-10-20', 5000, 'EUR') returning id into r2;
  select count(*) into n from public.project_fund_receipts where project_id = pid;
  assert n = 2, format('officer A should see 2 receipts, got %s', n);
  assert (select created_by from public.project_fund_receipts where id = r1) = a::uuid, 'created_by is the signed-in user';
  assert (select ack_status from public.project_fund_receipts where id = r1) = 'not_sent', 'acknowledgement starts as not_sent';

  -- created_by cannot be faked
  denied := false;
  begin insert into public.project_fund_receipts (project_id, received_on, amount, currency, created_by)
    values (pid, date '2026-10-06', 10, 'EUR', b::uuid);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'created_by must be the signed-in user';

  -- invalid values refused
  denied := false;
  begin insert into public.project_fund_receipts (project_id, received_on, amount, currency) values (pid, date '2026-10-06', 0, 'EUR');
  exception when check_violation then denied := true; end;
  assert denied, 'amount must be above zero';
  denied := false;
  begin insert into public.project_fund_receipts (project_id, received_on, amount, currency) values (pid, date '2026-10-06', 10, 'eur');
  exception when check_violation then denied := true; end;
  assert denied, 'currency must be 3 capital letters';
  denied := false;
  begin update public.project_fund_receipts set ack_status = 'maybe' where id = r1;
  exception when check_violation then denied := true; end;
  assert denied, 'ack_status must be a known value';

  -- acknowledgement status can be moved on; a receipt cannot move to another project
  update public.project_fund_receipts set ack_status = 'sent' where id = r1;
  assert (select ack_status from public.project_fund_receipts where id = r1) = 'sent', 'ack status updated';
  denied := false;
  begin update public.project_fund_receipts set project_id = dpid where id = r1;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a receipt cannot move to another project';

  -- an officer may not delete a money record
  delete from public.project_fund_receipts where id = r2;
  get diagnostics n = row_count;
  assert n = 0, 'officer must not delete a receipt';
  execute 'reset role';

  -- 2. Officer B (never assigned) sees and does nothing
  perform pg_temp.as_user(b);
  select count(*) into n from public.project_fund_receipts where project_id = pid;
  assert n = 0, format('unassigned officer must see no receipts, got %s', n);
  denied := false;
  begin insert into public.project_fund_receipts (project_id, received_on, amount, currency, created_by)
    values (pid, date '2026-10-07', 10, 'EUR', b::uuid);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'unassigned officer must not record a receipt';
  update public.project_fund_receipts set amount = 1 where id = r1;
  get diagnostics n = row_count;
  assert n = 0, 'unassigned officer must not change a receipt';
  execute 'reset role';

  -- 3. Finance (assigned) records and may delete; a field officer (assigned) may only read
  perform pg_temp.as_user(fin);
  insert into public.project_fund_receipts (project_id, received_on, amount, currency)
    values (ppid, date '2026-10-08', 100, 'EUR') returning id into r1;
  delete from public.project_fund_receipts where id = r1;
  get diagnostics n = row_count;
  assert n = 1, 'finance may delete a receipt';
  insert into public.project_fund_receipts (project_id, received_on, amount, currency)
    values (ppid, date '2026-10-09', 100, 'EUR') returning id into r1;
  execute 'reset role';
  perform pg_temp.as_user(fo);
  select count(*) into n from public.project_fund_receipts where project_id = ppid;
  assert n = 1, 'field officer sees receipts of an assigned project';
  denied := false;
  begin insert into public.project_fund_receipts (project_id, received_on, amount, currency, created_by)
    values (ppid, date '2026-10-10', 10, 'EUR', fo::uuid);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'field officer must not record a receipt';
  execute 'reset role';

  -- 4. Executive Director can edit and delete anywhere
  perform pg_temp.as_user(ed);
  update public.project_fund_receipts set note = 'checked' where id = r1;
  get diagnostics n = row_count;
  assert n = 1, 'executive may edit';
  execute 'reset role';

  -- 5. Board read-only; donor sees nothing; anonymous denied
  perform pg_temp.as_user(bd);
  select count(*) into n from public.project_fund_receipts;
  assert n >= 3, format('board should see all receipts, got %s', n);
  denied := false;
  begin insert into public.project_fund_receipts (project_id, received_on, amount, currency, created_by)
    values (pid, date '2026-10-11', 10, 'EUR', bd::uuid);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'board must not write';
  execute 'reset role';
  perform pg_temp.as_user(dn);
  select count(*) into n from public.project_fund_receipts;
  assert n = 0, format('donor must see no receipts, got %s', n);
  execute 'reset role';
  execute 'set local role anon';
  denied := false;
  begin perform 1 from public.project_fund_receipts;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'anonymous must be denied';
  execute 'reset role';

  -- 6. Closed project is frozen
  perform set_config('request.jwt.claims', '', true); -- session with no signed-in user
  update public.projects set stage = 'closed' where id = pid;
  perform pg_temp.as_user(ed);
  denied := false;
  begin update public.project_fund_receipts set note = 'late' where project_id = pid and received_on = date '2026-10-05';
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'closed project receipts are frozen';
  denied := false;
  begin delete from public.project_fund_receipts where project_id = pid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'closed project receipts cannot be deleted';
  execute 'reset role';

  -- 7. The audit log recorded the changes
  select count(*) into n from public.audit_log where table_name = 'project_fund_receipts';
  assert n >= 3, format('audit log should hold receipt changes, got %s', n);
end $$;

select 'ALL FUND RECEIPT RLS CHECKS PASSED' as result;
rollback;
