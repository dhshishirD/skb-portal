import { describe, expect, it } from 'vitest';
import {
  addMonths, buildRows, canActOnStep, daysOfMonth, friendlyWorkError, isWeekend, lastDay, missingDays, monthTitle, shortDate, summarize, todayInDhaka, waitingStep, weekdayName, workDaySchema,
  type WorkDay,
} from '../workStatement';

const day = (date: string, dayType: WorkDay['dayType'], place = '', tasks = ''): WorkDay => ({ date, dayType, place, tasks, projectId: null });

describe('dates', () => {
  it('knows month lengths, weekdays and the Dhaka date', () => {
    expect(lastDay('2026-02')).toBe('2026-02-28');
    expect(lastDay('2028-02')).toBe('2028-02-29');
    expect(daysOfMonth('2026-08')).toHaveLength(31);
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(weekdayName('2026-08-01')).toBe('Sat');
    expect(isWeekend('2026-08-01')).toBe(true);
    expect(isWeekend('2026-08-02')).toBe(false);
    expect(monthTitle('2026-08')).toBe('August 2026');
    expect(shortDate('2026-08-01')).toBe('01 Aug 2026');
    // 20:00 UTC on 31 Aug is already 1 Sep in Dhaka
    expect(todayInDhaka(new Date('2026-08-31T20:00:00Z'))).toBe('2026-09-01');
    expect(todayInDhaka(new Date('2026-08-31T10:00:00Z'))).toBe('2026-08-31');
  });
});

describe('buildRows and summarize', () => {
  it('fills Friday and Saturday as off, leaves working days empty, and counts like the sample statement', () => {
    const entered = [day('2026-08-02', 'office', '', 'Concept note'), day('2026-08-07', 'tour', 'KL', 'Visit')];
    const rows = buildRows('2026-08', entered);
    expect(rows).toHaveLength(31);
    expect(rows[0]).toMatchObject({ date: '2026-08-01', dayType: 'off', automatic: true, tasks: 'Weekend' });
    expect(rows[1]).toMatchObject({ dayType: 'office', place: 'Central Office', tasks: 'Concept note' });
    expect(rows[6]).toMatchObject({ dayType: 'tour', place: 'KL', automatic: false }); // a Friday worked on tour
    expect(rows[2]!.dayType).toBeNull();
    const s = summarize(rows);
    expect(s.total).toBe(31);
    expect(s.office).toBe(1);
    expect(s.tour).toBe(1);
    expect(s.off).toBe(8); // Fridays and Saturdays of August 2026 are 9, one Friday was worked
    expect(s.missing).toBe(31 - 1 - 1 - 8);
    expect(missingDays(rows)).toHaveLength(s.missing);
  });
});

describe('workDaySchema', () => {
  it('accepts a good day and rejects bad ones', () => {
    expect(workDaySchema.safeParse({ date: '2026-08-02', dayType: 'office', place: '', tasks: 'Work' }).success).toBe(true);
    expect(workDaySchema.safeParse({ date: '2026-13-40', dayType: 'office', place: '', tasks: '' }).success).toBe(false);
    expect(workDaySchema.safeParse({ date: '2026-08-02', dayType: 'holiday', place: '', tasks: '' }).success).toBe(false);
    expect(workDaySchema.safeParse({ date: '2026-08-02', dayType: 'office', place: 'x'.repeat(121), tasks: '' }).success).toBe(false);
  });
});

describe('review steps', () => {
  const base = { verifierId: 'v', approverId: 'a' };
  it('says which step is waiting', () => {
    expect(waitingStep({ status: 'draft', verifierId: 'v' })).toBeNull();
    expect(waitingStep({ status: 'submitted', verifierId: 'v' })).toBe('verify');
    expect(waitingStep({ status: 'submitted', verifierId: null })).toBe('approve');
    expect(waitingStep({ status: 'verified', verifierId: 'v' })).toBe('approve');
    expect(waitingStep({ status: 'approved', verifierId: 'v' })).toBeNull();
  });
  it('lets the right person act, the executive step in, and nobody review their own', () => {
    const sub = { ...base, status: 'submitted' as const };
    expect(canActOnStep(sub, 'owner', { id: 'v', roles: ['programme_manager'] })).toBe(true);
    expect(canActOnStep(sub, 'owner', { id: 'a', roles: ['finance'] })).toBe(false);
    expect(canActOnStep(sub, 'owner', { id: 'x', roles: ['executive'] })).toBe(true);
    expect(canActOnStep(sub, 'owner', { id: 'y', roles: ['super_admin'] })).toBe(true);
    expect(canActOnStep(sub, 'v', { id: 'v', roles: ['programme_manager'] })).toBe(false);
    expect(canActOnStep(sub, 'x', { id: 'x', roles: ['executive'] })).toBe(false);
    expect(canActOnStep({ ...base, status: 'verified' }, 'owner', { id: 'a', roles: ['finance'] })).toBe(true);
    expect(canActOnStep({ ...base, status: 'approved' }, 'owner', { id: 'a', roles: ['finance'] })).toBe(false);
  });
});

describe('friendlyWorkError', () => {
  it('explains the common problems', () => {
    expect(friendlyWorkError({ message: 'a work day cannot be recorded for a future date' })).toMatch(/not come yet/);
    expect(friendlyWorkError({ message: 'every working day must be filled in before submitting (3 missing)' })).toMatch(/working day/);
    expect(friendlyWorkError({ code: '42501', message: 'x' })).toMatch(/permission/);
  });
});
