-- rls_attendance_team.sql - proves the 0046 rules: only the Executive Director and the Super Admin read the team's
-- attendance (with places) and correct it; a correction needs a reason, cannot be on your own record, and its audit
-- entry holds times and reason but no coordinates. One transaction, rolled back. LOCAL / STAGING Supabase only.
begin;

insert into auth.users (id) values
  ('fd000000-0000-0000-0000-000000000001'), -- field officer
  ('fd000000-0000-0000-0000-000000000002'), -- executive director
  ('fd000000-0000-0000-0000-000000000003'), -- super admin
  ('fd000000-0000-0000-0000-000000000004'); -- finance
insert into public.user_roles (user_id, role) values
  ('fd000000-0000-0000-0000-000000000001','field_officer'),
  ('fd000000-0000-0000-0000-000000000002','executive'),
  ('fd000000-0000-0000-0000-000000000003','super_admin'),
  ('fd000000-0000-0000-0000-000000000004','finance');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute 'set local role authenticated';
end $$;

do $$
declare
  fo text := 'fd000000-0000-0000-0000-000000000001';
  ed text := 'fd000000-0000-0000-0000-000000000002';
  sa text := 'fd000000-0000-0000-0000-000000000003';
  fi text := 'fd000000-0000-0000-0000-000000000004';
  today date := public.dhaka_today();
  t_in timestamptz := (today::text || ' 09:00+06')::timestamptz;
  t_out timestamptz := (today::text || ' 17:30+06')::timestamptz;
  denied boolean; n int; audit_text text;
begin
  perform pg_temp.as_user(fo);
  perform public.attendance_check_in(23.874, 90.399, 25);

  -- 1. other staff cannot use the team functions
  perform pg_temp.as_user(fi);
  denied := false;
  begin perform * from public.attendance_team_range(today, today); exception when insufficient_privilege then denied := true; end;
  assert denied, 'finance cannot read team attendance';
  denied := false;
  begin perform * from public.attendance_team_people(); exception when insufficient_privilege then denied := true; end;
  assert denied, 'finance cannot list the team';
  denied := false;
  begin perform * from public.attendance_team_leave(today, today); exception when insufficient_privilege then denied := true; end;
  assert denied, 'finance cannot read team leave';
  denied := false;
  begin perform public.attendance_correct(fo::uuid, today, t_in, t_out, 'forgot'); exception when insufficient_privilege then denied := true; end;
  assert denied, 'finance cannot correct';
  perform pg_temp.as_user(fo);
  denied := false;
  begin perform public.attendance_correct(fo::uuid, today, t_in, t_out, 'mine'); exception when insufficient_privilege then denied := true; end;
  assert denied, 'a field officer cannot correct';

  -- 2. the Executive Director reads everyone, with the places
  perform pg_temp.as_user(ed);
  select count(*) into n from public.attendance_team_range(today, today) where user_id = fo::uuid and check_in_lat = 23.874 and check_in_lng = 90.399;
  assert n = 1, 'the ED sees the check-in with its place';
  assert (select count(*) from public.attendance_team_people() where user_id = fo::uuid) = 1, 'the ED sees the staff list';
  denied := false;
  begin perform * from public.attendance_team_range(today - 100, today); exception when invalid_parameter_value then denied := true; end;
  assert denied, 'a period over 62 days is refused';

  -- 3. corrections: reason, own record, day, order
  denied := false;
  begin perform public.attendance_correct(fo::uuid, today, t_in, t_out, ' '); exception when invalid_parameter_value then denied := true; end;
  assert denied, 'a correction needs a reason';
  denied := false;
  begin perform public.attendance_correct(ed::uuid, today, t_in, t_out, 'my own'); exception when insufficient_privilege then denied := true; end;
  assert denied, 'the ED cannot correct their own record';
  denied := false;
  begin perform public.attendance_correct(fo::uuid, today, t_out, t_in, 'wrong order'); exception when invalid_parameter_value then denied := true; end;
  assert denied, 'check-out before check-in is refused';
  denied := false;
  begin perform public.attendance_correct(fo::uuid, today, t_in - interval '1 day', t_out, 'wrong day'); exception when invalid_parameter_value then denied := true; end;
  assert denied, 'times on another day are refused';
  denied := false;
  begin perform public.attendance_correct(fo::uuid, today + 1, t_in + interval '1 day', null, 'future'); exception when invalid_parameter_value then denied := true; end;
  assert denied, 'a future day is refused';

  -- 4. a good correction: times change, the place stays, the audit entry has no coordinates
  perform public.attendance_correct(fo::uuid, today, t_in, t_out, 'Forgot to check out; confirmed by phone');
  select count(*) into n from public.attendance_team_range(today, today)
    where user_id = fo::uuid and check_in_at = t_in and check_out_at = t_out and check_in_lat = 23.874 and correction_reason like 'Forgot%';
  assert n = 1, 'the correction is stored with its reason and the place is kept';
  perform pg_temp.as_user(fo);
  assert (select check_out_at = t_out from public.attendance_logs), 'the person sees the corrected time';

  -- 5. a correction for a day with no row creates it (no place)
  perform pg_temp.as_user(sa);
  perform public.attendance_correct(fo::uuid, today - 1, t_in - interval '1 day', t_out - interval '1 day', 'Was in the field, no phone signal');
  select count(*) into n from public.attendance_team_range(today - 1, today - 1) where user_id = fo::uuid and not check_in_location_shared;
  assert n = 1, 'a missing day can be added, without a place';

  -- 6. leave days are listed
  insert into public.work_days (user_id, work_date, day_type) values (fo::uuid, today - 2, 'leave');
  assert (select count(*) from public.attendance_team_leave(today - 5, today)) = 1, 'the Super Admin sees the leave days';

  -- 7. audit entries exist and hold no coordinates
  reset role;
  select count(*) into n from public.audit_log where table_name = 'attendance_logs' and actor_id in (ed::uuid, sa::uuid);
  assert n = 2, 'two corrections, two audit entries';
  select string_agg(coalesce(old_data::text,'') || new_data::text, ' ') into audit_text from public.audit_log where table_name = 'attendance_logs';
  assert audit_text not like '%lat%' and audit_text not like '%lng%' and audit_text not like '%23.874%', 'no coordinates in the audit log';
end $$;

rollback;
