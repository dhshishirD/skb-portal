import { describe, expect, it } from 'vitest';
import {
  canApproveCharter,
  canWriteCharter,
  charterSchema,
  emptyCharterText,
  friendlyCharterError,
  isEmptyCharter,
  sameCharterText,
} from '../charter';
import { buildCharterPdf } from '../charterPdf';

const facts = {
  code: 'TEST-1',
  title: 'Test project',
  donorName: 'Test Donor',
  location: 'Test place',
  budgetAmount: 10000,
  currency: 'EUR',
  beneficiaryTarget: 266,
  startDate: '2026-11-01',
  endDate: '2026-12-31',
};

describe('roles', () => {
  it('lets the Executive Director, Programme Manager and Program Officers write; only the Executive Director approves', () => {
    for (const r of ['executive', 'programme_manager', 'project_officer'] as const) expect(canWriteCharter([r])).toBe(true);
    for (const r of ['finance', 'field_officer', 'donor', 'board'] as const) expect(canWriteCharter([r])).toBe(false);
    expect(canApproveCharter(['executive'])).toBe(true);
    expect(canApproveCharter(['programme_manager'])).toBe(false);
  });
});

describe('text helpers', () => {
  it('compares charters ignoring spaces at the ends', () => {
    const a = { ...emptyCharterText(), background: 'Need' };
    expect(sameCharterText(a, { ...a, background: '  Need ' })).toBe(true);
    expect(sameCharterText(a, { ...a, risks: 'Rain' })).toBe(false);
  });
  it('knows an empty charter', () => {
    expect(isEmptyCharter(emptyCharterText())).toBe(true);
    expect(isEmptyCharter({ ...emptyCharterText(), team: ' x ' })).toBe(false);
    expect(isEmptyCharter({ ...emptyCharterText(), team: '   ' })).toBe(true);
  });
});

describe('charterSchema', () => {
  const ok = { ...emptyCharterText(), background: '  Need  ', changeNote: ' First draft ' };
  it('trims text and turns an empty note into null', () => {
    const p = charterSchema.parse(ok);
    expect(p.background).toBe('Need');
    expect(p.changeNote).toBe('First draft');
    expect(charterSchema.parse({ ...ok, changeNote: '  ' }).changeNote).toBeNull();
  });
  it('refuses text that is too long', () => {
    expect(charterSchema.safeParse({ ...ok, risks: 'x'.repeat(8001) }).success).toBe(false);
    expect(charterSchema.safeParse({ ...ok, changeNote: 'x'.repeat(501) }).success).toBe(false);
  });
});

describe('friendlyCharterError', () => {
  it('never leaks raw database text', () => {
    expect(friendlyCharterError({ message: 'only the Executive Director can approve the charter', code: '42501' })).toMatch(/Executive Director/);
    expect(friendlyCharterError({ message: 'this charter version is already approved', code: '42501' })).toMatch(/already approved/);
    expect(friendlyCharterError({ message: 'the charter of a closed project cannot be changed', code: '42501' })).toMatch(/closed/);
    expect(friendlyCharterError({ code: '23505', message: 'duplicate key value violates unique constraint "project_charter_version_unique"' })).toMatch(/Reload/);
    expect(friendlyCharterError({ message: 'a saved charter version cannot be edited; save a new version instead', code: '42501' })).toMatch(/new version/);
    expect(friendlyCharterError({ message: 'new row violates row-level security policy', code: '42501' })).toMatch(/permission/);
    expect(friendlyCharterError({ message: 'secret_table exploded' })).not.toMatch(/secret_table/);
  });
});

describe('buildCharterPdf', () => {
  const base = {
    organisationName: 'Test Organisation',
    facts,
    version: 2,
    text: { ...emptyCharterText(), background: 'Line one\nLine two', objectives: 'Aim' },
    changeNote: 'Added aim',
    savedOn: '2026-11-08T05:00:00Z',
    approvedOn: null,
    approvedByName: null,
  };
  it('makes a PDF', async () => {
    const bytes = await buildCharterPdf(base);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
  });
  it('runs onto more pages for long text and survives unsupported characters and long words', async () => {
    const long = Array.from({ length: 400 }, (_, i) => `Paragraph ${i} with some words to fill the line and wrap around.`).join('\n');
    const short = await buildCharterPdf(base);
    const bytes = await buildCharterPdf({
      ...base,
      text: { ...base.text, background: long, risks: 'আগুনে ক্ষতিগ্রস্ত ' + 'x'.repeat(300) },
      approvedOn: '2026-11-08T06:00:00Z',
      approvedByName: 'Test Director',
    });
    expect(bytes.length).toBeGreaterThan(short.length * 2);
  });
});
