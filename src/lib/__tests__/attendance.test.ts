import { describe, expect, it } from 'vitest';
import { dayState, friendlyAttendanceError, hoursText, locationSchema, timeText, workedMinutes } from '../attendance';

describe('attendance helpers', () => {
  it('tells the state of the day', () => {
    expect(dayState(null)).toBe('not_in');
    expect(dayState({ checkInAt: null, checkOutAt: null })).toBe('not_in');
    expect(dayState({ checkInAt: '2026-11-22T03:00:00Z', checkOutAt: null })).toBe('in');
    expect(dayState({ checkInAt: '2026-11-22T03:00:00Z', checkOutAt: '2026-11-22T11:00:00Z' })).toBe('done');
  });
  it('counts worked minutes, live while still in', () => {
    const done = { checkInAt: '2026-11-22T03:00:00Z', checkOutAt: '2026-11-22T11:30:00Z' };
    expect(workedMinutes(done)).toBe(510);
    const open = { checkInAt: '2026-11-22T03:00:00Z', checkOutAt: null };
    expect(workedMinutes(open, new Date('2026-11-22T04:15:00Z'))).toBe(75);
    expect(workedMinutes({ checkInAt: null, checkOutAt: null })).toBeNull();
  });
  it('never shows negative time', () => {
    expect(workedMinutes({ checkInAt: '2026-11-22T05:00:00Z', checkOutAt: null }, new Date('2026-11-22T04:00:00Z'))).toBe(0);
  });
  it('writes hours in plain words', () => {
    expect(hoursText(null)).toBe('-');
    expect(hoursText(45)).toBe('45 min');
    expect(hoursText(60)).toBe('1 h 00 min');
    expect(hoursText(510)).toBe('8 h 30 min');
  });
  it('shows the clock time in Dhaka', () => {
    expect(timeText('2026-11-22T03:05:00Z')).toBe('9:05 AM');
    expect(timeText(null)).toBe('-');
  });
  it('accepts a real place or none, and refuses an impossible one', () => {
    expect(locationSchema.safeParse(null).success).toBe(true);
    expect(locationSchema.safeParse({ lat: 23.87, lng: 90.39, accuracyM: 20 }).success).toBe(true);
    expect(locationSchema.safeParse({ lat: 123, lng: 90.39, accuracyM: 20 }).success).toBe(false);
    expect(locationSchema.safeParse({ lat: 23.8, lng: 190, accuracyM: 20 }).success).toBe(false);
    expect(locationSchema.safeParse({ lat: 23.8, lng: 90, accuracyM: -1 }).success).toBe(false);
  });
  it('turns database errors into plain messages', () => {
    expect(friendlyAttendanceError({ message: 'you have already checked in today' })).toBe('You have already checked in today.');
    expect(friendlyAttendanceError({ message: 'you have already checked out today' })).toBe('You have already checked out today.');
    expect(friendlyAttendanceError({ message: 'check in first' })).toBe('Check in first.');
    expect(friendlyAttendanceError({ code: '42501', message: 'x' })).toBe('You do not have permission to do this.');
    expect(friendlyAttendanceError({ message: 'boom' })).toBe('Something went wrong. Nothing was saved.');
  });
});
