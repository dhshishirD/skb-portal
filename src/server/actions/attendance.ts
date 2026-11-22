'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { friendlyAttendanceError, locationSchema, type AttendanceRow, type LocationFix, type MyAttendance } from '@/lib/attendance';
import { firstDay, isMonth, lastDay, todayInDhaka } from '@/lib/workStatement';
import { getActor } from '@/server/services/projectsData';

/*
 * Check in / check out (migration 0045). The database sets the time and the Dhaka day, and decides who may record;
 * the checks here only give clear messages. A person reads only their own rows, with their own places (0047).
 */

type Failure = { ok: false; error: string };
export type AttendanceResult = { ok: true; message: string } | Failure;
export type AttendanceDataResult<T> = { ok: true; data: T } | Failure;
const fail = (error: string): Failure => ({ ok: false, error });
const PAGE = '/workspace/work-log';
const COLUMNS = 'work_date, check_in_at, check_in_lat, check_in_lng, check_in_location_shared, check_out_at, check_out_lat, check_out_lng, check_out_location_shared';

interface Row {
  work_date: string;
  check_in_at: string | null;
  check_in_lat: number | string | null;
  check_in_lng: number | string | null;
  check_in_location_shared: boolean;
  check_out_at: string | null;
  check_out_lat: number | string | null;
  check_out_lng: number | string | null;
  check_out_location_shared: boolean;
}
const toRow = (r: Row): AttendanceRow => ({
  date: r.work_date,
  checkInAt: r.check_in_at,
  checkInShared: r.check_in_location_shared,
  checkInLat: r.check_in_lat === null ? null : Number(r.check_in_lat),
  checkInLng: r.check_in_lng === null ? null : Number(r.check_in_lng),
  checkOutAt: r.check_out_at,
  checkOutShared: r.check_out_location_shared,
  checkOutLat: r.check_out_lat === null ? null : Number(r.check_out_lat),
  checkOutLng: r.check_out_lng === null ? null : Number(r.check_out_lng),
});

export async function getMyAttendanceAction(month: string): Promise<AttendanceDataResult<MyAttendance>> {
  try {
    if (!isMonth(month)) return fail('Choose a month.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const today = todayInDhaka();
    const supabase = await createClient();
    const [rowsRes, leaveRes] = await Promise.all([
      (supabase.from('attendance_logs') as any)
        .select(COLUMNS)
        .eq('user_id', actor.userId)
        .gte('work_date', firstDay(month))
        .lte('work_date', lastDay(month))
        .order('work_date', { ascending: false }),
      (supabase.from('work_days') as any)
        .select('work_date', { count: 'exact', head: true })
        .eq('user_id', actor.userId)
        .eq('day_type', 'leave')
        .gte('work_date', `${today.slice(0, 4)}-01-01`)
        .lte('work_date', `${today.slice(0, 4)}-12-31`),
    ]);
    if (rowsRes.error) return fail('Could not load your attendance. Please refresh the page.');
    const rows = ((rowsRes.data ?? []) as Row[]).map(toRow);
    let todayRow = rows.find((r) => r.date === today) ?? null;
    if (!todayRow && month !== today.slice(0, 7)) {
      const t = await (supabase.from('attendance_logs') as any).select(COLUMNS).eq('user_id', actor.userId).eq('work_date', today).maybeSingle();
      todayRow = t.data ? toRow(t.data as Row) : null;
    }
    return { ok: true, data: { month, today, todayRow, rows, leaveDaysThisYear: leaveRes.count ?? 0 } };
  } catch {
    return fail('Could not load your attendance. Please refresh the page.');
  }
}

async function record(kind: 'in' | 'out', location: LocationFix | null): Promise<AttendanceResult> {
  try {
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const parsed = locationSchema.safeParse(location ?? null);
    if (!parsed.success) return fail('The location could not be used. Please try again.');
    const fix = parsed.data;
    const supabase = await createClient();
    const { error } = await (supabase as any).rpc(kind === 'in' ? 'attendance_check_in' : 'attendance_check_out', {
      _lat: fix?.lat ?? null,
      _lng: fix?.lng ?? null,
      _accuracy: fix ? Math.round(fix.accuracyM) : null,
    });
    if (error) return fail(friendlyAttendanceError(error));
    revalidatePath(PAGE);
    const where = fix ? '' : ' Your location was not shared.';
    return { ok: true, message: `${kind === 'in' ? 'Checked in.' : 'Checked out.'}${where}` };
  } catch {
    return fail('Something went wrong. Nothing was saved.');
  }
}

export async function checkInAction(location: LocationFix | null): Promise<AttendanceResult> {
  return record('in', location);
}

export async function checkOutAction(location: LocationFix | null): Promise<AttendanceResult> {
  return record('out', location);
}
