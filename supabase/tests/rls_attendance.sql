-- rls_attendance.sql - proves the 0045 rules: check in and check out use the database clock and Dhaka's day, once
-- each, only for yourself; a person reads only their own rows and never the coordinates; nobody writes the table
-- directly. One transaction, rolled back. LOCAL / STAGING Supabase only. All values are synthetic test data.
begin;

insert into auth.users (id) values
  ('fc000000-0000-0000-0000-000000000001'), -- field officer
  ('fc000000-0000-0000-0000-000000000002'), -- finance (another staff member)
  ('fc000000-0000-0000-0000-000000000003'); -- donor (not staff)
insert into public.user_roles (user_id, role) values
  ('fc000000-0000-0000-0000-000000000001','field_officer'),
  ('fc000000-0000-0000-0000-000000000002','finance'),
  ('fc000000-0000-0000-0000-000000000003','donor');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute 'set local role authenticated';
end $$;

do $$
declare
  fo text := 'fc000000-0000-0000-0000-000000000001';
  fi text := 'fc000000-0000-0000-0000-000000000002';
  dn text := 'fc000000-0000-0000-0000-000000000003';
  denied boolean; n int;
begin
  -- 1. check out before check in, and a donor, are refused
  perform pg_temp.as_user(fo);
  denied := false;
  begin perform public.attendance_check_out(null, null, null); exception when check_violation then denied := true; end;
  assert denied, 'check-out needs a check-in first';
  perform pg_temp.as_user(dn);
  denied := false;
  begin perform public.attendance_check_in(null, null, null); exception when insufficient_privilege then denied := true; end;
  assert denied, 'only staff can record attendance';

  -- 2. check in with a place; the time is the database clock on Dhaka's day
  perform pg_temp.as_user(fo);
  perform public.attendance_check_in(23.874, 90.399, 25);
  assert (select count(*) from public.attendance_logs) = 1, 'one row for the person';
  assert (select work_date from public.attendance_logs) = public.dhaka_today(), 'the day is the Dhaka day';
  assert (select abs(extract(epoch from (now() - check_in_at))) < 60 from public.attendance_logs), 'the time is the database clock';
  assert (select check_in_location_shared from public.attendance_logs), 'the place was shared';
  assert (select not check_out_location_shared and check_out_at is null from public.attendance_logs), 'not checked out yet';

  denied := false;
  begin perform public.attendance_check_in(null, null, null); exception when unique_violation then denied := true; end;
  assert denied, 'a second check-in on the same day is refused';

  -- 3. check out without a place: allowed, marked as not shared
  perform public.attendance_check_out(null, null, null);
  assert (select check_out_at is not null and not check_out_location_shared from public.attendance_logs), 'checked out, place not shared';
  denied := false;
  begin perform public.attendance_check_out(23.874, 90.399, 10); exception when unique_violation then denied := true; end;
  assert denied, 'a second check-out is refused';

  -- 4. bad places are refused
  perform pg_temp.as_user(fi);
  denied := false;
  begin perform public.attendance_check_in(200, 90, 5); exception when invalid_parameter_value then denied := true; end;
  assert denied, 'a latitude outside -90..90 is refused';
  denied := false;
  begin perform public.attendance_check_in(23.8, null, 5); exception when invalid_parameter_value then denied := true; end;
  assert denied, 'a latitude without a longitude is refused';

  -- 5. reading: only own rows, never the coordinates
  perform pg_temp.as_user(fi);
  assert (select count(*) from public.attendance_logs) = 0, 'another staff member sees none of the first person''s rows';
  perform public.attendance_check_in(null, null, null);
  assert (select count(*) from public.attendance_logs) = 1, 'a person sees their own row';
  assert (select not check_in_location_shared from public.attendance_logs), 'and that no place was shared';
  perform pg_temp.as_user(fo);
  denied := false;
  begin perform check_in_lat from public.attendance_logs; exception when insufficient_privilege then denied := true; end;
  assert denied, 'the coordinates cannot be read through the table';
  denied := false;
  begin perform correction_reason from public.attendance_logs; exception when insufficient_privilege then denied := true; end;
  assert denied, 'correction details cannot be read through the table by the person';

  -- 6. nobody writes the table directly
  denied := false;
  begin insert into public.attendance_logs (user_id, work_date, check_in_at) values (fo::uuid, date '2020-01-01', now());
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a row cannot be inserted directly';
  denied := false;
  begin update public.attendance_logs set check_in_at = now() - interval '5 hours'; exception when insufficient_privilege then denied := true; end;
  assert denied, 'a time cannot be edited directly';
  denied := false;
  begin delete from public.attendance_logs; exception when insufficient_privilege then denied := true; end;
  assert denied, 'a row cannot be deleted directly';
end $$;

rollback;
