import { describe, expect, it } from 'vitest';
import {
  budgetItemSchema,
  budgetSettingsSchema,
  calculateBudget,
  canEditBudget,
  canSetExchangeRate,
  exchangeRateSchema,
  formatBdtCents,
  formatBp,
  formatMilli,
  friendlyBudgetError,
  type BudgetItem,
} from '../budget';

// Synthetic numbers only (no real project data).
const item = (id: string, over: Partial<BudgetItem> = {}): BudgetItem => ({
  id,
  kind: 'per_package',
  groupName: null,
  position: 0,
  name: id,
  measure: 'Pcs',
  quantity: 1,
  unitPriceBdt: 100,
  ...over,
});

const base = { adminPercent: 5, exchangeRate: 100 as number | null, donorAmount: 1000 as number | null, currency: 'EUR' };

describe('calculateBudget', () => {
  it('rounds each line to 3 decimals, sums the package, multiplies by packages', () => {
    // 10 BDT / 3 = 3.333 EUR per line; two lines = 6.666 (not 6.667 from rounding the sum)
    const c = calculateBudget({
      ...base,
      exchangeRate: 3,
      items: [item('a', { unitPriceBdt: 10, position: 1 }), item('b', { unitPriceBdt: 10, position: 2 })],
      packagesCount: 10,
    });
    expect(c.lines.a.lineConvertedMilli).toBe(3333);
    expect(c.packageConvertedMilli).toBe(6666);
    expect(c.allPackagesConvertedMilli).toBe(66660);
    expect(c.packageBdtCents).toBe(2000);
  });

  it('rounds halves up and multiplies quantity x unit price exactly', () => {
    // 0.0005 EUR would be a half: 0.05 BDT / 100 = 0.0005 -> 0.001
    const c = calculateBudget({ ...base, items: [item('a', { quantity: 1, unitPriceBdt: 0.05 })], packagesCount: 1 });
    expect(c.lines.a.lineConvertedMilli).toBe(1);
    const d = calculateBudget({ ...base, items: [item('a', { quantity: 2.5, unitPriceBdt: 33.33 })], packagesCount: 1 });
    expect(d.lines.a.lineBdtCents).toBe(8333); // 83.325 -> 83.33
  });

  it('adds one-off lines once and works out the administration cost and share', () => {
    const c = calculateBudget({
      ...base,
      donorAmount: 1000,
      items: [item('a', { unitPriceBdt: 5000 }), item('r', { kind: 'one_off', unitPriceBdt: 10000 })],
      packagesCount: 10, // 10 x 50 EUR = 500, + 100 one-off = 600
    });
    expect(c.projectConvertedMilli).toBe(600000);
    expect(c.adminConvertedMilli).toBe(400000);
    expect(c.warnings).toContain('admin_above_target');
    const ok = calculateBudget({ ...base, donorAmount: 630, items: [item('a', { unitPriceBdt: 6000 })], packagesCount: 10 });
    expect(ok.adminConvertedMilli).toBe(30000);
    expect(ok.adminBp).toBe(500); // 30 / 600 = 5.00%
    expect(ok.warnings).not.toContain('admin_above_target');
  });

  it('warns when the project cost is more than the donor amount', () => {
    const c = calculateBudget({ ...base, donorAmount: 100, items: [item('a', { unitPriceBdt: 5000 })], packagesCount: 10 });
    expect(c.adminConvertedMilli).toBeLessThan(0);
    expect(c.adminBp).toBeNull();
    expect(c.warnings).toContain('overspent');
  });

  it('needs a rate for a foreign currency but not for BDT', () => {
    const noRate = calculateBudget({ ...base, exchangeRate: null, items: [item('a')], packagesCount: 5 });
    expect(noRate.canConvert).toBe(false);
    expect(noRate.projectConvertedMilli).toBeNull();
    expect(noRate.projectBdtCents).toBe(50000);
    expect(noRate.warnings).toContain('missing_rate');
    const bdt = calculateBudget({ ...base, currency: 'BDT', exchangeRate: null, donorAmount: 1000, items: [item('a')], packagesCount: 5 });
    expect(bdt.canConvert).toBe(true);
    expect(bdt.projectConvertedMilli).toBe(500000);
    expect(bdt.warnings).not.toContain('missing_rate');
  });

  it('keeps groups in order of first appearance and flags missing donor amount and packages', () => {
    const c = calculateBudget({
      ...base,
      donorAmount: null,
      items: [
        item('a', { groupName: 'Food', position: 1 }),
        item('b', { groupName: 'Hygiene', position: 2 }),
        item('c', { groupName: 'Food', position: 3 }),
      ],
      packagesCount: 0,
    });
    expect(c.groups.map((g) => g.name)).toEqual(['Food', 'Hygiene']);
    expect(c.groups[0].itemIds).toEqual(['a', 'c']);
    expect(c.warnings).toEqual(expect.arrayContaining(['missing_donor_amount', 'packages_missing']));
    expect(c.adminConvertedMilli).toBeNull();
  });

  it('handles an empty budget', () => {
    const c = calculateBudget({ ...base, items: [], packagesCount: 0 });
    expect(c.projectBdtCents).toBe(0);
    expect(c.projectConvertedMilli).toBe(0);
    expect(c.adminConvertedMilli).toBe(1000000);
  });
});

