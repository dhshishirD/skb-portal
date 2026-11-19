import { z } from 'zod';
import type { AppRole } from './database.types';

/**
 * Daily work log and monthly Work Statement (migration 0040).
 * Pure helpers: months and weekdays, the rows of a statement, its summary, and who may do which step.
 * Friday and Saturday are the weekly off days. The database enforces the rules; this file only mirrors them
 * so the pages can show them.
 */

export type DayType = 'office' | 'field' | 'tour' | 'leave' | 'off';
export const DAY_TYPES: DayType[] = ['office', 'field', 'tour', 'leave', 'off'];
export const DAY_TYPE_LABELS: Record<DayType, string> = {
  office: 'Office duty',
  field: 'Field / camp duty',
  tour: 'Official tour',
  leave: 'Leave',
  off: 'Off day',
};
/** Default text for the "place" column when the person typed nothing. */
export const DAY_TYPE_PLACE: Record<DayType, string> = { office: 'Central Office', field: 'Field', tour: 'Tour', leave: 'Leave', off: 'Off Day' };
export const PLACE_SUGGESTIONS = ['Central Office', 'Field visit', 'Camp', 'Tour', 'Working from home'];

export type StatementStatus = 'draft' | 'submitted' | 'verified' | 'approved' | 'returned';
export const STATUS_LABELS: Record<StatementStatus, string> = {
  draft: 'Draft',
  submitted: 'Waiting for the verifier',
  verified: 'Waiting for the approver',
  approved: 'Approved',
  returned: 'Returned for changes',
};

export interface WorkDay {
  date: string; // YYYY-MM-DD
  dayType: DayType;
  place: string;
  tasks: string;
  projectId: string | null;
}

export interface StatementInfo {
  id: string;
  status: StatementStatus;
  verifierId: string | null;
  approverId: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  returnNote: string | null;
  signedPrepared: boolean;
  signedVerified: boolean;
  signedApproved: boolean;
}

// ===== Dates (all in plain YYYY-MM-DD / YYYY-MM text, no time zones) =====
export const isMonth = (m: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
export const isDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;

/** Today's date in Dhaka as YYYY-MM-DD (the server clock is UTC). */
export function todayInDhaka(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export const monthOf = (date: string) => date.slice(0, 7);
export const firstDay = (month: string) => `${month}-01`;
export function lastDay(month: string): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`;
}
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
export function daysOfMonth(month: string): string[] {
  const n = Number(lastDay(month).slice(8));
  return Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
}
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
export const weekdayName = (date: string) => DOW[weekdayOf(date)]!;
/** Friday and Saturday. */
export const isWeekend = (date: string) => weekdayOf(date) === 5 || weekdayOf(date) === 6;
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthTitle = (month: string) => `${MONTH_NAMES[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`;
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const shortDate = (date: string) => `${date.slice(8)} ${SHORT[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;

// ===== The rows of a month =====
export interface StatementRow {
  date: string;
  weekday: string;
  dayType: DayType | null; // null = a working day with nothing entered yet
  place: string;
  tasks: string;
  /** True when the row was filled in by default (an off weekend nobody entered). */
  automatic: boolean;
}

/** Every day of the month: what was entered, Fri/Sat as "Off Day" by default, and gaps for the rest. Days after `today` stay empty. */
export function buildRows(month: string, days: WorkDay[]): StatementRow[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  return daysOfMonth(month).map((date) => {
    const d = byDate.get(date);
    if (d) {
      return { date, weekday: weekdayName(date), dayType: d.dayType, place: d.place.trim() || DAY_TYPE_PLACE[d.dayType], tasks: d.tasks.trim(), automatic: false };
    }
    if (isWeekend(date)) return { date, weekday: weekdayName(date), dayType: 'off', place: 'Off Day', tasks: 'Weekend', automatic: true };
    return { date, weekday: weekdayName(date), dayType: null, place: '', tasks: '', automatic: false };
  });
}

/** Working days (not Friday / Saturday) of the month that have no entry, up to and including the last day of the month. */
export const missingDays = (rows: StatementRow[]): string[] => rows.filter((r) => r.dayType === null).map((r) => r.date);

export interface StatementSummary {
  total: number;
  office: number;
  field: number;
  tour: number;
  leave: number;
  off: number;
  missing: number;
}
export function summarize(rows: StatementRow[]): StatementSummary {
  const s: StatementSummary = { total: rows.length, office: 0, field: 0, tour: 0, leave: 0, off: 0, missing: 0 };
  for (const r of rows) {
    if (r.dayType === null) s.missing += 1;
    else s[r.dayType] += 1;
  }
  return s;
}

// ===== What a person may type =====
export const workDaySchema = z.object({
  date: z.string().refine(isDate, 'Choose a date'),
  dayType: z.enum(['office', 'field', 'tour', 'leave', 'off'], { errorMap: () => ({ message: 'Choose the kind of day' }) }),
  place: z.string().trim().max(120, 'The place must be 120 characters or fewer'),
  tasks: z.string().trim().max(1500, 'The work description must be 1500 characters or fewer'),
  projectId: z.string().uuid().nullable().optional(),
});
export type WorkDayInput = z.input<typeof workDaySchema>;

// ===== Who may do what =====
const REVIEWER_ADMINS: AppRole[] = ['super_admin', 'executive'];
export const canSetReviewers = (roles: readonly AppRole[]) => roles.some((r) => REVIEWER_ADMINS.includes(r));

export type ReviewStep = 'verify' | 'approve';
/** Which step is waiting on a statement, or null when none is. */
export function waitingStep(s: Pick<StatementInfo, 'status' | 'verifierId'>): ReviewStep | null {
  if (s.status === 'submitted') return s.verifierId ? 'verify' : 'approve';
  if (s.status === 'verified') return 'approve';
  return null;
}
/** Whether this person may act on the waiting step (the Executive Director and the Super Admin may step in, never on their own statement). */
export function canActOnStep(
  s: Pick<StatementInfo, 'status' | 'verifierId' | 'approverId'>,
  ownerId: string,
  me: { id: string; roles: readonly AppRole[] },
): boolean {
  if (me.id === ownerId) return false;
  const step = waitingStep(s);
  if (!step) return false;
  if (me.roles.includes('executive') || me.roles.includes('super_admin')) return true;
  return step === 'verify' ? s.verifierId === me.id : s.approverId === me.id;
}

/** Plain-words version of a database error from migration 0040. */
export function friendlyWorkError(error: { code?: string; message?: string } | null | undefined): string {
  const m = (error?.message ?? '').toLowerCase();
  if (m.includes('future date')) return 'You cannot record a day that has not come yet.';
  if (m.includes('has been submitted')) return 'This month has been submitted, so its days cannot be changed.';
  if (m.includes('every working day')) return 'Every working day must be filled in before you submit.';
  if (m.includes('no approver')) return 'No approver is set for you yet. Please ask the administrator.';
  if (m.includes('last day')) return 'A month can be submitted from its last day.';
  if (m.includes('save your signature')) return 'Save your signature first, or continue without it.';
  if (m.includes('note is needed')) return 'Please write a short note so the person knows what to change.';
  if (m.includes('own statement')) return 'You cannot review your own statement.';
  if (m.includes('approved statement')) return 'An approved statement cannot be changed.';
  if (m.includes('only the')) return 'This step belongs to someone else.';
  if (m.includes('verifies their own') || m.includes('check constraint')) return 'A person cannot be their own verifier or approver.';
  if (error?.code === '42501') return 'You do not have permission to do this.';
  return 'Something went wrong. Nothing was saved.';
}
