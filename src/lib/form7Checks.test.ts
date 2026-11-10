import { describe, expect, it } from 'vitest';
import { form7Checks, hasStops, type Form7CheckInput } from './form7Checks';

const good = (): Form7CheckInput => ({
  project: { startDate: '2025-02-15', endDate: '2025-08-14', donorName: 'Donor', location: 'Place', beneficiaryTarget: 100 },
  registrationNo: 'REG-1',
  budget: { itemCount: 2, packagesCount: 50, warnings: [], projectConvertedMilli: 30382500, adminConvertedMilli: 1517500, donorAmountMilli: 31900000 },
  currency: 'EUR',
  receipts: [{ receivedOn: '2025-02-20', amount: 31900, currency: 'EUR' }],
  familiesCount: 100,
  peopleTotal: 10,
  emptySections: [],
  checklistDone: 11,
  checklistTotal: 11,
});

const codes = (i: Form7CheckInput) => form7Checks(i).map((c) => c.code);

describe('form7Checks', () => {
  it('has nothing to say when everything is in place', () => {
    expect(form7Checks(good())).toEqual([]);
  });

  it('stops when the key numbers would be wrong', () => {
    const i = good();
    i.project.startDate = null;
    i.budget.itemCount = 0;
    i.budget.warnings = ['packages_missing', 'missing_rate', 'missing_donor_amount', 'overspent'];
    i.familiesCount = null;
    i.project.beneficiaryTarget = null;
    const c = form7Checks(i);
    expect(hasStops(c)).toBe(true);
    expect(c.map((x) => x.code)).toEqual(
      expect.arrayContaining(['dates_missing', 'budget_empty', 'packages_missing', 'rate_missing', 'donor_amount_missing', 'overspent', 'families_missing']),
    );
  });

  it('flags reversed dates', () => {
    const i = good();
    i.project.endDate = '2025-01-01';
    expect(codes(i)).toContain('dates_reversed');
  });

  it('warns (does not stop) about receipts that differ from the donor amount', () => {
    const i = good();
    i.receipts = [{ receivedOn: '2025-02-20', amount: 30000, currency: 'EUR' }];
    const c = form7Checks(i);
    expect(c.map((x) => x.code)).toContain('receipt_total');
    expect(hasStops(c)).toBe(false);
  });

  it('warns when there is no receipt, a foreign currency receipt, or a receipt after the end date', () => {
    const none = good();
    none.receipts = [];
    expect(codes(none)).toContain('no_receipt');
    const usd = good();
    usd.receipts = [{ receivedOn: '2025-02-20', amount: 100, currency: 'USD' }];
    expect(codes(usd)).toContain('receipt_currency');
    const late = good();
    late.receipts = [{ receivedOn: '2025-09-01', amount: 31900, currency: 'EUR' }];
    expect(codes(late)).toContain('receipt_after_end');
  });

  it('accepts the families count instead of registered people', () => {
    const i = good();
    i.peopleTotal = 0;
    i.project.beneficiaryTarget = null;
    const c = codes(i);
    expect(c).toContain('people_none');
    expect(c).not.toContain('families_missing');
  });

  it('reports empty text sections and an open checklist as warnings', () => {
    const i = good();
    i.emptySections = ['Challenges'];
    i.checklistDone = 3;
    const c = form7Checks(i);
    expect(c.map((x) => x.code)).toEqual(['text_empty', 'checklist_open']);
    expect(hasStops(c)).toBe(false);
  });
});
