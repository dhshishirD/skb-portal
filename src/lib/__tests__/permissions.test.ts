import { describe, it, expect } from 'vitest';
import { ROLE_PERMISSIONS, hasPermission } from '../permissions';
import { AppRole } from '../database.types';

describe('Permissions Matrix Layer', () => {
  it('should cover all 11 roles in the system', () => {
    const roles: AppRole[] = [
      'super_admin',
      'executive',
      'programme_manager',
      'project_officer',
      'field_officer',
      'finance',
      'procurement',
      'me_officer',
      'donor',
      'partner',
      'auditor',
    ];
    roles.forEach((role) => {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
    });
  });

  it('should correctly allow super_admin user management', () => {
    expect(hasPermission(['super_admin'], 'user.manage')).toBe(true);
    expect(hasPermission(['field_officer'], 'user.manage')).toBe(false);
  });

  it('should correctly allow field_officer report submission', () => {
    expect(hasPermission(['field_officer'], 'field_report.submit')).toBe(true);
    expect(hasPermission(['auditor'], 'field_report.submit')).toBe(false);
  });

  it('should correctly allow finance expense verification and approval', () => {
    expect(hasPermission(['finance'], 'expense.verify')).toBe(true);
    expect(hasPermission(['finance'], 'expense.approve')).toBe(true);
    expect(hasPermission(['field_officer'], 'expense.approve')).toBe(false);
  });
});
