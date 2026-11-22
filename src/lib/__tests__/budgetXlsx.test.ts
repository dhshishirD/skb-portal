// @vitest-environment node
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import type { BudgetData, BudgetItem } from '../budget';
import { calculateBudget } from '../budget';
import { budgetFileName, budgetSheetRows, buildBudgetXlsx, colName } from '../budgetXlsx';
import type { BudgetVsActual } from '../budgetVsActual';

const item = (id: string, over: Partial<BudgetItem>): BudgetItem => ({ id, kind: 'per_package', groupName: 'Food', position: 0, name: 'Rice', measure: 'Kg', quantity: 10, unitPriceBdt: 85.5, ...over });
const base = (over: Partial<BudgetData> = {}): BudgetData => ({
  projectId: 'p', stage: 'implementation' as BudgetData['stage'], donorAmount: 10000, currency: 'USD',
  settings: { packagesCount: 20, adminPercent: 5, exchangeRate: 120, rateDate: '2026-11-01', rateNote: null, rateSetByName: null, rateSetAt: null },
  items: [item('a', {}), item('b', { name: 'Oil & <salt>', quantity: 2, unitPriceBdt: 190.25, position: 1 }), item('c', { kind: 'one_off', groupName: null, name: 'Transport', measure: 'Lump sum', quantity: 1, unitPriceBdt: 5000, position: 2 })],
  closed: false, canEdit: true, canSetRate: true, ...over,
});
const meta = { projectTitle: 'Winter "Aid"', projectCode: 'P-01', preparedOn: '2026-11-22' };
const actual: BudgetVsActual = { plannedBdtCents: 1, claimsSpentBdtCents: 2, claimsWaitingBdtCents: 3, purchasesOrderedBdtCents: 4, purchasesApprovedBdtCents: 5, purchasesWaitingBdtCents: 6, committedBdtCents: 7, remainingBdtCents: -8, percentCommitted: 110, overBudget: true, lines: [{ id: 'x', kind: 'claim', description: 'Taxi', bdtCents: 15000, statusLabel: 'Paid', date: '2026-11-02', counted: 'spent' }] };

describe('budgetSheetRows', () => {
  it('uses the same figures as the budget calculation', () => {
    const d = base();
    const { rows, calc } = budgetSheetRows({ ...meta, data: d });
    const ref = calculateBudget({ items: d.items, packagesCount: 20, adminPercent: 5, exchangeRate: 120, donorAmount: 10000, currency: 'USD' });
    expect(calc.projectBdtCents).toBe(ref.projectBdtCents);
    const labelled = (l: string) => rows.find((r) => r[0]?.v === l)!;
    expect(labelled('PROJECT COST')[4]!.v).toBe(ref.projectBdtCents / 100);
    expect(labelled('PROJECT COST')[6]!.v).toBe(ref.projectConvertedMilli! / 1000);
  });
  it('writes line formulas that recompute to the cached values', () => {
    const { rows } = budgetSheetRows({ ...meta, data: base() });
    const line = rows.find((r) => r[0]?.v === 'Rice')!;
    expect(line[4]!.f).toMatch(/^C\d+\*D\d+$/);
    expect(line[4]!.v).toBeCloseTo(10 * 85.5, 5);
    const oil = rows.find((r) => r[0]?.v === 'Oil & <salt>')!;
    expect(oil[4]!.v).toBeCloseTo(2 * 190.25, 5);
  });
  it('drops the donor-currency columns for a BDT project', () => {
    const { rows, widths } = budgetSheetRows({ ...meta, data: base({ currency: 'BDT' }) });
    expect(widths).toHaveLength(5);
    expect(rows.find((r) => r[0]?.v === 'PROJECT COST')).toHaveLength(5);
  });
  it('still builds with no items and no rate', () => {
    const d = base({ items: [], donorAmount: null, settings: { ...base().settings, exchangeRate: null } });
    expect(() => budgetSheetRows({ ...meta, data: d })).not.toThrow();
  });
});

describe('buildBudgetXlsx', () => {
  it('makes a readable workbook with escaped text', async () => {
    const blob = await buildBudgetXlsx({ ...meta, data: base(), actual });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const wb = await zip.file('xl/workbook.xml')!.async('string');
    expect(wb).toContain('Budget vs Actual');
    const s1 = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
    expect(s1).toContain('Oil &amp; &lt;salt&gt;');
    expect(s1).toContain('Winter &quot;Aid&quot;');
    expect(s1).toContain('<f>');
    const s2 = await zip.file('xl/worksheets/sheet2.xml')!.async('string');
    expect(s2).toContain('Taxi');
    expect(s2).toContain('<v>150</v>');
  });
  it('leaves the Actual sheet out when not allowed', async () => {
    const zip = await JSZip.loadAsync(await (await buildBudgetXlsx({ ...meta, data: base(), actual: null })).arrayBuffer());
    expect(zip.file('xl/worksheets/sheet2.xml')).toBeNull();
  });
});

describe('helpers', () => {
  it('names columns and files', () => {
    expect(colName(0)).toBe('A');
    expect(colName(26)).toBe('AA');
    expect(budgetFileName('Winter Aid', 'P-01', '2026-11-22')).toBe('SKB-Budget-P-01-2026-11-22.xlsx');
    expect(budgetFileName('Winter Aid', null, '2026-11-22')).toBe('SKB-Budget-Winter-Aid-2026-11-22.xlsx');
  });
});
