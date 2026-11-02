import { z } from 'zod';
import type { AppRole } from './database.types';

/** Roles a Super Admin can give to SKB staff from the Admin → Users screen. */
export const STAFF_ASSIGNABLE_ROLES = [
  'board',
  'executive',
  'super_admin',
  'it_officer',
  'legal_officer',
  'programme_manager',
  'project_officer',
  'field_officer',
  'finance',
  'procurement',
  'me_officer',
] as const satisfies readonly AppRole[];

const roleEnum = z.enum(STAFF_ASSIGNABLE_ROLES);

const optionalUuid = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .pipe(z.string().uuid().nullable());

export const staffDetailsSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(120),
  designation: z
    .string()
    .trim()
    .max(120)
    .transform((v) => (v === '' ? null : v)),
  reportsTo: optionalUuid,
  displayOrder: z.coerce.number().int().min(0).max(999).default(100),
  roles: z.array(roleEnum).min(1, 'Choose at least one role').max(6),
});

export const inviteSchema = staffDetailsSchema.extend({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
});

export type StaffDetails = z.infer<typeof staffDetailsSchema>;
export type InviteInput = z.infer<typeof inviteSchema>;

export interface RoleChangeContext {
  actorId: string;
  targetId: string;
  newRoles: readonly AppRole[];
  newActive: boolean;
  /** user_ids that currently hold super_admin AND are active. */
  activeSuperAdminIds: readonly string[];
}

/**
 * Guard rails for editing a staff account. Returns an error message, or null if allowed.
 * - nobody can remove their own Super Admin role or deactivate themselves (no self-lockout)
 * - the last active Super Admin cannot be removed or deactivated
 */
export function checkRoleChange(ctx: RoleChangeContext): string | null {
  const targetIsSuperAdminNow = ctx.activeSuperAdminIds.includes(ctx.targetId);
  const remainsSuperAdmin = ctx.newRoles.includes('super_admin') && ctx.newActive;

  if (ctx.actorId === ctx.targetId) {
    if (!ctx.newActive) return 'You cannot deactivate your own account.';
    if (targetIsSuperAdminNow && !remainsSuperAdmin) {
      return 'You cannot remove your own Super Admin role. Ask another Super Admin.';
    }
  }

  if (targetIsSuperAdminNow && !remainsSuperAdmin && ctx.activeSuperAdminIds.length <= 1) {
    return 'This is the last active Super Admin. Make someone else Super Admin first.';
  }
  return null;
}

/** reports_to must not create a loop (A reports to B reports to A). */
export function createsReportingLoop(
  targetId: string,
  reportsTo: string | null,
  managerOf: ReadonlyMap<string, string | null>
): boolean {
  let current = reportsTo;
  const seen = new Set<string>();
  while (current) {
    if (current === targetId) return true;
    if (seen.has(current)) return true;
    seen.add(current);
    current = managerOf.get(current) ?? null;
  }
  return false;
}

/** Org-chart order: display_order first, then name. */
export function sortByHierarchy<T extends { displayOrder: number; fullName: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.displayOrder - b.displayOrder || a.fullName.localeCompare(b.fullName));
}
