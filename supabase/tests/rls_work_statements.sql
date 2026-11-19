-- rls_work_statements.sql - proves the 0040 rules for the daily work log and the monthly Work Statement:
-- who may record days, who may read them (and only after the month is submitted), the submit / verify /
-- approve / return steps, the freeze, and the optional saved signature.
-- One transaction, rolled back; any failed assert raises an error. LOCAL / STAGING Supabase only.
-- All values below are synthetic test data.
begin;

insert into auth.users (id) values
  ('e8000000-0000-0000-0000-000000000001'), -- staff member (project officer)
  ('e8000000-0000-0000-0000-000000000002'), -- verifier (programme manager)
  ('e8000000-0000-0000-0000-000000000003'), -- approver (finance)
  ('e8000000-0000-0000-0000-000000000004'), -- executive director
  ('e8000000-0000-0000-0000-000000000005'), -- other staff member (field officer)
  ('e8000000-0000-0000-0000-000000000006'); -- super admin
insert into public.user_roles (user_id, role) values
  ('e8000000-0000-0000-0000-000000000001','project_officer'),
  ('e8000000-0000-0000-0000-000000000002','programme_manager'),
  ('e8000000-0000-0000-0000-000000000003','finance'),
  ('e8000000-0000-0000-0000-000000000004','executive'),
  ('e8000000-0000-0000-0000-000000000005','field_officer'),
  ('e8000000-0000-0000-0000-000000000006','super_admin');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute 'set local role authenticated';
end $$;

-- fills every working day (not Friday / Saturday) of a month for u1, as u1
create or replace function pg_temp.fill_month(m date) returns void language plpgsql as $$
begin
  insert into public.work_days (user_id, work_date, day_type, place, tasks)
  select 'e8000000-0000-0000-0000-000000000001', d::date, 'office', 'Central Office', 'Test work'
  from generate_series(m::timestamp, (m + interval '1 month - 1 day')::timestamp, interval '1 day') d
  where extract(dow from d) not in (5, 6)
  on conflict (user_id, work_date) do nothing;
end $$;

do $$
declare
  u1 text := 'e8000000-0000-0000-0000-000000000001';
  u2 text := 'e8000000-0000-0000-0000-000000000002';
  u3 text := 'e8000000-0000-0000-0000-000000000003';
  u4 text := 'e8000000-0000-0000-0000-000000000004';
  u5 text := 'e8000000-0000-0000-0000-000000000005';
  u6 text := 'e8000000-0000-0000-0000-000000000006';
  m1 date := date_trunc('month', public.dhaka_today() - interval '2 months')::date;
  m2 date := date_trunc('month', public.dhaka_today() - interval '3 months')::date;
  m3 date := date_trunc('month', public.dhaka_today() - interval '4 months')::date;
  stid uuid;
  denied boolean;
  n int;
