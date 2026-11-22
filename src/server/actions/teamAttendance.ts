'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { correctionSchema, dhakaInstant, type CorrectionInput, type TeamAttendance, type TeamRecord } from '@/lib/teamAttendance';
import { firstDay, isMonth, lastDay, todayInDhaka } from '@/lib/workStatement';
import { getActor } from '@/server/services/projectsData';

/*
 * Team attendance (migration 0046). Only the Executive Director and the Super Admin can read the team's rows and
 * places or correct a time; the database functions refuse everyone else, these checks only give clear messages.
 */

type Failure = { ok: false; error: string };
export type TeamResult = { ok: true; data: TeamAttendance } | Failure;
export type CorrectionResult = { ok: true; message: string } | Failure;
const fail = (error: string): Failure => ({ ok: false, error });
const PAGE = '/workspace/attendance';

interface RangeRow {
  user_id: string;
  work_date: string;
  check_in_at: string | null;
  check_in_lat: number | string | null;
  check_in_lng: number | string | null;
  check_in_location_shared: boolean;
  check_out_at: string | null;
  check_out_lat: number | string | null;
  check_out_lng: number | string | null;
  check_out_location_shared: boolean;
  corrected_at: string | null;
  correction_reason: string | null;
}
const num = (v: number | string | null) => (v === null ? null : Number(v));

export async function getTeamAttendanceAction(month: string): Promise<TeamResult> {
  try {
    if (!isMonth(month)) return fail('Choose a month.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const from = firstDay(month);
    const to = lastDay(month);
    const supabase = (await createClient()) as any;
    const [people, range, leave] = await Promise.all([
      supabase.rpc('attendance_team_people'),
      supabase.rpc('attendance_team_range', { _from: from, _to: to }),
      supabase.rpc('attendance_team_leave', { _from: from, _to: to }),
    ]);
    const denied = [people, range, leave].find((r) => r.error?.code === '42501');
    if (denied) return fail('Only the Executive Director and the Super Admin can see team attendance.');
    if (people.error || range.error || leave.error) return fail('Could not load team attendance. Please refresh the page.');
    const records: TeamRecord[] = ((range.data ?? []) as RangeRow[]).map((r) => ({
      userId: r.user_id,
      date: r.work_date,
      checkInAt: r.check_in_at,
      checkInLat: num(r.check_in_lat),
      checkInLng: num(r.check_in_lng),
      checkInShared: r.check_in_location_shared,
      checkOutAt: r.check_out_at,
      checkOutLat: num(r.check_out_lat),
      checkOutLng: num(r.check_out_lng),
      checkOutShared: r.check_out_location_shared,
      correctedAt: r.corrected_at,
      correctionReason: r.correction_reason,
    }));
    return {
      ok: true,
      data: {
        from,
        to,
        today: todayInDhaka(),
        people: ((people.data ?? []) as Array<{ user_id: string; full_name: string }>).map((p) => ({ userId: p.user_id, name: p.full_name || 'Unnamed' })),
        records,
        leave: ((leave.data ?? []) as Array<{ user_id: string; work_date: string }>).map((l) => `${l.user_id}|${l.work_date}`),
      },
    };
  } catch {
    return fail('Could not load team attendance. Please refresh the page.');
  }
}

export async function correctAttendanceAction(input: CorrectionInput): Promise<CorrectionResult> {
  try {
    const parsed = correctionSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Please check the form.');
    const v = parsed.data;
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const supabase = (await createClient()) as any;
    const { error } = await supabase.rpc('attendance_correct', {
      _user: v.userId,
      _date: v.date,
      _check_in: dhakaInstant(v.date, v.checkIn),
      _check_out: v.checkOut ? dhakaInstant(v.date, v.checkOut) : null,
      _reason: v.reason,
    });
    if (error) {
      const m = (error.message ?? '').toLowerCase();
      if (m.includes('your own')) return fail('You cannot correct your own attendance.');
      if (error.code === '42501') return fail('Only the Executive Director and the Super Admin can correct attendance.');
      if (m.includes('future')) return fail('Choose a day that is not in the future.');
      if (m.includes('chosen day')) return fail('The times must be on the chosen day.');
      if (m.includes('before check-in')) return fail('Check-out cannot be before check-in.');
      if (m.includes('reason')) return fail('Write the reason (3 to 500 letters).');
      return fail('Something went wrong. Nothing was changed.');
    }
    revalidatePath(PAGE);
    return { ok: true, message: 'Attendance corrected. The reason is saved in the audit log.' };
  } catch {
    return fail('Something went wrong. Nothing was changed.');
  }
}
