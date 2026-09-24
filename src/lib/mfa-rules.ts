import { AppRole } from './database.types';

export const PRIVILEGED_MFA_ROLES: AppRole[] = [
  'super_admin',
  'executive',
  'finance',
  'programme_manager',
];

export function requiresMFA(roles: AppRole[]): boolean {
  return roles.some((role) => PRIVILEGED_MFA_ROLES.includes(role));
}
