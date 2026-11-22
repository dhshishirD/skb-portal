-- 0045: attendance, step 1 - check in and check out with a button.
--
-- Rules (set by the owner; enforced here, not only on the page):
--   * The time is the database clock, never the browser's. The day is the Dhaka day.
--   * A person records only their own attendance, only for today, one check-in and one check-out.
--   * The place (latitude, longitude, accuracy) is recorded with each of the two times when the person allows the
--     browser to share it; otherwise the row says "location not shared" and the time is recorded all the same.
--   * Nobody can read the coordinates through the table: the people who may see places (the Executive Director and
--     the Super Admin) get a read function in step 2. The person sees their own times and whether a place was shared.
--   * Nobody changes a time or a place afterwards from the browser. Corrections (step 2) are for the Executive
--     Director and the Super Admin only, with a written reason; the columns for them exist here.
--   * No audit trigger on this table: the audit log is read by more roles than may see places, so coordinates must
--     never be copied into it. Corrections write their own entry without coordinates (step 2).
-- Additive: one new table and two functions. Leave stays in work_days (day type "leave"); nothing there changes.

create table public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_date date not null,
  check_in_at timestamptz,
  check_in_lat numeric(9,6) check (check_in_lat between -90 and 90),
  check_in_lng numeric(9,6) check (check_in_lng between -180 and 180),
  check_in_accuracy_m integer check (check_in_accuracy_m between 0 and 1000000),
  check_in_location_shared boolean not null default false,
  check_out_at timestamptz,
  check_out_lat numeric(9,6) check (check_out_lat between -90 and 90),
  check_out_lng numeric(9,6) check (check_out_lng between -180 and 180),
  check_out_accuracy_m integer check (check_out_accuracy_m between 0 and 1000000),
  check_out_location_shared boolean not null default false,
  corrected_by uuid references public.profiles(id) on delete set null,
  corrected_at timestamptz,
  correction_reason text check (correction_reason is null or char_length(correction_reason) between 3 and 500),
  created_at timestamptz not null default now(),
  unique (user_id, work_date),
  check (check_out_at is null or (check_in_at is not null and check_out_at >= check_in_at)),
  check (check_in_location_shared = (check_in_lat is not null and check_in_lng is not null)),
  check (check_out_location_shared = (check_out_lat is not null and check_out_lng is not null))
);
create index attendance_logs_corrected_by_idx on public.attendance_logs (corrected_by);
create index attendance_logs_date_idx on public.attendance_logs (work_date);

alter table public.attendance_logs enable row level security;
revoke all on public.attendance_logs from anon, authenticated;
-- columns a person may read: no coordinates, no accuracy, no correction details
grant select (id, user_id, work_date, check_in_at, check_in_location_shared, check_out_at, check_out_location_shared, created_at)
  on public.attendance_logs to authenticated;

create policy attendance_logs_select_own on public.attendance_logs for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.attendance_check_in(_lat numeric, _lng numeric, _accuracy integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  shared boolean := (_lat is not null and _lng is not null);
  n int;
begin
  if me is null or not public.is_staff_member() then
    raise exception 'only SKB staff can record attendance' using errcode = '42501';
  end if;
  if (_lat is null) <> (_lng is null) or (shared and (_lat not between -90 and 90 or _lng not between -180 and 180)) then
    raise exception 'the location is not valid' using errcode = '22023';
  end if;
  insert into public.attendance_logs (user_id, work_date, check_in_at, check_in_lat, check_in_lng, check_in_accuracy_m, check_in_location_shared)
  values (
    me, public.dhaka_today(), now(),
    case when shared then round(_lat, 6) end,
    case when shared then round(_lng, 6) end,
    case when shared then least(greatest(coalesce(_accuracy, 0), 0), 1000000) end,
    shared
  )
  on conflict (user_id, work_date) do nothing;
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'you have already checked in today' using errcode = '23505';
  end if;
end $$;
revoke execute on function public.attendance_check_in(numeric, numeric, integer) from public, anon;
grant execute on function public.attendance_check_in(numeric, numeric, integer) to authenticated;

create or replace function public.attendance_check_out(_lat numeric, _lng numeric, _accuracy integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  today date := public.dhaka_today();
  shared boolean := (_lat is not null and _lng is not null);
  n int;
begin
  if me is null or not public.is_staff_member() then
    raise exception 'only SKB staff can record attendance' using errcode = '42501';
  end if;
  if (_lat is null) <> (_lng is null) or (shared and (_lat not between -90 and 90 or _lng not between -180 and 180)) then
    raise exception 'the location is not valid' using errcode = '22023';
  end if;
  update public.attendance_logs set
    check_out_at = now(),
    check_out_lat = case when shared then round(_lat, 6) end,
    check_out_lng = case when shared then round(_lng, 6) end,
    check_out_accuracy_m = case when shared then least(greatest(coalesce(_accuracy, 0), 0), 1000000) end,
    check_out_location_shared = shared
  where user_id = me and work_date = today and check_in_at is not null and check_out_at is null;
  get diagnostics n = row_count;
  if n = 0 then
    if exists (select 1 from public.attendance_logs where user_id = me and work_date = today and check_out_at is not null) then
      raise exception 'you have already checked out today' using errcode = '23505';
    end if;
    raise exception 'check in first' using errcode = '23514';
  end if;
end $$;
revoke execute on function public.attendance_check_out(numeric, numeric, integer) from public, anon;
grant execute on function public.attendance_check_out(numeric, numeric, integer) to authenticated;
