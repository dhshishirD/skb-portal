-- rls_finance_procurement.sql - proves the 0028 rules for expense claims, approvals, vendors,
-- purchase requests, quotations and purchase orders. One transaction, rolled back; any failed
-- assert raises an error. LOCAL / STAGING Supabase only.
begin;

insert into public.organizations (id, name, type) values
  ('f0000000-0000-0000-0000-0000000000a1','SKB (test)','internal'),
  ('f0000000-0000-0000-0000-0000000000d1','Donor (test)','donor'),
  ('f0000000-0000-0000-0000-0000000000e1','Partner (test)','implementing_partner');
insert into auth.users (id) values
  ('f1000000-0000-0000-0000-000000000001'), -- executive
  ('f1000000-0000-0000-0000-000000000002'), -- programme manager
  ('f1000000-0000-0000-0000-000000000003'), -- finance
  ('f1000000-0000-0000-0000-000000000004'), -- procurement
  ('f1000000-0000-0000-0000-000000000005'), -- project officer (claimant / requester)
  ('f1000000-0000-0000-0000-000000000006'), -- field officer (colleague)
  ('f1000000-0000-0000-0000-000000000007'), -- partner
  ('f1000000-0000-0000-0000-000000000008'), -- donor
  ('f1000000-0000-0000-0000-000000000009'), -- project officer on ANOTHER project
  ('f1000000-0000-0000-0000-00000000000a'); -- second finance (for separation of duties)
update public.profiles set org_id = 'f0000000-0000-0000-0000-0000000000a1' where id::text like 'f1000000-%';
update public.profiles set org_id = 'f0000000-0000-0000-0000-0000000000e1' where id = 'f1000000-0000-0000-0000-000000000007';
update public.profiles set org_id = 'f0000000-0000-0000-0000-0000000000d1' where id = 'f1000000-0000-0000-0000-000000000008';
insert into public.user_roles (user_id, role) values
  ('f1000000-0000-0000-0000-000000000001','executive'),
  ('f1000000-0000-0000-0000-000000000002','programme_manager'),
  ('f1000000-0000-0000-0000-000000000003','finance'),
  ('f1000000-0000-0000-0000-000000000004','procurement'),
  ('f1000000-0000-0000-0000-000000000005','project_officer'),
  ('f1000000-0000-0000-0000-000000000006','field_officer'),
  ('f1000000-0000-0000-0000-000000000007','partner'),
  ('f1000000-0000-0000-0000-000000000008','donor'),
  ('f1000000-0000-0000-0000-000000000009','project_officer'),
  ('f1000000-0000-0000-0000-00000000000a','finance');
insert into public.grants (id, code, title, donor_org_id, total_amount) values
  ('f2000000-0000-0000-0000-00000000000a','FG','Finance grant','f0000000-0000-0000-0000-0000000000d1',1000);
insert into public.projects (id, code, title, grant_id, created_by) values
  ('f3000000-0000-0000-0000-00000000000a','FP-1','Finance project','f2000000-0000-0000-0000-00000000000a','f1000000-0000-0000-0000-000000000001'),
  ('f3000000-0000-0000-0000-00000000000b','FP-2','Other project',null,'f1000000-0000-0000-0000-000000000009');
insert into public.user_project_access (user_id, project_id) values
  ('f1000000-0000-0000-0000-000000000002','f3000000-0000-0000-0000-00000000000a'),
  ('f1000000-0000-0000-0000-000000000003','f3000000-0000-0000-0000-00000000000a'),
  ('f1000000-0000-0000-0000-000000000004','f3000000-0000-0000-0000-00000000000a'),
  ('f1000000-0000-0000-0000-000000000005','f3000000-0000-0000-0000-00000000000a'),
  ('f1000000-0000-0000-0000-000000000006','f3000000-0000-0000-0000-00000000000a'),
  ('f1000000-0000-0000-0000-000000000007','f3000000-0000-0000-0000-00000000000a'),
  ('f1000000-0000-0000-0000-00000000000a','f3000000-0000-0000-0000-00000000000a');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute 'set local role authenticated';
end $$;

