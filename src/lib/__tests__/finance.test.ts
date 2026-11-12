import { describe, expect, it } from 'vitest';
import { amountInBdt, expenseActionsFor, expenseClaimSchema } from '../finance';

const PID = '11111111-1111-4111-8111-111111111111';
const today = new Date().toISOString().slice(0, 10);
const claim = { projectId: PID, amount: '1500', currency: 'BDT', fxRate: '', expenseDate: today, description: 'Transport', vendorName: '', receiptRef: '' };

describe('expenseClaimSchema', () => {
  it('accepts a BDT claim and fixes the rate at 1', () => {
    const r = expenseClaimSchema.safeParse(claim);
    expect(r.success && r.data.fxRate).toBe(1);
  });
  it('needs a rate for foreign currency', () => {
    expect(expenseClaimSchema.safeParse({ ...claim, currency: 'EUR' }).success).toBe(false);
    expect(expenseClaimSchema.safeParse({ ...claim, currency: 'EUR', fxRate: '130.5' }).success).toBe(true);
  });
  it('rejects far-future dates, zero amounts and short descriptions', () => {
    expect(expenseClaimSchema.safeParse({ ...claim, expenseDate: '2999-01-01' }).success).toBe(false);
    expect(expenseClaimSchema.safeParse({ ...claim, amount: '0' }).success).toBe(false);
    expect(expenseClaimSchema.safeParse({ ...claim, description: 'a' }).success).toBe(false);
  });
});

describe('amountInBdt', () => {
  it('converts and rounds to 2 places', () => {
    expect(amountInBdt(10, 'EUR', 130.555)).toBe(1305.55);
    expect(amountInBdt(500, 'BDT', 99)).toBe(500);
  });
});

describe('expenseActionsFor', () => {
  const base = { claimantId: 'c', lastApproverId: null as string | null };
  it('lets the claimant cancel only while submitted', () => {
    expect(expenseActionsFor({ ...base, status: 'submitted', userId: 'c', roles: ['project_officer'] }).actions).toEqual(['cancel']);
    expect(expenseActionsFor({ ...base, status: 'pm_approved', userId: 'c', roles: ['project_officer'] }).actions).toEqual([]);
  });
  it('gives the right role the buttons and blocks self-approval', () => {
    expect(expenseActionsFor({ ...base, status: 'submitted', userId: 'm', roles: ['programme_manager'] }).actions).toEqual(['approve', 'return', 'reject']);
    expect(expenseActionsFor({ ...base, status: 'submitted', userId: 'c', roles: ['programme_manager'] }).actions).not.toContain('approve');
    expect(expenseActionsFor({ ...base, status: 'submitted', userId: 'f', roles: ['finance'] }).actions).toEqual([]);
  });
  it('blocks the same person approving two steps in a row', () => {
    const r = expenseActionsFor({ ...base, status: 'pm_approved', userId: 'm', roles: ['programme_manager', 'finance'], lastApproverId: 'm' });
    expect(r.actions).not.toContain('approve');
  });
});
