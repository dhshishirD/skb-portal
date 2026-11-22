/** Team attendance (migration 0046): for the Executive Director and the Super Admin. Pure helpers, no database calls. */
import { z } from 'zod';
import { hoursText, timeText, workedMinutes } from './attendance';
import { buildXlsxBlob, S, sheetXml, type Row } from './budgetXlsx';
import { daysOfMonth, isDate, isWeekend, monthTitle, shortDate } from './workStatement';

export interface TeamPerson {
  userId: string;
  name: string;
}

export interface TeamRecord {
  userId: string;
  date: string;
  checkInAt: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
  checkInShared: boolean;
  checkOutAt: string | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
  checkOutShared: boolean;
  correctedAt: string | null;
  correctionReason: string | null;
}

export interface TeamAttendance {
  from: string;
  to: string;
  today: string;
  people: TeamPerson[];
  records: TeamRecord[];
  /** "userId|date" of every leave day in the work log. */
  leave: string[];
}

export const leaveKey = (userId: string, date: string) => `${userId}|${date}`;

/** A link that opens the place on a map. */
export const mapLink = (lat: number | null, lng: number | null): string | null =>
  lat === null || lng === null ? null : `https://www.google.com/maps?q=${lat},${lng}`;

export type CellState = 'present' | 'in' | 'not_out' | 'leave' | 'off' | 'none' | 'future';

/**
 * What a person's day looks like. "in" = checked in today, not out yet; "not_out" = a past day with no check-out.
 * "none" = a working day with no record (not called "absent": office hours and holidays are not decided).
 */
export function cellState(date: string, today: string, record: TeamRecord | undefined, onLeave: boolean): CellState {
  if (date > today) return 'future';
  if (record?.checkInAt) {
    if (record.checkOutAt) return 'present';
    return date === today ? 'in' : 'not_out';
  }
  if (onLeave) return 'leave';
  if (isWeekend(date)) return 'off';
  return 'none';
}

export interface PersonMonth {
  userId: string;
  name: string;
  present: number;
  leave: number;
  notCheckedOut: number;
  minutes: number;
  /** Working days (not Friday/Saturday) up to today with no check-in and no leave. */
  noRecord: number;
}

export function monthSummary(data: TeamAttendance, month: string): PersonMonth[] {
  const days = daysOfMonth(month);
  const byKey = new Map(data.records.map((r) => [leaveKey(r.userId, r.date), r]));
  const leave = new Set(data.leave);
  return data.people.map((p) => {
    const out: PersonMonth = { userId: p.userId, name: p.name, present: 0, leave: 0, notCheckedOut: 0, minutes: 0, noRecord: 0 };
    for (const d of days) {
      const rec = byKey.get(leaveKey(p.userId, d));
      const state = cellState(d, data.today, rec, leave.has(leaveKey(p.userId, d)));
      if (state === 'present' || state === 'in' || state === 'not_out') out.present += 1;
      if (state === 'not_out') out.notCheckedOut += 1;
      if (state === 'leave') out.leave += 1;
      if (state === 'none') out.noRecord += 1;
      if (rec?.checkInAt && rec.checkOutAt) out.minutes += workedMinutes(rec) ?? 0;
    }
    return out;
  });
}

export const CELL_LABEL: Record<CellState, string> = {
  present: 'Present',
  in: 'In now',
  not_out: 'No check-out',
  leave: 'Leave',
  off: 'Off day',
  none: 'No record',
  future: '',
};

// ----- correction -----
export const correctionSchema = z
  .object({
    userId: z.string().uuid(),
    date: z.string().refine(isDate, 'Choose a day.'),
    checkIn: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Enter the check-in time.'),
    checkOut: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Enter the check-out time.').or(z.literal('')),
    reason: z.string().trim().min(3, 'Write the reason (at least 3 letters).').max(500, 'The reason is too long (500 letters at most).'),
  })
  .refine((v) => v.checkOut === '' || v.checkOut >= v.checkIn, { message: 'Check-out cannot be before check-in.', path: ['checkOut'] });
export type CorrectionInput = z.input<typeof correctionSchema>;

/** "2026-11-22" + "09:05" (Dhaka time) as an ISO instant. */
export const dhakaInstant = (date: string, hhmm: string): string => new Date(`${date}T${hhmm}:00+06:00`).toISOString();

/** "HH:MM" of an instant in Dhaka, for filling the correction form. */
export function dhakaHHMM(iso: string | null): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}

// ----- Excel -----
export const teamFileName = (from: string, to: string) => `SKB-Attendance-${from}-to-${to}.xlsx`;

export function attendanceSheets(data: TeamAttendance, month: string): { summary: { rows: Row[]; widths: number[] }; days: { rows: Row[]; widths: number[] } } {
  const names = new Map(data.people.map((p) => [p.userId, p.name]));
  const summary: Row[] = [
    [{ v: `SKB attendance - ${monthTitle(month)}`, s: S.title }],
    [{ v: 'Leave = days recorded as leave in the work log. "No record" = a working day with no check-in and no leave (Fri/Sat are off days).', s: S.note }],
    [],
    ['Name', 'Present days', 'Leave days', 'No check-out', 'No record', 'Hours worked'].map((v) => ({ v, s: S.head })),
    ...monthSummary(data, month).map((m): Row => [
      { v: m.name },
      { v: m.present, s: S.text },
      { v: m.leave },
      { v: m.notCheckedOut },
      { v: m.noRecord },
      { v: hoursText(m.minutes) },
    ]),
  ];
  const days: Row[] = [
    ['Date', 'Name', 'Check-in', 'Check-in place', 'Check-out', 'Check-out place', 'Hours', 'Corrected', 'Reason'].map((v) => ({ v, s: S.head })),
    ...data.records
      .filter((r) => r.date.startsWith(month))
      .sort((a, b) => a.date.localeCompare(b.date) || (names.get(a.userId) ?? '').localeCompare(names.get(b.userId) ?? ''))
      .map((r): Row => [
        { v: shortDate(r.date) },
        { v: names.get(r.userId) ?? '' },
        { v: timeText(r.checkInAt) },
        { v: mapLink(r.checkInLat, r.checkInLng) ?? (r.checkInAt ? 'not shared' : '') },
        { v: timeText(r.checkOutAt) },
        { v: mapLink(r.checkOutLat, r.checkOutLng) ?? (r.checkOutAt ? 'not shared' : '') },
        { v: r.checkInAt ? hoursText(workedMinutes(r)) : '' },
        { v: r.correctedAt ? 'Yes' : '' },
        { v: r.correctionReason ?? '' },
      ]),
  ];
  return { summary: { rows: summary, widths: [28, 14, 12, 14, 12, 16] }, days: { rows: days, widths: [14, 28, 12, 44, 12, 44, 12, 11, 40] } };
}

export async function buildAttendanceXlsx(data: TeamAttendance, month: string): Promise<Blob> {
  const { summary, days } = attendanceSheets(data, month);
  return buildXlsxBlob([
    { name: 'Summary', xml: sheetXml(summary.rows, summary.widths, { freezeRow: 4 }) },
    { name: 'Days', xml: sheetXml(days.rows, days.widths, { freezeRow: 1 }) },
  ]);
}
