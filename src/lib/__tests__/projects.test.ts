import { describe, it, expect } from 'vitest';
import {
  CURRENCIES,
  EMPTY_PROJECT_FORM,
  canArchiveProjects,
  canAssignOfficers,
  canChangeStage,
  canCreateProjects,
  canEditProjects,
  formatMoney,
  projectInputSchema,
  projectInputToRow,
  projectRowToForm,
  type ProjectRow,
} from '../projects';
import type { AppRole } from '../database.types';

const valid = { ...EMPTY_PROJECT_FORM, code: 'WFS-SDLP', title: 'Water and food security' };

describe('permissions', () => {
  const cases: Array<[string, AppRole[], boolean, boolean, boolean, boolean]> = [
    // who,                     roles,                              create, archive, stage, assign
    ['Executive Director', ['executive', 'super_admin'], true, true, true, true],
    ['Program Officer', ['project_officer', 'field_officer'], true, false, false, false],
    ['HR & Admin', ['super_admin', 'project_officer', 'field_officer'], true, false, false, true],
    ['Chairman (board)', ['board'], false, false, false, false],
    ['Law Officer', ['legal_officer'], false, false, false, false],
    ['IT Officer', ['it_officer'], false, false, false, false],
    ['Field officer alone', ['field_officer'], false, false, false, false],
    ['No role', [], false, false, false, false],
  ];

  it.each(cases)('%s', (_who, roles, create, archive, stage, assign) => {
    expect(canCreateProjects(roles)).toBe(create);
    expect(canEditProjects(roles)).toBe(create);
    expect(canArchiveProjects(roles)).toBe(archive);
    expect(canChangeStage(roles)).toBe(stage);
    expect(canAssignOfficers(roles)).toBe(assign);
  });
});

describe('formatMoney', () => {
  it('shows the currency code and grouped digits', () => {
    expect(formatMoney(150000.5, 'EUR')).toBe('EUR 150,000.5');
    expect(formatMoney('2500000', 'BDT')).toBe('BDT 2,500,000');
  });
  it('shows a dash instead of inventing a number', () => {
    expect(formatMoney(null, 'BDT')).toBe('—');
    expect(formatMoney('', 'BDT')).toBe('—');
    expect(formatMoney('abc', 'BDT')).toBe('—');
  });
  it('falls back to BDT for an unusable currency', () => {
    expect(formatMoney(10, 'euro')).toBe('BDT 10');
    expect(formatMoney(10, null)).toBe('BDT 10');
  });
  it('lists the eight supported currencies', () => {
    expect([...CURRENCIES]).toEqual(['BDT', 'EUR', 'USD', 'GBP', 'TRY', 'QAR', 'SAR', 'AED']);
  });
});

describe('projectInputSchema', () => {
  it('accepts the minimum (code + title) and turns empty text into null', () => {
    const r = projectInputSchema.parse(valid);
    expect(r.description).toBeNull();
    expect(r.budget_amount).toBeNull();
    expect(r.beneficiary_target).toBeNull();
    expect(r.start_date).toBeNull();
    expect(r.budget_currency).toBe('BDT');
  });

  it('converts numbers and trims text', () => {
    const r = projectInputSchema.parse({
      ...valid,
      code: '  WFS-SDLP ',
      budget_amount: '1,250,000.456',
      budget_currency: 'EUR',
      beneficiary_target: '300',
      location: ' Ukhiya ',
    });
    expect(r.code).toBe('WFS-SDLP');
    expect(r.budget_amount).toBe(1250000.46);
    expect(r.beneficiary_target).toBe(300);
    expect(r.location).toBe('Ukhiya');
  });

  it.each(['', 'a', '-abc', 'has space', 'bad!', 'x'.repeat(61)])('rejects code %j', (code) => {
    expect(projectInputSchema.safeParse({ ...valid, code }).success).toBe(false);
  });

  it.each(['', 'ab', 'x'.repeat(301)])('rejects title of length %#', (title) => {
    expect(projectInputSchema.safeParse({ ...valid, title }).success).toBe(false);
  });

  it.each(['-1', 'abc', '1e99'])('rejects budget %j', (budget_amount) => {
    expect(projectInputSchema.safeParse({ ...valid, budget_amount }).success).toBe(false);
  });

  it.each(['-5', '2.5', 'many'])('rejects beneficiary target %j', (beneficiary_target) => {
    expect(projectInputSchema.safeParse({ ...valid, beneficiary_target }).success).toBe(false);
  });

  it('rejects an unsupported currency', () => {
    expect(projectInputSchema.safeParse({ ...valid, budget_currency: 'JPY' }).success).toBe(false);
  });

  it('rejects an end date before the start date', () => {
    const r = projectInputSchema.safeParse({ ...valid, start_date: '2026-06-01', end_date: '2026-05-01' });
    expect(r.success).toBe(false);
    expect(projectInputSchema.safeParse({ ...valid, start_date: '2026-06-01', end_date: '2026-06-01' }).success).toBe(true);
  });

  it('rejects badly formatted dates', () => {
    expect(projectInputSchema.safeParse({ ...valid, start_date: '01/06/2026' }).success).toBe(false);
  });
});

describe('row mappers', () => {
  const row: ProjectRow = {
    id: 'p1',
    code: 'LIV-CLO',
    title: 'Livelihood clothing',
    description: null,
    stage: 'implementation',
    location: "Cox's Bazar",
    donor_name: 'IHH',
    ngoab_ref: null,
    budget_amount: '150000.50',
    budget_currency: 'EUR',
    beneficiary_target: 200,
    start_date: '2026-01-01',
    end_date: null,
    created_at: '2026-11-01T00:00:00Z',
    created_by: 'u1',
    updated_at: '2026-11-01T00:00:00Z',
  };

  it('turns a row into form text and back without loss', () => {
    const form = projectRowToForm(row);
    expect(form.description).toBe('');
    expect(form.budget_amount).toBe('150000.50');
    expect(form.beneficiary_target).toBe('200');
    const out = projectInputToRow(projectInputSchema.parse(form));
    expect(out).toMatchObject({
      code: 'LIV-CLO',
      description: null,
      budget_amount: 150000.5,
      budget_currency: 'EUR',
      beneficiary_target: 200,
      end_date: null,
    });
  });

  it('never writes created_by, stage or deleted_at from the form', () => {
    const out = projectInputToRow(projectInputSchema.parse(valid));
    expect(Object.keys(out)).not.toContain('created_by');
    expect(Object.keys(out)).not.toContain('stage');
    expect(Object.keys(out)).not.toContain('deleted_at');
  });

  it('falls back to BDT for an unknown stored currency', () => {
    expect(projectRowToForm({ ...row, budget_currency: 'XXX' }).budget_currency).toBe('BDT');
  });
});
