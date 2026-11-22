/** Attendance (migration 0045): types and small helpers. The times come from the database clock, never from the browser. */
import { z } from 'zod';

export interface AttendanceRow {
  date: string;
  checkInAt: string | null;
  checkInShared: boolean;
  checkOutAt: string | null;
  checkOutShared: boolean;
}

export interface LocationFix {
  lat: number;
  lng: number;
  accuracyM: number;
}

export interface MyAttendance {
  month: string;
  today: string;
  /** Today's row, if the person has checked in. */
  todayRow: AttendanceRow | null;
  rows: AttendanceRow[];
  /** Days recorded as leave in the work log this year (no approval; just counted). */
  leaveDaysThisYear: number;
}

export const LOCATION_NOTICE = 'Your location is recorded when you check in and check out. Only the Executive Director and the Super Admin can see it.';

export type DayState = 'not_in' | 'in' | 'done';
export const dayState = (row: Pick<AttendanceRow, 'checkInAt' | 'checkOutAt'> | null): DayState =>
  !row || !row.checkInAt ? 'not_in' : row.checkOutAt ? 'done' : 'in';

/** Minutes between check-in and check-out (or `now` while still in). Null when there is no check-in. */
export function workedMinutes(row: Pick<AttendanceRow, 'checkInAt' | 'checkOutAt'>, now: Date = new Date()): number | null {
  if (!row.checkInAt) return null;
  const end = row.checkOutAt ? new Date(row.checkOutAt).getTime() : now.getTime();
  const mins = Math.round((end - new Date(row.checkInAt).getTime()) / 60_000);
  return Number.isFinite(mins) ? Math.max(0, mins) : null;
}

export function hoursText(minutes: number | null): string {
  if (minutes === null) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h === 0 ? `${m} min` : `${h} h ${String(m).padStart(2, '0')} min`;
}

/** Clock time in Dhaka, e.g. "9:05 AM". */
export function timeText(iso: string | null): string {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

export const locationSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracyM: z.number().min(0).max(1_000_000),
  })
  .nullable();

export function friendlyAttendanceError(error: { code?: string; message?: string } | null | undefined): string {
  const m = (error?.message ?? '').toLowerCase();
  if (m.includes('already checked in')) return 'You have already checked in today.';
  if (m.includes('already checked out')) return 'You have already checked out today.';
  if (m.includes('check in first')) return 'Check in first.';
  if (m.includes('location is not valid')) return 'The location could not be used. Please try again.';
  if (m.includes('only skb staff') || error?.code === '42501') return 'You do not have permission to do this.';
  return 'Something went wrong. Nothing was saved.';
}
