import { describe, it, expect } from 'vitest';
import { UserApprovalService, DEFAULT_APPROVED_USERS } from '../userApprovalService';

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

  it('pre-seeds all 6 core team members as APPROVED', async () => {
    const allUsers = await UserApprovalService.getAllUsers();
    
    const requiredNames = [
      'Dr. Orakatul Jannat',
      'Md. Abu Huraira',
      'Safwanur Rahman',
      'Mizbah Uddin',
      'Daloyar Hassan',
      'Muktadir Rahaman'
    ];

    for (const name of requiredNames) {
      const found = allUsers.find(u => u.fullName === name);
      expect(found).toBeDefined();
      expect(found?.status).toBe('APPROVED');
    }
  });

  it('allows officers to update their own role, designation, and duty station dynamically', async () => {
    const updated = await UserApprovalService.updateFullProfile('10000000-0000-0000-0000-000000000003', {
      designation: 'Senior Medical Specialist & Field Clinic Lead',
      dutyStation: 'Teknaf Sub-Office & Cox\'s Bazar',
      phone: '+880 1711-999888'
    });

    expect(updated).not.toBeNull();
    expect(updated?.designation).toBe('Senior Medical Specialist & Field Clinic Lead');
    expect(updated?.dutyStation).toBe('Teknaf Sub-Office & Cox\'s Bazar');
    expect(updated?.phone).toBe('+880 1711-999888');
  });
});
