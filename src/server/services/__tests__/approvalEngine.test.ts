import { describe, it, expect } from 'vitest';
import { validateApprovalStep, calculateBurnRate } from '../approvalEngine';

describe('Phase 3 Approval Engine & Burn Rate Rules', () => {
  it('should DENY claimant from approving their own expense claim', () => {
    const res = validateApprovalStep({
      claimantId: 'user-123',
      actorId: 'user-123',
      actorRoles: ['programme_manager'],
      requiredRole: 'programme_manager',
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('Submitter cannot approve their own claim');
  });

  it('should DENY same actor from approving two consecutive steps', () => {
    const res = validateApprovalStep({
      claimantId: 'user-999',
      actorId: 'user-123',
      previousActorId: 'user-123',
      actorRoles: ['finance'],
      requiredRole: 'finance',
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('Same user cannot approve consecutive steps');
  });

  it('should ALLOW valid approver with required role', () => {
    const res = validateApprovalStep({
      claimantId: 'user-field',
      actorId: 'user-pm',
      actorRoles: ['programme_manager'],
      requiredRole: 'programme_manager',
    });
    expect(res.allowed).toBe(true);
  });

  it('should calculate burn rate percentage and remaining budget accurately', () => {
    const { burnRatePercent, remainingAmount } = calculateBurnRate(150000, 500000);
    expect(burnRatePercent).toBe(30.0);
    expect(remainingAmount).toBe(350000);
  });
});
