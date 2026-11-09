import { describe, expect, it } from 'vitest';
import {
  EMPTY_REPORT,
  REPORT_FIELDS,
  allChecked,
  canSignOffClosing,
  canWriteClosing,
  countChecked,
  emptySections,
  friendlyClosingError,
  noteSchema,
  reportSchema,
} from '../closing';

const tick = { byName: null, at: '2026-01-01', note: null, documentId: null, documentTitle: null };

describe('closing roles', () => {
  it('writers are executive, programme manager, project officer', () => {
    expect(canWriteClosing(['project_officer'])).toBe(true);
    expect(canWriteClosing(['programme_manager'])).toBe(true);
    expect(canWriteClosing(['finance'])).toBe(false);
    expect(canWriteClosing(['donor'])).toBe(false);
  });
  it('only the executive signs off', () => {
    expect(canSignOffClosing(['executive'])).toBe(true);
    expect(canSignOffClosing(['programme_manager'])).toBe(false);
  });
});

describe('checklist helpers', () => {
  it('counts ticks and needs every item', () => {
    const items = [{ checked: tick }, { checked: null }];
    expect(countChecked(items)).toBe(1);
    expect(allChecked(items)).toBe(false);
    expect(allChecked([{ checked: tick }])).toBe(true);
    expect(allChecked([])).toBe(false);
  });
  it('lists empty written sections', () => {
    expect(emptySections(EMPTY_REPORT)).toHaveLength(REPORT_FIELDS.length);
    expect(emptySections({ ...EMPTY_REPORT, challenges: '  ' })).toContain(REPORT_FIELDS.find((f) => f.key === 'challenges')!.label);
    expect(emptySections({ ...EMPTY_REPORT, challenges: 'x' })).not.toContain(REPORT_FIELDS.find((f) => f.key === 'challenges')!.label);
  });
});

describe('schemas', () => {
  it('trims text and enforces limits', () => {
    expect(reportSchema.parse({ ...EMPTY_REPORT, projectSummary: '  hi  ' }).projectSummary).toBe('hi');
    expect(reportSchema.safeParse({ ...EMPTY_REPORT, localManpower: 'x'.repeat(2001) }).success).toBe(false);
    expect(reportSchema.safeParse({ ...EMPTY_REPORT, challenges: 'x'.repeat(5001) }).success).toBe(false);
  });
  it('note is optional and capped at 300', () => {
    expect(noteSchema.parse('')).toBeNull();
    expect(noteSchema.parse(' ok ')).toBe('ok');
    expect(noteSchema.safeParse('x'.repeat(301)).success).toBe(false);
  });
});

describe('friendlyClosingError', () => {
  it('maps database messages to plain words', () => {
    expect(friendlyClosingError({ message: 'the closing report of a closed project cannot be changed' })).toMatch(/closed/);
    expect(friendlyClosingError({ message: 'the closing report is signed off; reopen' })).toMatch(/signed off/);
    expect(friendlyClosingError({ message: 'every item on the closing checklist must be ticked before sign-off' })).toMatch(/Tick every item/);
    expect(friendlyClosingError({ code: '42501', message: 'new row violates row-level security' })).toMatch(/permission/);
    expect(friendlyClosingError({ message: 'weird' })).toMatch(/try again/);
  });
});

describe('familiesCount', () => {
  it('is optional and must be a whole number', () => {
    expect(reportSchema.parse({ ...EMPTY_REPORT }).familiesCount).toBeNull();
    expect(reportSchema.parse({ ...EMPTY_REPORT, familiesCount: ' 67 ' }).familiesCount).toBe(67);
    expect(reportSchema.safeParse({ ...EMPTY_REPORT, familiesCount: '6.5' }).success).toBe(false);
    expect(reportSchema.safeParse({ ...EMPTY_REPORT, familiesCount: '-3' }).success).toBe(false);
  });
});
