import { describe, expect, it } from 'vitest';
import { budgetVsActual, canSeeBudgetVsActual } from '../budgetVsActual';

const items = [{ id: 'a', kind: 'one_off' as const, groupName: null, position: 0, name: 'Tent', measure: 'Pcs', quantity: 100, unitPriceBdt: 1000 }]; // 100,000 BDT
const base = { items, packagesCount: 0, adminPercent: 5 };
const claim = (o: object) => ({ id: 'c', description: 'Claim', amount: 1000, fxRateToBdt: 1, status: 'paid', expenseDate: '2026-11-01', ...o });
const buy = (o: object) => ({ id: 'p', description: 'Buy', estimatedAmount: 5000, orderTotal: null, status: 'approved', createdAt: '2026-11-02T00:00:00Z', ...o });

describe('budget against actual', () => {
  it('adds spent, ordered and approved, and keeps waiting apart', () => {
    const r = budgetVsActual({
      ...base,
      claims: [claim({ amount: 10000 }), claim({ id: 'c2', amount: 2000, status: 'submitted' }), claim({ id: 'c3', amount: 999, status: 'rejected' })],
      purchases: [
        buy({ id: 'p1', status: 'po_issued', estimatedAmount: 20000, orderTotal: 18000 }),
        buy({ id: 'p2', status: 'approved', estimatedAmount: 5000 }),
        buy({ id: 'p3', status: 'quotations_attached', estimatedAmount: 7000 }),
        buy({ id: 'p4', status: 'draft', estimatedAmount: 9000 }),
        buy({ id: 'p5', status: 'rejected', estimatedAmount: 9000 }),
      ],
    });
    expect(r.plannedBdtCents).toBe(10000000);
    expect(r.claimsSpentBdtCents).toBe(1000000);
    expect(r.claimsWaitingBdtCents).toBe(200000);
    expect(r.purchasesOrderedBdtCents).toBe(1800000); // the order total, not the estimate
    expect(r.purchasesApprovedBdtCents).toBe(500000);
    expect(r.purchasesWaitingBdtCents).toBe(700000);
    expect(r.committedBdtCents).toBe(3300000);
    expect(r.remainingBdtCents).toBe(6700000);
    expect(r.percentCommitted).toBe(33);
    expect(r.overBudget).toBe(false);
  });

  it('converts claims in another currency and flags overspending', () => {
    const r = budgetVsActual({ ...base, claims: [claim({ amount: 1000, fxRateToBdt: 140 })], purchases: [buy({ status: 'po_issued', estimatedAmount: 1, orderTotal: 50000 })] });
    expect(r.claimsSpentBdtCents).toBe(14000000);
    expect(r.overBudget).toBe(true);
    expect(r.remainingBdtCents).toBeLessThan(0);
  });

  it('has no percentage until a budget exists', () => {
    const r = budgetVsActual({ items: [], packagesCount: 0, adminPercent: 5, claims: [], purchases: [] });
    expect(r.percentCommitted).toBeNull();
    expect(r.overBudget).toBe(false);
  });

  it('lists newest first and only for roles that see everything', () => {
    const r = budgetVsActual({ ...base, claims: [claim({ id: 'old', expenseDate: '2026-10-01' })], purchases: [buy({ createdAt: '2026-11-05T00:00:00Z' })] });
    expect(r.lines.map((l) => l.id)).toEqual(['p', 'old']);
    expect(canSeeBudgetVsActual(['finance'])).toBe(true);
    expect(canSeeBudgetVsActual(['me_officer'])).toBe(false);
    expect(canSeeBudgetVsActual(['donor'])).toBe(false);
  });
});
