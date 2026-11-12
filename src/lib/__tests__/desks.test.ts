import { describe, it, expect } from 'vitest';
import { canOpenPath, deskRuleFor, homeForRoles, NO_ACCESS_PATH, ROLE_LABELS, STAFF_ROLES } from '../desks';
import type { AppRole } from '../database.types';
import { ROLE_PERMISSIONS } from '../permissions';

// SKB's real hierarchy (Nov 2026) -> expected landing desk.
const SKB: Array<[string, AppRole[], string]> = [
  ['Chairman', ['board'], '/dashboard'],
  ['Executive Director', ['executive', 'super_admin'], '/dashboard'],
  ['HR & Admin', ['super_admin'], '/admin/users'],
  ['Program Officer', ['project_officer', 'field_officer'], '/projects'],
  ['IT Officer', ['it_officer'], '/admin/users'],
  ['Law Officer', ['legal_officer'], '/projects'],
  ['Field Officer', ['field_officer'], '/field-dashboard'],
  ['Donor', ['donor'], '/donor-dashboard'],
];

describe('homeForRoles', () => {
  it.each(SKB)('%s lands on the right desk', (_who, roles, home) => {
    expect(homeForRoles(roles)).toBe(home);
  });

  it('sends people without a role to the no-access page', () => {
    expect(homeForRoles([])).toBe(NO_ACCESS_PATH);
  });

  it('every person can open their own landing page', () => {
    for (const [, roles, home] of SKB) expect(canOpenPath(home, roles)).toBe(true);
  });
});

describe('canOpenPath', () => {
  it('uses the longest matching prefix', () => {
    expect(deskRuleFor('/admin/audit-log')?.prefix).toBe('/admin/audit-log');
    expect(deskRuleFor('/admin/users')?.prefix).toBe('/admin');
    expect(deskRuleFor('/me/profile')?.prefix).toBe('/me/profile');
    expect(deskRuleFor('/me/dashboard')?.prefix).toBe('/me');
    expect(deskRuleFor('/projectsX')).toBeNull();
  });

  it('keeps admin pages for Super Admin and IT only', () => {
    expect(canOpenPath('/admin/users', ['super_admin'])).toBe(true);
    expect(canOpenPath('/admin/users', ['it_officer'])).toBe(true);
    expect(canOpenPath('/admin/users', ['executive'])).toBe(false);
    expect(canOpenPath('/admin/users', ['board'])).toBe(false);
    expect(canOpenPath('/admin/users', ['project_officer', 'field_officer'])).toBe(false);
  });

  it('lets the Board and Executive read the audit log', () => {
    expect(canOpenPath('/admin/audit-log', ['board'])).toBe(true);
    expect(canOpenPath('/admin/audit-log', ['executive'])).toBe(true);
    expect(canOpenPath('/admin/audit-log', ['field_officer'])).toBe(false);
  });

  it('keeps donors inside the donor portal', () => {
    expect(canOpenPath('/donor-dashboard', ['donor'])).toBe(true);
    expect(canOpenPath('/dashboard', ['donor'])).toBe(false);
    expect(canOpenPath('/community', ['donor'])).toBe(false);
    expect(canOpenPath('/projects/abc/beneficiaries', ['donor'])).toBe(false);
  });

  it('beneficiary lists live inside projects: Board and IT cannot open them', () => {
    expect(canOpenPath('/projects/abc/beneficiaries', ['project_officer'])).toBe(true);
    expect(canOpenPath('/projects/abc/beneficiaries', ['it_officer'])).toBe(false);
  });

  it('Program Officers can use the field app', () => {
    expect(canOpenPath('/field-dashboard/new-beneficiary', ['project_officer', 'field_officer'])).toBe(true);
  });

  it('every staff member can open their own profile and the community', () => {
    for (const r of STAFF_ROLES) {
      expect(canOpenPath('/me/profile', [r])).toBe(true);
      expect(canOpenPath('/community', [r])).toBe(true);
    }
  });

  it('nobody without a role opens any desk', () => {
    expect(canOpenPath('/dashboard', [])).toBe(false);
    expect(canOpenPath('/home', [])).toBe(true); // not a desk; it redirects
  });
});

describe('role tables are complete', () => {
  it('every role has a label and a permission entry', () => {
    for (const role of Object.keys(ROLE_PERMISSIONS) as AppRole[]) {
      expect(ROLE_LABELS[role]).toBeTruthy();
    }
    expect(Object.keys(ROLE_LABELS).sort()).toEqual(Object.keys(ROLE_PERMISSIONS).sort());
  });
});
