import { AppRole } from './database.types';

export type PermissionKey =
  | 'project.read'
  | 'project.write'
  | 'logframe.write'
  | 'task.write'
  | 'document.write'
  | 'field_report.submit'
  | 'field_report.review'
  | 'field_report.validate'
  | 'budget.read'
  | 'budget.write'
  | 'expense.submit'
  | 'expense.verify'
  | 'expense.approve'
  | 'procurement.write'
  | 'donor_report.write'
  | 'donor_report.approve'
  | 'donor_portal.read'
  | 'beneficiary.read'
  | 'beneficiary.write'
  | 'user.manage'
  | 'audit.read';

/**
 * Role to permission keys mapping matrix.
 * Note: Database Row Level Security (RLS) is the authoritative security gate.
 * This client/server helper is for UI state and action guards only.
 */
export const ROLE_PERMISSIONS: Record<AppRole, PermissionKey[]> = {
  super_admin: ['user.manage', 'audit.read', 'project.read'],
  executive: [
    'project.read',
    'field_report.review',
    'budget.read',
    'expense.approve',
    'donor_report.approve',
    'audit.read',
  ],
  programme_manager: [
    'project.read',
    'project.write',
    'logframe.write',
    'task.write',
    'document.write',
    'field_report.review',
    'field_report.validate',
    'budget.read',
    'budget.write',
    'expense.approve',
    'donor_report.write',
    'donor_report.approve',
  ],
  project_officer: [
    'project.read',
    'project.write',
    'logframe.write',
    'task.write',
    'document.write',
    'field_report.review',
    'budget.read',
    'donor_report.write',
  ],
  field_officer: ['project.read', 'field_report.submit', 'expense.submit'],
  finance: [
    'project.read',
    'field_report.review',
    'budget.read',
    'budget.write',
    'expense.verify',
    'expense.approve',
    'donor_report.approve',
  ],
  procurement: ['project.read', 'budget.write', 'procurement.write'],
  me_officer: ['project.read', 'field_report.validate', 'donor_report.write'],
  donor: ['project.read', 'field_report.review', 'budget.read', 'donor_portal.read'],
  partner: ['project.read', 'field_report.submit', 'expense.submit'],
  auditor: [
    'project.read',
    'field_report.review',
    'budget.read',
    'donor_portal.read',
    'audit.read',
  ],
};

export function hasPermission(roles: AppRole[], permission: PermissionKey): boolean {
  return roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
}

export function requirePermission(roles: AppRole[], permission: PermissionKey): void {
  if (!hasPermission(roles, permission)) {
    throw new Error(`Permission denied: missing key '${permission}'`);
  }
}
