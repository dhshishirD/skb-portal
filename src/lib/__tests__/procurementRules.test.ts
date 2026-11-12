import { describe, expect, it } from 'vitest';
import {
  approverRoleFor,
  blacklistReasonSchema,
  checkQuotations,
  purchaseActionsFor,
  purchaseRequestSchema,
  vendorSchema,
} from '../procurement';

const PID = '11111111-1111-4111-8111-111111111111';
const q = (vendorId: string, amount: number, isBlacklisted = false) => ({ vendorId, amount, isBlacklisted });

describe('checkQuotations', () => {
  it('needs one quotation under BDT 50,000 and three vendors from 50,000', () => {
    expect(checkQuotations({ estimatedAmount: 49_999, quotations: [q('a', 40_000)] }).ok).toBe(true);
    expect(checkQuotations({ estimatedAmount: 50_000, quotations: [q('a', 50_000)] }).ok).toBe(false);
    expect(checkQuotations({ estimatedAmount: 50_000, quotations: [q('a', 1), q('b', 2), q('c', 3)] }).ok).toBe(true);
  });
  it('rejects no quotations and blacklisted vendors', () => {
    expect(checkQuotations({ estimatedAmount: 10, quotations: [] }).ok).toBe(false);
    expect(checkQuotations({ estimatedAmount: 10, quotations: [q('a', 5, true)] }).ok).toBe(false);
  });
});

describe('approverRoleFor', () => {
  it('sends BDT 500,000 and above to the Executive Director', () => {
    expect(approverRoleFor(499_999)).toBe('programme_manager');
    expect(approverRoleFor(500_000)).toBe('executive');
  });
});

describe('schemas', () => {
  it('validates a purchase request', () => {
    expect(purchaseRequestSchema.safeParse({ projectId: PID, description: 'Rice', estimatedAmount: '1200.50' }).success).toBe(true);
    expect(purchaseRequestSchema.safeParse({ projectId: PID, description: 'Rice', estimatedAmount: '-1' }).success).toBe(false);
    expect(purchaseRequestSchema.safeParse({ projectId: 'x', description: 'Rice', estimatedAmount: '5' }).success).toBe(false);
  });
  it('validates vendors and blacklist reasons', () => {
    expect(vendorSchema.safeParse({ name: 'Rahim Traders', contactPerson: '', phone: '', email: '' }).success).toBe(true);
    expect(vendorSchema.safeParse({ name: 'R', contactPerson: '', phone: '', email: '' }).success).toBe(false);
    expect(vendorSchema.safeParse({ name: 'Rahim', contactPerson: '', phone: '', email: 'bad' }).success).toBe(false);
    expect(blacklistReasonSchema.safeParse('bad').success).toBe(false);
    expect(blacklistReasonSchema.safeParse('Late delivery twice').success).toBe(true);
  });
});

describe('purchaseActionsFor', () => {
  const base = { requesterId: 'r', estimatedAmount: 1000, quotations: [q('a', 900)], approverId: null as string | null };
  it('lets only the requester submit a draft', () => {
    expect(purchaseActionsFor({ ...base, status: 'draft', userId: 'r', roles: ['project_officer'] }).actions).toContain('submit');
    expect(purchaseActionsFor({ ...base, status: 'draft', userId: 'x', roles: ['procurement'] }).actions).not.toContain('submit');
  });
  it('lets procurement mark ready only when quotations are enough', () => {
    expect(purchaseActionsFor({ ...base, status: 'submitted', userId: 'p', roles: ['procurement'] }).actions).toContain('ready');
    const few = purchaseActionsFor({ ...base, estimatedAmount: 60_000, status: 'submitted', userId: 'p', roles: ['procurement'] });
    expect(few.actions).not.toContain('ready');
    expect(few.note).toContain('3 different vendors');
  });
  it('keeps the requester out of approval and sends big amounts to the Executive Director', () => {
    expect(purchaseActionsFor({ ...base, status: 'quotations_attached', userId: 'r', roles: ['programme_manager'] }).actions).not.toContain('approve');
    expect(purchaseActionsFor({ ...base, status: 'quotations_attached', userId: 'm', roles: ['programme_manager'] }).actions).toContain('approve');
    const big = purchaseActionsFor({ ...base, estimatedAmount: 600_000, quotations: [q('a', 1), q('b', 2), q('c', 3)], status: 'quotations_attached', userId: 'm', roles: ['programme_manager'] });
    expect(big.actions).not.toContain('approve');
    expect(big.note).toContain('Executive Director');
  });
  it('stops the approver from issuing the order', () => {
    expect(purchaseActionsFor({ ...base, status: 'approved', userId: 'p', roles: ['procurement'], approverId: 'p' }).actions).not.toContain('issue_po');
    expect(purchaseActionsFor({ ...base, status: 'approved', userId: 'p', roles: ['procurement'], approverId: 'm' }).actions).toContain('issue_po');
  });
});
