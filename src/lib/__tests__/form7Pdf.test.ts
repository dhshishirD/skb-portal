import { describe, expect, it } from 'vitest';
import { buildForm7Pdf, type Form7Input } from '../form7Pdf';
import { calculateBudget, type BudgetItem } from '../budget';
import { EMPTY_REPORT } from '../closing';

const items: BudgetItem[] = [
  { id: 'a', kind: 'per_package', groupName: 'Food', position: 1, name: 'Rice', measure: 'kg', quantity: 10, unitPriceBdt: 80 },
];

function input(over: Partial<Form7Input> = {}): Form7Input {
  return {
    organisationName: 'SKB',
    registrationNo: null,
    project: { code: 'T-1', title: 'Test ✓ project', donorName: 'Donor', ngoabRef: null, location: 'Dhaka', startDate: '2026-01-01', endDate: '2026-03-01', beneficiaryTarget: 100 },
    counts: { women: 40, men: 20, girls: 20, boys: 20, unspecified: 0, total: 100 },
    currency: 'EUR',
    items,
    calc: calculateBudget({ items, packagesCount: 100, adminPercent: 5, exchangeRate: 130, donorAmount: 1000, currency: 'EUR' }),
    exchangeRate: 130,
    rateDate: '2026-01-02',
    receipts: [{ receivedOn: '2026-01-05', amount: 1000, currency: 'EUR', reference: 'R1' }],
    report: { ...EMPTY_REPORT, projectSummary: 'Long text. '.repeat(400) },
    checklist: [{ label: 'One', done: true }, { label: 'Two', done: false }],
    signedOffOn: null,
    signedOffByName: null,
    madeOn: '2026-11-09',
    ...over,
  };
}

describe('buildForm7Pdf', () => {
  it('makes a PDF, even with long text and odd characters', async () => {
    const bytes = await buildForm7Pdf(input());
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(2000);
  });
  it('works without beneficiary counts, receipts or a rate', async () => {
    const bytes = await buildForm7Pdf(input({ counts: null, receipts: [], exchangeRate: null, rateDate: null }));
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-');
  });
});