begin
  -- 1. Only the Super Admin and the Executive Director set the reviewers
  perform pg_temp.as_user(u1);
  denied := false;
  begin insert into public.work_reviewers (user_id, verifier_id, approver_id) values (u1, u2, u3);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a staff member cannot set their own reviewers';
  perform pg_temp.as_user(u6);
  insert into public.work_reviewers (user_id, verifier_id, approver_id) values (u1, u2, u3);
  denied := false;
  begin insert into public.work_reviewers (user_id, verifier_id, approver_id) values (u5, u5, u3);
  exception when check_violation then denied := true; end;
  assert denied, 'nobody verifies their own statement';

  -- 2. A person records their own days only, never for a future date
  perform pg_temp.as_user(u1);
  insert into public.work_days (user_id, work_date, day_type, tasks) values (u1, m1, 'office', 'first day');
  denied := false;
  begin insert into public.work_days (user_id, work_date, day_type) values (u1, public.dhaka_today() + 1, 'office');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a future date is refused';
  denied := false;
  begin insert into public.work_days (user_id, work_date, day_type) values (u5, m1, 'office');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a day cannot be recorded for someone else';
  update public.work_days set tasks = 'edited' where user_id = u1 and work_date = m1;
  assert (select tasks from public.work_days where user_id = u1 and work_date = m1) = 'edited', 'a person edits their own open day';

  -- 3. Draft: nobody else reads it, not even the reviewers or the Executive Director
  perform pg_temp.as_user(u2);
  assert (select count(*) from public.work_days where user_id = u1) = 0, 'the verifier does not read a draft month';
  perform pg_temp.as_user(u4);
  assert (select count(*) from public.work_days where user_id = u1) = 0, 'the executive does not read a draft month';

  -- 4. Submit needs the month to be over, every working day filled and a reviewer set
  perform pg_temp.as_user(u1);
  insert into public.work_statements (user_id, month) values (u1, m1) returning id into stid;
  denied := false;
  begin update public.work_statements set status = 'submitted' where id = stid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'submitting with missing days is refused';
  perform pg_temp.fill_month(m1);
  update public.work_statements set status = 'submitted' where id = stid;
  assert (select status from public.work_statements where id = stid) = 'submitted', 'the person submits a full month';
  assert (select verifier_id::text from public.work_statements where id = stid) = u2, 'the verifier is copied at submit';
  assert (select approver_id::text from public.work_statements where id = stid) = u3, 'the approver is copied at submit';

  -- 5. Submitted: the month is frozen; reviewers and the executive read it; strangers do not
  denied := false;
  begin update public.work_days set tasks = 'late change' where user_id = u1 and work_date = m1;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a submitted month cannot change';
  perform pg_temp.as_user(u5);
  assert (select count(*) from public.work_days where user_id = u1) = 0, 'another staff member reads nothing';
  assert (select count(*) from public.work_statements where user_id = u1) = 0, 'another staff member sees no statement';
  perform pg_temp.as_user(u2);
  assert (select count(*) from public.work_days where user_id = u1) > 0, 'the verifier reads a submitted month';
  perform pg_temp.as_user(u3);
  assert (select count(*) from public.work_days where user_id = u1) > 0, 'the approver reads a submitted month';
  perform pg_temp.as_user(u4);
  assert (select count(*) from public.work_days where user_id = u1) > 0, 'the executive reads a submitted month';

  -- 6. Steps: own review refused, wrong person refused, order enforced, approved is final
  perform pg_temp.as_user(u1);
  denied := false;
  begin update public.work_statements set status = 'verified' where id = stid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a person cannot verify their own statement';
  perform pg_temp.as_user(u5);
  update public.work_statements set status = 'verified' where id = stid;
  perform pg_temp.as_user(u2);
  assert (select status from public.work_statements where id = stid) = 'submitted', 'a stranger changed nothing';
  perform pg_temp.as_user(u3);
  denied := false;
  begin update public.work_statements set status = 'approved' where id = stid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the approver cannot skip the verifier';
  perform pg_temp.as_user(u2);
  update public.work_statements set status = 'verified' where id = stid;
  assert (select verified_by::text from public.work_statements where id = stid) = u2, 'the verifier is recorded';
  denied := false;
  begin update public.work_statements set status = 'approved' where id = stid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the verifier cannot approve';
  perform pg_temp.as_user(u3);
  update public.work_statements set status = 'approved' where id = stid;
  assert (select approved_by::text from public.work_statements where id = stid) = u3, 'the approver is recorded';
  denied := false;
  begin update public.work_statements set status = 'returned', return_note = 'x' where id = stid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'an approved statement is final';

  -- 7. Return needs a note, reopens the month, and the executive may step in as verifier
  perform pg_temp.as_user(u1);
  perform pg_temp.fill_month(m2);
  insert into public.work_statements (user_id, month) values (u1, m2) returning id into stid;
  update public.work_statements set status = 'submitted' where id = stid;
  perform pg_temp.as_user(u2);
  denied := false;
  begin update public.work_statements set status = 'returned' where id = stid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a return without a note is refused';
  update public.work_statements set status = 'returned', return_note = 'Please correct day 3' where id = stid;
  perform pg_temp.as_user(u1);
  update public.work_days set tasks = 'corrected' where user_id = u1 and work_date = (select min(work_date) from public.work_days where user_id = u1 and work_date >= m2 and work_date < m2 + interval '1 month');
  update public.work_statements set status = 'submitted' where id = stid;
  perform pg_temp.as_user(u4);
  update public.work_statements set status = 'verified' where id = stid;
  assert (select verified_by::text from public.work_statements where id = stid) = u4, 'the executive can step in as verifier';

  -- 8. Saved signature: only the owner reads it; a tick without a saved signature is refused
  perform pg_temp.as_user(u1);
  perform pg_temp.fill_month(m3);
  insert into public.work_statements (user_id, month) values (u1, m3) returning id into stid;
  denied := false;
  begin update public.work_statements set status = 'submitted', signed_prepared = true where id = stid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'signing without a saved signature is refused';
  execute 'reset role';
  insert into public.staff_signatures (user_id, image_path, mime_type) values (u1, 'u1/signature.png', 'image/png');
  perform pg_temp.as_user(u1);
  update public.work_statements set status = 'submitted', signed_prepared = true where id = stid;
  assert (select signed_prepared from public.work_statements where id = stid), 'the tick is kept with a saved signature';
  assert (select count(*) from public.staff_signatures) = 1, 'the owner reads their own signature record';
  perform pg_temp.as_user(u5);
  assert (select count(*) from public.staff_signatures) = 0, 'nobody else reads a signature record';
  perform pg_temp.as_user(u2);
  denied := false;
  begin update public.work_statements set status = 'verified', signed_verified = true where id = stid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the verifier cannot tick a signature they have not saved';
  update public.work_statements set status = 'verified' where id = stid;
  assert not (select signed_verified from public.work_statements where id = stid), 'a step without the tick carries no signature';
  assert (select signed_prepared from public.work_statements where id = stid), 'the earlier signature stays';

  -- 9. The Super Admin may step in as approver (no signature needed), and the statement records who acted
  perform pg_temp.as_user(u6);
  assert (select count(*) from public.work_days where user_id = u1 and work_date >= m3 and work_date < m3 + interval '1 month') > 0, 'the super admin reads a submitted month';
  update public.work_statements set status = 'approved' where id = stid;
  assert (select approved_by::text from public.work_statements where id = stid) = u6, 'the super admin can approve when the approver is away';
  assert not (select signed_approved from public.work_statements where id = stid), 'approving without a signature works';
end $$;

rollback;
