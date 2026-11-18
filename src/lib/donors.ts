import { z } from 'zod';
import type { AppRole } from './database.types';

/**
 * Donors: the organisations that fund projects, the people from them who sign in, and which project belongs to
 * which donor. One project has at most one donor. A donor sees only the projects of its own organisation
 * (decided by the database: grants.donor_org_id and projects.grant_id).
 */

/** Who may add donor organisations, invite donor users and set the donor of a project. */
const MANAGERS: AppRole[] = ['executive', 'programme_manager', 'super_admin'];
export const canManageDonors = (roles: readonly AppRole[]) => roles.some((r) => MANAGERS.includes(r));

/** Who may change the donor of a project (also enforced by the database, migration 0037). */
const LINKERS: AppRole[] = ['executive', 'programme_manager', 'super_admin'];
export const canSetProjectDonor = (roles: readonly AppRole[]) => roles.some((r) => LINKERS.includes(r));

export const donorOrgSchema = z.object({
  name: z.string().trim().min(2, 'Enter the donor name (at least 2 letters)').max(200, 'The name is too long'),
  country: z
    .string()
    .trim()
    .max(80, 'The country is too long')
    .transform((v) => (v === '' ? null : v)),
});

export const donorInviteSchema = z.object({
  orgId: z.string().uuid('Choose the donor organisation'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  fullName: z.string().trim().min(2, 'Enter the full name').max(120, 'The name is too long'),
});

export interface DonorOrg {
  id: string;
  name: string;
  country: string | null;
  projectCount: number;
}
export interface DonorUser {
  id: string;
  orgId: string;
  fullName: string;
  email: string | null;
  isActive: boolean;
  lastSignInAt: string | null;
}
export interface DonorsData {
  orgs: DonorOrg[];
  users: DonorUser[];
}
export interface ProjectDonor {
  donorOrgId: string | null;
  donorName: string | null;
  options: Array<{ id: string; name: string }>;
  canSet: boolean;
  closed: boolean;
}

export const donorUserStatus = (u: Pick<DonorUser, 'isActive' | 'lastSignInAt'>): 'deactivated' | 'invited' | 'active' =>
  !u.isActive ? 'deactivated' : u.lastSignInAt ? 'active' : 'invited';

/** The code of the grant that is made for a project: "G-" + the project code, made unique if taken. */
export function grantCodeFor(projectCode: string, taken: ReadonlySet<string>): string {
  const base = `G-${projectCode}`.slice(0, 40);
  if (!taken.has(base)) return base;
  for (let i = 2; i < 100; i++) {
    const c = `${base}-${i}`;
    if (!taken.has(c)) return c;
  }
  return `${base}-${Date.now()}`;
}
