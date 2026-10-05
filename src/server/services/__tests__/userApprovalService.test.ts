import { describe, it, expect } from 'vitest';
import { UserApprovalService } from '../userApprovalService';

describe('UserApprovalService', () => {
  it('registers new user as PENDING_APPROVAL by default', async () => {
    const newOfficer = await UserApprovalService.registerGoogleUser({
      fullName: 'Test Program Officer',
      email: 'test.officer@skb.org.bd',
      requestedRole: 'Program Officer',
    });

    expect(newOfficer).toBeDefined();
    expect(newOfficer.email).toBe('test.officer@skb.org.bd');
    expect(newOfficer.status).toBe('PENDING_APPROVAL');
  });

  it('pre-approves admin email addresses', async () => {
    const adminUser = await UserApprovalService.registerGoogleUser({
      fullName: 'Daloyar Hassan',
      email: 'daloyar.pro@gmail.com',
      requestedRole: 'IT & Admin Officer',
    });

    expect(adminUser.status).toBe('APPROVED');
  });

  it('allows administrator to approve user account', async () => {
    const registered = await UserApprovalService.registerGoogleUser({
      fullName: 'New Field Officer',
      email: 'field.lead@skb.org.bd',
      requestedRole: 'Field Operations Officer',
    });

    const approved = await UserApprovalService.approveUser(registered.id, 'Daloyar Hassan (Super Admin)');
    expect(approved).not.toBeNull();
    expect(approved?.status).toBe('APPROVED');
    expect(approved?.approvedBy).toContain('Super Admin');
  });
});
