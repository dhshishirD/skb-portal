import type { AppRole } from './database.types';

/**
 * Who may open which part of the portal, and where each person lands after signing in.
 *
 * This is the UI/route layer only. Row Level Security in the database still decides which
 * rows anyone can read or change, so a page opened by mistake shows nothing it shouldn't.
 * Keep this file in step with the role list in supabase/migrations/0010_staff_roles.sql.
 */

const OPERATIONAL: AppRole[] = [
  'executive',
  'programme_manager',
  'project_officer',
  'field_officer',
  'finance',
  'procurement',
  'me_officer',
];

/** Everyone who works at SKB (matches public.is_staff_member() in migration 0011). */
export const STAFF_ROLES: AppRole[] = [...OPERATIONAL, 'super_admin', 'board', 'legal_officer', 'it_officer'];

/** Read-only oversight of all projects (matches public.has_oversight_read()). */
const OVERSIGHT: AppRole[] = ['board', 'legal_officer'];

interface DeskRule {
  /** Path prefix; the longest matching prefix wins. */
  prefix: string;
  roles: AppRole[];
}

export const DESK_RULES: DeskRule[] = [
  // Staff-wide
  { prefix: '/dashboard', roles: STAFF_ROLES },
  { prefix: '/community', roles: STAFF_ROLES },
  { prefix: '/me/profile', roles: [...STAFF_ROLES, 'donor', 'partner', 'auditor'] },

  // Programme work
  { prefix: '/projects', roles: [...OPERATIONAL, ...OVERSIGHT, 'auditor', 'partner'] },
  { prefix: '/beneficiaries', roles: ['project_officer', 'field_officer', 'me_officer', 'programme_manager', 'legal_officer'] },
  { prefix: '/me', roles: ['me_officer', 'programme_manager', 'project_officer', 'executive', 'board'] },
  { prefix: '/finance', roles: ['finance', 'programme_manager', 'project_officer', 'executive', 'board', 'auditor'] },
  { prefix: '/procurement', roles: ['procurement', 'programme_manager', 'project_officer', 'finance', 'executive', 'board'] },

  // Field app (Program Officers also hold field_officer)
  { prefix: '/field-dashboard', roles: ['field_officer', 'project_officer', 'partner'] },

  // Donor portal (executive / board may preview what donors see)
  { prefix: '/donor-dashboard', roles: ['donor', 'executive', 'board'] },

  // Administration
  { prefix: '/admin/audit-log', roles: ['super_admin', 'it_officer', 'executive', 'board', 'legal_officer', 'auditor'] },
  { prefix: '/admin', roles: ['super_admin', 'it_officer'] },
];

/** Landing page per role, in priority order: a person's first matching role decides. */
const HOME_BY_ROLE: Array<[AppRole, string]> = [
  ['executive', '/dashboard'],
  ['board', '/dashboard'],
  ['programme_manager', '/dashboard'],
  ['finance', '/finance/approvals'],
  ['project_officer', '/projects'],
  ['legal_officer', '/projects'],
  ['me_officer', '/me/dashboard'],
  ['procurement', '/procurement/requests'],
  ['field_officer', '/field-dashboard'],
  ['super_admin', '/admin/users'],
  ['it_officer', '/admin/users'],
  ['auditor', '/projects'],
  ['donor', '/donor-dashboard'],
  ['partner', '/field-dashboard'],
];

export const NO_ACCESS_PATH = '/no-access';

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + '/');
}

/** The rule that governs `pathname`, or null if the path is not a role-restricted desk. */
export function deskRuleFor(pathname: string): DeskRule | null {
  let best: DeskRule | null = null;
  for (const rule of DESK_RULES) {
    if (matchesPrefix(pathname, rule.prefix) && (!best || rule.prefix.length > best.prefix.length)) {
      best = rule;
    }
  }
  return best;
}

export function canOpenPath(pathname: string, roles: readonly AppRole[]): boolean {
  const rule = deskRuleFor(pathname);
  if (!rule) return true; // not a desk (e.g. /home, /no-access, /set-password)
  return roles.some((r) => rule.roles.includes(r));
}

/** Where a signed-in person should land. People without any role go to the no-access page. */
export function homeForRoles(roles: readonly AppRole[]): string {
  for (const [role, path] of HOME_BY_ROLE) {
    if (roles.includes(role)) return path;
  }
  return NO_ACCESS_PATH;
}

/** Human-readable role names for the admin screens. */
export const ROLE_LABELS: Record<AppRole, string> = {
  board: 'Board (read-only oversight)',
  executive: 'Executive (final approvals)',
  super_admin: 'Super Admin (accounts & roles)',
  it_officer: 'IT Officer (user support)',
  legal_officer: 'Legal Officer (compliance, read-only)',
  programme_manager: 'Programme Manager',
  project_officer: 'Project / Program Officer',
  field_officer: 'Field Officer',
  finance: 'Finance',
  procurement: 'Procurement',
  me_officer: 'M&E Officer',
  auditor: 'External Auditor (time-limited)',
  donor: 'Donor',
  partner: 'Implementing Partner',
};
