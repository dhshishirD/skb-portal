import { describe, expect, it } from 'vitest';
import { canManageDonors, canSetProjectDonor, donorInviteSchema, donorOrgSchema, donorUserStatus, grantCodeFor } from '../donors';
import { canOpenPath } from '../desks';

describe('donors', () => {
  it('lets the executive, programme manager and super admin manage donors; others not', () => {
    for (const r of ['executive', 'programme_manager', 'super_admin'] as const) expect(canManageDonors([r])).toBe(true);
    for (const r of ['project_officer', 'finance', 'donor', 'me_officer', 'it_officer'] as const) expect(canManageDonors([r])).toBe(false);
  });
  it('lets only the executive and programme manager set the donor of a project', () => {
    expect(canSetProjectDonor(['executive'])).toBe(true);
    expect(canSetProjectDonor(['programme_manager'])).toBe(true);
    expect(canSetProjectDonor(['super_admin'])).toBe(true);
    expect(canSetProjectDonor(['project_officer'])).toBe(false);
  });
  it('opens the Donors page for the three roles only', () => {
    expect(canOpenPath('/admin/donors', ['executive'])).toBe(true);
    expect(canOpenPath('/admin/donors', ['programme_manager'])).toBe(true);
    expect(canOpenPath('/admin/donors', ['super_admin'])).toBe(true);
    expect(canOpenPath('/admin/donors', ['project_officer'])).toBe(false);
    expect(canOpenPath('/admin/donors', ['donor'])).toBe(false);
    expect(canOpenPath('/admin/users', ['executive'])).toBe(false);
  });
  it('checks the donor organisation and the invitation', () => {
    expect(donorOrgSchema.safeParse({ name: 'IHH', country: '' }).success).toBe(true);
    expect(donorOrgSchema.safeParse({ name: 'I', country: '' }).success).toBe(false);
    const ok = donorInviteSchema.safeParse({ orgId: '11111111-1111-4111-8111-111111111111', email: ' Name@Donor.ORG ', fullName: 'Ayşe Demir' });
    expect(ok.success && ok.data.email).toBe('name@donor.org');
    expect(donorInviteSchema.safeParse({ orgId: 'x', email: 'a@b.co', fullName: 'Ayşe' }).success).toBe(false);
    expect(donorInviteSchema.safeParse({ orgId: '11111111-1111-4111-8111-111111111111', email: 'nope', fullName: 'Ayşe' }).success).toBe(false);
  });
  it('names the status of a donor user', () => {
    expect(donorUserStatus({ isActive: false, lastSignInAt: '2026-01-01' })).toBe('deactivated');
    expect(donorUserStatus({ isActive: true, lastSignInAt: null })).toBe('invited');
    expect(donorUserStatus({ isActive: true, lastSignInAt: '2026-01-01' })).toBe('active');
  });
  it('makes a unique grant code for a project', () => {
    expect(grantCodeFor('P-1', new Set())).toBe('G-P-1');
    expect(grantCodeFor('P-1', new Set(['G-P-1']))).toBe('G-P-1-2');
    expect(grantCodeFor('P-1', new Set(['G-P-1', 'G-P-1-2']))).toBe('G-P-1-3');
  });
});