do $$
declare
  ed  text := 'f1000000-0000-0000-0000-000000000001';
  pm  text := 'f1000000-0000-0000-0000-000000000002';
  fin text := 'f1000000-0000-0000-0000-000000000003';
  pr  text := 'f1000000-0000-0000-0000-000000000004';
  po  text := 'f1000000-0000-0000-0000-000000000005';
  fo  text := 'f1000000-0000-0000-0000-000000000006';
  pt  text := 'f1000000-0000-0000-0000-000000000007';
  dn  text := 'f1000000-0000-0000-0000-000000000008';
  oth text := 'f1000000-0000-0000-0000-000000000009';
  fin2 text := 'f1000000-0000-0000-0000-00000000000a';
  pid uuid := 'f3000000-0000-0000-0000-00000000000a';
  oid uuid := 'f3000000-0000-0000-0000-00000000000b';
  ex uuid; ex2 uuid; req uuid; req2 uuid; v1 uuid; v2 uuid; v3 uuid; q1 uuid; q2 uuid; q3 uuid;
  n int; denied boolean; st text;
begin
  ---------------------------------------------------------------- EXPENSES
  -- 1. The claimant files a claim; it starts 'submitted' in their own name
  perform pg_temp.as_user(po);
  insert into public.expenses (project_id, amount, expense_date, description, vendor_name)
    values (pid, 12500, current_date, 'Nursery seedlings', 'Test Nursery') returning id into ex;
  assert (select status from public.expenses where id = ex) = 'submitted', 'a new claim is submitted';
  assert (select claimant_id from public.expenses where id = ex) = po::uuid, 'claimant is the signed-in user';

  -- forged status / claimant / dates / currency are refused
  denied := false;
  begin insert into public.expenses (project_id, amount, expense_date, description, status)
    values (pid, 1, current_date, 'Pre-paid', 'paid');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a claim cannot be inserted already paid';
  denied := false;
  begin insert into public.expenses (project_id, amount, expense_date, description, claimant_id)
    values (pid, 1, current_date, 'In someone else''s name', fo::uuid);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a claim cannot be filed as another person';
  denied := false;
  begin insert into public.expenses (project_id, amount, expense_date, description)
    values (pid, 1, current_date + 3, 'Future dated');
  exception when others then denied := true; end;
  assert denied, 'a future expense date is refused';
  -- tomorrow is allowed (UTC database, Bangladesh is UTC+6); the insert is rolled back by the inner block
  begin
    insert into public.expenses (project_id, amount, expense_date, description)
      values (pid, 1, current_date + 1, 'Dated tomorrow in UTC');
    raise exception 'inserted_ok' using errcode = 'P0001';
  exception when sqlstate 'P0001' then null;
  end;
  denied := false;
  begin insert into public.expenses (project_id, amount, expense_date, description, currency, fx_rate_to_bdt)
    values (pid, 1, current_date, 'Zero rate', 'EUR', 0);
  exception when check_violation then denied := true; end;
  assert denied, 'fx rate must be above zero';
  -- a project the person cannot reach
  denied := false;
  begin insert into public.expenses (project_id, amount, expense_date, description)
    values (oid, 1, current_date, 'Wrong project');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'no claims on a project without access';
  -- no edit, no delete
  denied := false;
  begin update public.expenses set amount = 1 where id = ex;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the claimant cannot edit a filed claim';
  denied := false;
  begin delete from public.expenses where id = ex;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'nobody deletes a claim';
  execute 'reset role';

  -- 2. Who can see the claim
  perform pg_temp.as_user(fo);
  select count(*) into n from public.expenses where id = ex;
  assert n = 0, 'a field officer colleague must not see another person''s claim';
  execute 'reset role';
  perform pg_temp.as_user(pt);
  select count(*) into n from public.expenses;
  assert n = 0, 'a partner must not see expense claims';
  execute 'reset role';
  perform pg_temp.as_user(dn);
  select count(*) into n from public.expenses;
  assert n = 0, 'a donor must not see expense claims';
  execute 'reset role';
  perform pg_temp.as_user(oth);
  select count(*) into n from public.expenses;
  assert n = 0, 'an officer of another project must not see this claim';
  execute 'reset role';
  perform pg_temp.as_user(fin);
  select count(*) into n from public.expenses where id = ex;
  assert n = 1, 'finance sees the project''s claims';
  execute 'reset role';

  -- 3. The approval chain: PM -> Finance -> ED -> paid
  perform pg_temp.as_user(po);
  denied := false;
  begin perform public.act_on_expense(ex, 'approve', null);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the claimant cannot approve (no role, and never their own claim)';
  execute 'reset role';
  perform pg_temp.as_user(fin);
  denied := false;
  begin perform public.act_on_expense(ex, 'approve', null);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'finance cannot skip the Programme Manager step';
  execute 'reset role';
  perform pg_temp.as_user(pm);
  denied := false;
  begin perform public.act_on_expense(ex, 'reject', null);
  exception when others then denied := true; end;
  assert denied, 'rejecting needs a comment';
  assert public.act_on_expense(ex, 'approve', null) = 'pm_approved', 'PM approves step 1';
  denied := false;
  begin perform public.act_on_expense(ex, 'approve', null);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the PM cannot approve the finance step';
  execute 'reset role';
  perform pg_temp.as_user(fin);
  assert public.act_on_expense(ex, 'approve', null) = 'finance_verified', 'finance verifies step 2';
  execute 'reset role';
  perform pg_temp.as_user(ed);
  assert public.act_on_expense(ex, 'approve', null) = 'director_approved', 'ED approves step 3';
  denied := false;
  begin perform public.act_on_expense(ex, 'approve', null);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the ED cannot also pay';
  execute 'reset role';
  perform pg_temp.as_user(fin);
  assert public.act_on_expense(ex, 'approve', null) = 'paid', 'finance marks paid (not the previous approver in a row)';
  select count(*) into n from public.approvals where subject_type = 'expense' and subject_id = ex;
  assert n = 4, format('four approval steps recorded, got %s', n);
  denied := false;
  begin perform public.act_on_expense(ex, 'return', 'too late');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a paid claim is final';
  execute 'reset role';

  -- 4. Approvals are visible only where the claim is visible; nobody writes them directly
  perform pg_temp.as_user(fo);
  select count(*) into n from public.approvals;
  assert n = 0, 'a colleague must not see approval trails of other people''s claims';
  denied := false;
  begin insert into public.approvals (subject_type, subject_id, required_role, status) values ('expense', ex, 'finance', 'approved');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'approvals cannot be inserted directly';
  execute 'reset role';
  perform pg_temp.as_user(po);
  select count(*) into n from public.approvals where subject_id = ex;
  assert n = 4, 'the claimant sees the trail of their own claim';
  execute 'reset role';

  -- 5. Separation of duties with one person holding two roles in a row; cancel and return
  perform pg_temp.as_user(po);
  insert into public.expenses (project_id, amount, expense_date, description)
    values (pid, 500, current_date, 'Second claim') returning id into ex2;
  assert public.act_on_expense(ex2, 'cancel', null) = 'cancelled', 'the claimant cancels an untouched claim';
  insert into public.expenses (project_id, amount, expense_date, description)
    values (pid, 700, current_date, 'Third claim') returning id into ex2;
  execute 'reset role';
  perform pg_temp.as_user(pm);
  assert public.act_on_expense(ex2, 'return', 'receipt missing') = 'returned', 'the PM returns with a comment';
  execute 'reset role';

  ---------------------------------------------------------------- VENDORS
  perform pg_temp.as_user(po);
  denied := false;
  begin insert into public.vendors (name) values ('Officer Vendor');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a project officer cannot add vendors';
  execute 'reset role';
  perform pg_temp.as_user(pr);
  insert into public.vendors (name, phone) values ('Vendor One', '01700000001') returning id into v1;
  insert into public.vendors (name) values ('Vendor Two') returning id into v2;
  insert into public.vendors (name) values ('Vendor Three') returning id into v3;
  denied := false;
  begin insert into public.vendors (name) values ('  vendor one ');
  exception when unique_violation then denied := true; end;
  assert denied, 'duplicate vendor names are refused';
  denied := false;
  begin update public.vendors set is_blacklisted = true where id = v3;
  exception when check_violation then denied := true; end;
  assert denied, 'blacklisting needs a reason';
  update public.vendors set is_blacklisted = true, blacklist_reason = 'Delivered fake goods' where id = v3;
  denied := false;
  begin update public.vendors set is_blacklisted = false where id = v3;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'procurement cannot lift a blacklist';
  denied := false;
  begin delete from public.vendors where id = v1;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'vendors are never deleted';
  execute 'reset role';
  perform pg_temp.as_user(fo);
  select count(*) into n from public.vendors;
  assert n = 0, 'a field officer must not read vendor contacts';
  execute 'reset role';
  perform pg_temp.as_user(ed);
  update public.vendors set is_blacklisted = false where id = v3;
  assert (select blacklist_reason from public.vendors where id = v3) is null, 'lifting clears the reason';
  update public.vendors set is_blacklisted = true, blacklist_reason = 'Fake goods again' where id = v3;
  execute 'reset role';

  ---------------------------------------------------------------- PURCHASE REQUESTS
  perform pg_temp.as_user(po);
  denied := false;
  begin insert into public.purchase_requests (project_id, description, estimated_amount, status)
    values (pid, 'Pre-approved', 80000, 'approved');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a request cannot be inserted already approved';
  insert into public.purchase_requests (project_id, description, estimated_amount)
    values (pid, 'Generator for the centre', 80000) returning id into req;
  assert (select status from public.purchase_requests where id = req) = 'draft', 'a new request is a draft';
  denied := false;
  begin update public.purchase_requests set status = 'approved' where id = req;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'status cannot be changed by a direct update';
  update public.purchase_requests set estimated_amount = 90000 where id = req;
  assert (select estimated_amount from public.purchase_requests where id = req) = 90000, 'a draft can be edited by its requester';
  assert public.act_on_purchase_request(req, 'submit') = 'submitted', 'requester submits';
  update public.purchase_requests set estimated_amount = 1 where id = req;
  get diagnostics n = row_count;
  assert n = 0, 'a submitted request cannot be edited';
  execute 'reset role';

  perform pg_temp.as_user(fo);
  select count(*) into n from public.purchase_requests;
  assert n = 0, 'a colleague must not see another person''s purchase request';
  execute 'reset role';
  perform pg_temp.as_user(pt);
  select count(*) into n from public.purchase_requests;
  assert n = 0, 'a partner must not see purchase requests';
  execute 'reset role';
  perform pg_temp.as_user(dn);
  select count(*) into n from public.purchase_requests;
  assert n = 0, 'a donor must not see purchase requests';
  execute 'reset role';

  -- 6. Quotations: 3 DIFFERENT, non-blacklisted vendors from BDT 50,000
  perform pg_temp.as_user(po);
  denied := false;
  begin insert into public.quotations (purchase_request_id, vendor_id, amount) values (req, v1, 80000);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'only Procurement adds quotations';
  execute 'reset role';
  perform pg_temp.as_user(pr);
  insert into public.quotations (purchase_request_id, vendor_id, amount) values (req, v1, 80000) returning id into q1;
  insert into public.quotations (purchase_request_id, vendor_id, amount) values (req, v2, 75000) returning id into q2;
  denied := false;
  begin insert into public.quotations (purchase_request_id, vendor_id, amount) values (req, v1, 70000);
  exception when unique_violation then denied := true; end;
  assert denied, 'the same vendor cannot be quoted twice (fake competition)';
  denied := false;
  begin insert into public.quotations (purchase_request_id, vendor_id, amount) values (req, v3, 10000);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a blacklisted vendor cannot be quoted';
  denied := false;
  begin insert into public.quotations (purchase_request_id, vendor_id, amount, is_selected) values (req, v3, 1, true);
  exception when others then denied := true; end;
  assert denied, 'a quotation cannot be pre-selected';
  denied := false;
  begin perform public.act_on_purchase_request(req, 'ready');
  exception when others then denied := true; end;
  assert denied, 'two vendors are not enough from BDT 50,000';
  execute 'reset role';
  perform pg_temp.as_user(ed);
  update public.vendors set is_blacklisted = false where id = v3;
  execute 'reset role';
  perform pg_temp.as_user(pr);
  insert into public.quotations (purchase_request_id, vendor_id, amount) values (req, v3, 78000) returning id into q3;
  assert public.act_on_purchase_request(req, 'ready') = 'quotations_attached', 'three vendors: ready';
  execute 'reset role';

  -- 7. Approval: not the requester, not without a reason when not the lowest, then the order
  perform pg_temp.as_user(po);
  denied := false;
  begin perform public.act_on_purchase_request(req, 'approve', 'my own', q2);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the requester cannot approve (no role)';
  execute 'reset role';
  perform pg_temp.as_user(pm);
  denied := false;
  begin perform public.act_on_purchase_request(req, 'approve', null, q1);
  exception when others then denied := true; end;
  assert denied, 'a quotation that is not the lowest needs a written reason';
  denied := false;
  begin perform public.act_on_purchase_request(req, 'approve', null, gen_random_uuid());
  exception when others then denied := true; end;
  assert denied, 'the chosen quotation must belong to the request';
  assert public.act_on_purchase_request(req, 'approve', null, q2) = 'approved', 'PM approves the lowest quote';
  assert (select is_selected from public.quotations where id = q2), 'the chosen quotation is marked';
  denied := false;
  begin perform public.act_on_purchase_request(req, 'issue_po');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the PM cannot issue the order';
  execute 'reset role';
  perform pg_temp.as_user(pr);
  denied := false;
  begin update public.quotations set amount = 1 where id = q2;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'an approved request locks its quotations';
  assert public.act_on_purchase_request(req, 'issue_po') = 'po_issued', 'Procurement issues the order';
  assert (select total_amount from public.purchase_orders where purchase_request_id = req) = 75000, 'the order carries the chosen quote';
  denied := false;
  begin insert into public.purchase_orders (purchase_request_id, vendor_id, total_amount) values (req, v1, 1);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'purchase orders cannot be inserted directly';
  execute 'reset role';

  -- 8. Executive threshold (BDT 500,000), and the estimate cannot dodge the quote rule
  perform pg_temp.as_user(po);
  insert into public.purchase_requests (project_id, description, estimated_amount)
    values (pid, 'Vehicle', 600000) returning id into req2;
  perform public.act_on_purchase_request(req2, 'submit');
  execute 'reset role';
  perform pg_temp.as_user(pr);
  insert into public.quotations (purchase_request_id, vendor_id, amount) values (req2, v1, 600000);
  insert into public.quotations (purchase_request_id, vendor_id, amount) values (req2, v2, 610000);
  insert into public.quotations (purchase_request_id, vendor_id, amount) values (req2, v3, 620000) returning id into q3;
  perform public.act_on_purchase_request(req2, 'ready');
  execute 'reset role';
  perform pg_temp.as_user(pm);
  denied := false;
  begin perform public.act_on_purchase_request(req2, 'approve', null, q3);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'from BDT 500,000 the PM cannot approve';
  execute 'reset role';
  perform pg_temp.as_user(po);
  insert into public.purchase_requests (project_id, description, estimated_amount)
    values (pid, 'Understated estimate', 1000) returning id into req;
  perform public.act_on_purchase_request(req, 'submit');
  execute 'reset role';
  perform pg_temp.as_user(pr);
  insert into public.quotations (purchase_request_id, vendor_id, amount) values (req, v1, 90000);
  denied := false;
  begin perform public.act_on_purchase_request(req, 'ready');
  exception when others then denied := true; end;
  assert denied, 'an understated estimate does not avoid the 3-quote rule (the highest quote counts)';
  execute 'reset role';

  -- 9. Anonymous visitors have no access
  execute 'set local role anon';
  denied := false;
  begin perform count(*) from public.expenses;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'anonymous visitors cannot read expenses';
  denied := false;
  begin perform public.act_on_expense(ex, 'approve', null);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'anonymous visitors cannot call act_on_expense';
  execute 'reset role';
end $$;

select 'ALL FINANCE + PROCUREMENT RLS CHECKS PASSED' as result;
rollback;
