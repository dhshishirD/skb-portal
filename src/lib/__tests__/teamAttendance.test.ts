import { describe, expect, it } from 'vitest';
import { attendanceSheets, cellState, correctionSchema, dhakaHHMM, dhakaInstant, leaveKey, mapLink, monthSummary, type TeamAttendance, type TeamRecord } from '../teamAttendance';

const rec = (over: Partial<TeamRecord> = {}): TeamRecord => ({
  userId: 'u1', date: '2026-11-17', checkInAt: '2026-11-17T03:00:00Z', checkInLat: 23.874, checkInLng: 90.399, checkInShared: true,
  checkOutAt: '2026-11-17T11:30:00Z', checkOutLat: null, checkOutLng: null, checkOutShared: false, correctedAt: null, correctionReason: null, ...over,
});

describe('cellState', () => {
  it('reads the day from the record, leave and the calendar', () => {
    expect(cellState('2026-11-17', '2026-11-22', rec(), false)).toBe('present');
    expect(cellState('2026-11-17', '2026-11-22', rec({ checkOutAt: null }), false)).toBe('not_out');
    expect(cellState('2026-11-22', '2026-11-22', rec({ date: '2026-11-22', checkOutAt: null }), false)).toBe('in');
    expect(cellState('2026-11-18', '2026-11-22', undefined, true)).toBe('leave');
    expect(cellState('2026-11-20', '2026-11-22', undefined, false)).toBe('off'); // Friday
    expect(cellState('2026-11-18', '2026-11-22', undefined, false)).toBe('none');
    expect(cellState('2026-11-25', '2026-11-22', undefined, false)).toBe('future');
  });
});

describe('monthSummary', () => {
  const data: TeamAttendance = {
    from: '2026-11-01', to: '2026-11-30', today: '2026-11-22',
    people: [{ userId: 'u1', name: 'A' }],
    records: [rec(), rec({ date: '2026-11-18', checkOutAt: null })],
    leave: [leaveKey('u1', '2026-11-19')],
  };
  it('counts present, leave, no check-out and hours', () => {
    const m = monthSummary(data, '2026-11')[0]!;
    expect(m.present).toBe(2);
    expect(m.leave).toBe(1);
    expect(m.notCheckedOut).toBe(1);
    expect(m.minutes).toBe(510);
  });
  it('puts places as map links in the Days sheet and none in the summary', () => {
    const s = attendanceSheets(data, '2026-11');
    expect(JSON.stringify(s.days.rows)).toContain('https://www.google.com/maps?q=23.874,90.399');
    expect(s.summary.rows.length).toBe(5);
  });
});

describe('helpers', () => {
  it('maps and converts Dhaka times', () => {
    expect(mapLink(null, 1)).toBeNull();
    expect(mapLink(1.5, 2.5)).toBe('https://www.google.com/maps?q=1.5,2.5');
    expect(dhakaInstant('2026-11-22', '09:05')).toBe('2026-11-22T03:05:00.000Z');
    expect(dhakaHHMM('2026-11-22T03:05:00.000Z')).toBe('09:05');
    expect(dhakaHHMM(null)).toBe('');
  });
  it('validates a correction', () => {
    const ok = { userId: '3f2b8c1e-5d4a-4e6b-9c7d-1a2b3c4d5e6f', date: '2026-11-22', checkIn: '09:00', checkOut: '17:00', reason: 'Forgot to check out' };
    expect(correctionSchema.safeParse(ok).success).toBe(true);
    expect(correctionSchema.safeParse({ ...ok, checkOut: '' }).success).toBe(true);
    expect(correctionSchema.safeParse({ ...ok, checkOut: '08:00' }).success).toBe(false);
    expect(correctionSchema.safeParse({ ...ok, reason: ' a ' }).success).toBe(false);
    expect(correctionSchema.safeParse({ ...ok, checkIn: '9:00' }).success).toBe(false);
  });
});
