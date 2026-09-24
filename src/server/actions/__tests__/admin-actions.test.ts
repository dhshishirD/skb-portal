import { describe, it, expect } from 'vitest';
import { requirePermission } from '@/lib/permissions';
import { AppRole } from '@/lib/database.types';

describe('Admin Server Actions Security Guards', () => {
  it('should allow super_admin to perform user.manage actions', () => {
    const adminRoles: AppRole[] = ['super_admin'];
    expect(() => requirePermission(adminRoles, 'user.manage')).not.toThrow();
  });

  it('should DENY field_officer from executing admin actions', () => {
    const fieldRoles: AppRole[] = ['field_officer'];
    expect(() => requirePermission(fieldRoles, 'user.manage')).toThrow(
      "Permission denied: missing key 'user.manage'"
    );
  });

  it('should DENY donor from executing admin actions', () => {
    const donorRoles: AppRole[] = ['donor'];
    expect(() => requirePermission(donorRoles, 'user.manage')).toThrow(
      "Permission denied: missing key 'user.manage'"
    );
  });

  it('should DENY programme_manager from executing user management admin actions', () => {
    const pmRoles: AppRole[] = ['programme_manager'];
    expect(() => requirePermission(pmRoles, 'user.manage')).toThrow(
      "Permission denied: missing key 'user.manage'"
    );
  });
});
