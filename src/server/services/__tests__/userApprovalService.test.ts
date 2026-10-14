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
      requestedRole: 'Program Officer',
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

  it('pre-seeds all 7 organogram team members as APPROVED and excludes Safwanur Rahman', async () => {
    const allUsers = await UserApprovalService.getAllUsers();
    
    const requiredOrganogram = [
      { name: 'Md. Abu Huraira', role: 'Executive Director' },
      { name: 'Dr. Orakatul Jannat', role: 'Chairman' },
      { name: 'Daloyar Hassan', role: 'Program Officer' },
      { name: 'Emran Ahmed', role: 'Program Officer' },
      { name: 'Mizbah Uddin', role: 'Program Officer' },
      { name: 'Muktadir Rahaman', role: 'IT Officer' },
      { name: 'Aminul Islam Bulbul', role: 'Law Officer' },
    ];

    for (const item of requiredOrganogram) {
      const found = allUsers.find(u => u.fullName === item.name);
      expect(found).toBeDefined();
      expect(found?.status).toBe('APPROVED');
      expect(found?.requestedRole).toBe(item.role);
    }

    // Explicitly verify Safwanur Rahman is not present
    const safwanur = allUsers.find(u => u.fullName.includes('Safwanur'));
    expect(safwanur).toBeUndefined();
  });

  it('allows officers to update their own role, designation, and duty station dynamically', async () => {
    const updated = await UserApprovalService.updateFullProfile('10000000-0000-0000-0000-000000000007', {
      designation: 'Senior Legal Counsel & Compliance Lead',
      dutyStation: 'Dhaka HQ',
      phone: '+880 1711-777888'
    });

    expect(updated).not.toBeNull();
    expect(updated?.designation).toBe('Senior Legal Counsel & Compliance Lead');
    expect(updated?.phone).toBe('+880 1711-777888');
  });
});
