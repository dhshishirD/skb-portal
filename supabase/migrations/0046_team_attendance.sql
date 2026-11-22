-- 0046: attendance, step 2 - the team view and corrections, for the Executive Director and the Super Admin only.
--
--   * attendance_team_people()          who is staff (active, with a staff role): names only.
--   * attendance_team_range(from, to)   everybody's check-in / check-out for up to 62 days, WITH the places.
--   * attendance_team_leave(from, to)   the days each person recorded as leave in the work log (counted, not approved).
--   * attendance_correct(...)           change the two times of one person's day, with a written reason (3-500 chars).
-- Every function refuses anyone who is not the Executive Director or the Super Admin (checked here, in the database).
-- A correction cannot be made on your own record. It writes an audit entry with the old and new TIMES and the reason,
-- never the coordinates (the audit log is readable by more roles than may see places).
-- Additive: four functions; no table or policy changes.

create or replace function public.attendance_team_people()
returns table (user_id uuid, full_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_any_role(array['super_admin','executive']::public.app_role[]) then
    raise exception 'only the Executive Director and the Super Admin can see team attendance' using errcode = '42501';
  end if;
  return query
    select p.id, p.full_name
    from public.profiles p
    where p.is_active
      and exists (
        select 1 from public.user_roles ur
        where ur.user_id = p.id
          and ur.role = any (array['super_admin','executive','programme_manager','project_officer','field_officer',
                                   'finance','procurement','me_officer','board','legal_officer','it_officer']::public.app_role[])
      )
    order by p.full_name;
end $$;

create or replace function public.attendance_team_range(_from date, _to date)
returns table (
  user_id uuid, work_date date,
  check_in_at timestamptz, check_in_lat numeric, check_in_lng numeric, check_in_accuracy_m integer, check_in_location_shared boolean,
  check_out_at timestamptz, check_out_lat numeric, check_out_lng numeric, check_out_accuracy_m integer, check_out_location_shared boolean,
  corrected_at timestamptz, correction_reason text
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_any_role(array['super_admin','executive']::public.app_role[]) then
    raise exception 'only the Executive Director and the Super Admin can see team attendance' using errcode = '42501';
  end if;
  if _from is null or _to is null or _to < _from or _to - _from > 62 then
    raise exception 'choose a period of up to 62 days' using errcode = '22023';
  end if;
  return query
    select a.user_id, a.work_date,
           a.check_in_at, a.check_in_lat, a.check_in_lng, a.check_in_accuracy_m, a.check_in_location_shared,
           a.check_out_at, a.check_out_lat, a.check_out_lng, a.check_out_accuracy_m, a.check_out_location_shared,
           a.corrected_at, a.correction_reason
    from public.attendance_logs a
    where a.work_date between _from and _to
    order by a.work_date, a.check_in_at;
end $$;

create or replace function public.attendance_team_leave(_from date, _to date)
returns table (user_id uuid, work_date date)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_any_role(array['super_admin','executive']::public.app_role[]) then
    raise exception 'only the Executive Director and the Super Admin can see team attendance' using errcode = '42501';
  end if;
  if _from is null or _to is null or _to < _from or _to - _from > 62 then
    raise exception 'choose a period of up to 62 days' using errcode = '22023';
  end if;
  return query
    select d.user_id, d.work_date from public.work_days d
    where d.day_type = 'leave' and d.work_date between _from and _to
    order by d.work_date;
end $$;

create or replace function public.attendance_correct(_user uuid, _date date, _check_in timestamptz, _check_out timestamptz, _reason text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  reason text := btrim(coalesce(_reason, ''));
  old_row public.attendance_logs%rowtype;
  had boolean;
begin
  if me is null or not public.has_any_role(array['super_admin','executive']::public.app_role[]) then
    raise exception 'only the Executive Director and the Super Admin can correct attendance' using errcode = '42501';
  end if;
  if _user = me then
    raise exception 'you cannot correct your own attendance' using errcode = '42501';
  end if;
  if char_length(reason) not between 3 and 500 then
    raise exception 'write the reason (3 to 500 characters)' using errcode = '22023';
  end if;
  if _date is null or _date > public.dhaka_today() then
    raise exception 'choose a day that is not in the future' using errcode = '22023';
  end if;
  if _check_in is null then
    raise exception 'a check-in time is needed' using errcode = '22023';
  end if;
  if (_check_in at time zone 'Asia/Dhaka')::date <> _date
     or (_check_out is not null and (_check_out at time zone 'Asia/Dhaka')::date <> _date) then
    raise exception 'the times must be on the chosen day' using errcode = '22023';
  end if;
  if _check_out is not null and _check_out < _check_in then
    raise exception 'check-out cannot be before check-in' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles p where p.id = _user and p.is_active) then
    raise exception 'that person is not an active user' using errcode = '22023';
  end if;

  select * into old_row from public.attendance_logs where user_id = _user and work_date = _date;
  had := found;

  if had then
    update public.attendance_logs set
      check_in_at = _check_in, check_out_at = _check_out,
      corrected_by = me, corrected_at = now(), correction_reason = reason
    where id = old_row.id;
  else
    insert into public.attendance_logs (user_id, work_date, check_in_at, check_out_at, corrected_by, corrected_at, correction_reason)
    values (_user, _date, _check_in, _check_out, me, now(), reason);
  end if;

  -- audit entry: times and reason only, never coordinates
  insert into public.audit_log (actor_id, table_name, record_id, action, old_data, new_data)
  values (
    me, 'attendance_logs', _user::text || ':' || _date::text, case when had then 'UPDATE' else 'INSERT' end,
    case when had then jsonb_build_object('user_id', _user, 'work_date', _date, 'check_in_at', old_row.check_in_at, 'check_out_at', old_row.check_out_at) end,
    jsonb_build_object('user_id', _user, 'work_date', _date, 'check_in_at', _check_in, 'check_out_at', _check_out, 'reason', reason)
  );
end $$;

revoke execute on function public.attendance_team_people() from public, anon;
revoke execute on function public.attendance_team_range(date, date) from public, anon;
revoke execute on function public.attendance_team_leave(date, date) from public, anon;
revoke execute on function public.attendance_correct(uuid, date, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.attendance_team_people() to authenticated;
grant execute on function public.attendance_team_range(date, date) to authenticated;
grant execute on function public.attendance_team_leave(date, date) to authenticated;
grant execute on function public.attendance_correct(uuid, date, timestamptz, timestamptz, text) to authenticated;