describe('formatting', () => {
  it('formats amounts', () => {
    expect(formatBdtCents(123456)).toBe('1,234.56');
    expect(formatBdtCents(null)).toBe('—');
    expect(formatMilli(66660)).toBe('66.660');
    expect(formatMilli(null)).toBe('—');
    expect(formatBp(500)).toBe('5.00%');
    expect(formatBp(null)).toBe('—');
  });
});

describe('roles', () => {
  it('lets the right people edit and only the Executive Director set the rate', () => {
    expect(canEditBudget(['project_officer'])).toBe(true);
    expect(canEditBudget(['programme_manager'])).toBe(true);
    expect(canEditBudget(['finance'])).toBe(false);
    expect(canEditBudget(['donor'])).toBe(false);
    expect(canSetExchangeRate(['executive'])).toBe(true);
    expect(canSetExchangeRate(['programme_manager'])).toBe(false);
  });
});

describe('typed values', () => {
  const ok = { kind: 'per_package', groupName: ' Food ', name: 'Rice', measure: 'Kg', quantity: '2.5', unitPriceBdt: '1,200.50' };
  it('accepts a good item and cleans it', () => {
    expect(budgetItemSchema.parse(ok)).toEqual({ kind: 'per_package', groupName: 'Food', name: 'Rice', measure: 'Kg', quantity: 2.5, unitPriceBdt: 1200.5 });
    expect(budgetItemSchema.parse({ ...ok, groupName: '  ' }).groupName).toBeNull();
  });
  it('rejects bad items', () => {
    expect(budgetItemSchema.safeParse({ ...ok, name: 'x' }).success).toBe(false);
    expect(budgetItemSchema.safeParse({ ...ok, quantity: '0' }).success).toBe(false);
    expect(budgetItemSchema.safeParse({ ...ok, quantity: '1.2345' }).success).toBe(false);
    expect(budgetItemSchema.safeParse({ ...ok, unitPriceBdt: '10.123' }).success).toBe(false);
    expect(budgetItemSchema.safeParse({ ...ok, unitPriceBdt: '-5' }).success).toBe(false);
    expect(budgetItemSchema.safeParse({ ...ok, unitPriceBdt: 'abc' }).success).toBe(false);
    expect(budgetItemSchema.safeParse({ ...ok, kind: 'other' }).success).toBe(false);
  });
  it('checks settings', () => {
    expect(budgetSettingsSchema.parse({ packagesCount: '266', adminPercent: '10' })).toEqual({ packagesCount: 266, adminPercent: 10 });
    expect(budgetSettingsSchema.safeParse({ packagesCount: '1.5', adminPercent: '5' }).success).toBe(false);
    expect(budgetSettingsSchema.safeParse({ packagesCount: '10', adminPercent: '31' }).success).toBe(false);
  });
  it('checks the exchange rate', () => {
    expect(exchangeRateSchema.parse({ rate: '140.5', rateDate: '2026-11-05', note: '' })).toEqual({ rate: 140.5, rateDate: '2026-11-05', note: null });
    expect(exchangeRateSchema.safeParse({ rate: '0', rateDate: '2026-11-05', note: '' }).success).toBe(false);
    expect(exchangeRateSchema.safeParse({ rate: '140', rateDate: '', note: '' }).success).toBe(false);
    expect(exchangeRateSchema.safeParse({ rate: '140', rateDate: '2026-13-45', note: '' }).success).toBe(false);
  });
});

describe('friendlyBudgetError', () => {
  it('never leaks raw database text', () => {
    expect(friendlyBudgetError({ message: 'only the Executive Director can set the exchange rate', code: '42501' })).toMatch(/Executive Director/);
    expect(friendlyBudgetError({ message: 'the budget of a closed project cannot be changed', code: '42501' })).toMatch(/closed/);
    expect(friendlyBudgetError({ message: 'new row violates row-level security policy for table "x"', code: '42501' })).toMatch(/permission/);
    expect(friendlyBudgetError({ code: '23514', message: 'violates check constraint "foo"' })).not.toMatch(/foo/);
    expect(friendlyBudgetError({ message: 'secret_table exploded' })).not.toMatch(/secret_table/);
  });
});
