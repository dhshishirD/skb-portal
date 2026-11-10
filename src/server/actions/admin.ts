'use server';

import { headers } from 'next/headers';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasPermission, type PermissionKey } from '@/lib/permissions';
import type { AppRole } from '@/lib/database.types';
import { authCallbackUrl, getSiteUrl } from '@/lib/siteUrl';
import {
  checkRoleChange,
  createsReportingLoop,
  inviteSchema,
  sortByHierarchy,
  staffDetailsSchema,
} from '@/lib/staffAdmin';

/*
 * Staff administration. Accounts are INVITE-ONLY:
 *   1. A Super Admin fills in name, email, designation, reports-to and role(s).
 *   2. Supabase sends the invite email; the database trigger creates the profile at once.
 *   3. This action sets the profile details and roles, so the person lands on the right
 *      desk the first time they sign in (after setting their own password).
 *
 * Every action re-checks the caller's roles on the server before using the service-role
 * client (which bypasses RLS).
 */

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

async function getActor(permission: PermissionKey): Promise<{ actorId: string; roles: AppRole[] }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required');

  const [{ data: rolesData }, { data: profile }] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', user.id),
    supabase.from('profiles').select('is_active').eq('id', user.id).maybeSingle(),
  ]);
  const roles = ((rolesData ?? []) as Array<{ role: AppRole }>).map((r) => r.role);
  if (!(profile as { is_active?: boolean } | null)?.is_active || !hasPermission(roles, permission)) {
    throw new Error(`Permission denied: missing key '${permission}'`);
  }
  return { actorId: user.id, roles };
}

function fail(err: unknown): { ok: false; error: string } {
  return { ok: false, error: err instanceof Error ? err.message : 'Something went wrong' };
}

async function internalOrgId(admin: ReturnType<typeof createAdminClient>): Promise<string | null> {
  const { data } = await (admin.from('organizations') as any)
    .select('id')
    .eq('type', 'internal')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1);
  return data?.[0]?.id ?? null;
}

async function activeSuperAdminIds(admin: ReturnType<typeof createAdminClient>): Promise<string[]> {
  const { data } = await (admin.from('user_roles') as any)
    .select('user_id, profiles!inner(is_active)')
    .eq('role', 'super_admin')
    .eq('profiles.is_active', true);
  return ((data ?? []) as Array<{ user_id: string }>).map((r) => r.user_id);
}

async function managerMap(admin: ReturnType<typeof createAdminClient>): Promise<Map<string, string | null>> {
  const { data } = await (admin.from('profiles') as any).select('id, reports_to');
  return new Map(((data ?? []) as Array<{ id: string; reports_to: string | null }>).map((p) => [p.id, p.reports_to]));
}

async function replaceRoles(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  roles: readonly AppRole[],
  actorId: string
): Promise<void> {
  const { error: delErr } = await (admin.from('user_roles') as any).delete().eq('user_id', userId);
  if (delErr) throw new Error(`Could not update roles: ${delErr.message}`);
  if (roles.length === 0) return;
  const { error: insErr } = await (admin.from('user_roles') as any).insert(
    roles.map((role) => ({ user_id: userId, role, granted_by: actorId }))
  );
  if (insErr) throw new Error(`Could not update roles: ${insErr.message}`);
}

// ---------------------------------------------------------------------------------------

export interface StaffRow {
  id: string;
  email: string | null;
  fullName: string;
  designation: string | null;
  reportsTo: string | null;
  displayOrder: number;
  isActive: boolean;
  roles: AppRole[];
  invitedAt: string | null;
  lastSignInAt: string | null;
  hasSetPassword: boolean;
}

/** Staff directory for Admin → Users (Super Admin and IT Officer). */
export async function listStaffAction(): Promise<{ ok: true; staff: StaffRow[]; canManage: boolean } | { ok: false; error: string }> {
  try {
    const { roles } = await getActor('user.view');
    const admin = createAdminClient();

    const [profilesRes, rolesRes, usersRes] = await Promise.all([
      (admin.from('profiles') as any).select('id, full_name, designation, reports_to, display_order, is_active'),
      (admin.from('user_roles') as any).select('user_id, role'),
      admin.auth.admin.listUsers({ page: 1, perPage: 500 }),
    ]);
    if (profilesRes.error) throw new Error(profilesRes.error.message);

    const rolesBy = new Map<string, AppRole[]>();
    for (const r of (rolesRes.data ?? []) as Array<{ user_id: string; role: AppRole }>) {
      rolesBy.set(r.user_id, [...(rolesBy.get(r.user_id) ?? []), r.role]);
    }
    const usersBy = new Map((usersRes.data?.users ?? []).map((u) => [u.id, u]));

    const staff: StaffRow[] = (profilesRes.data as any[]).map((p) => {
      const u = usersBy.get(p.id);
      return {
        id: p.id,
        email: u?.email ?? null,
        fullName: p.full_name || u?.email || 'Unnamed',
        designation: p.designation ?? null,
        reportsTo: p.reports_to ?? null,
        displayOrder: p.display_order ?? 100,
        isActive: p.is_active,
        roles: rolesBy.get(p.id) ?? [],
        invitedAt: (u as any)?.invited_at ?? null,
        lastSignInAt: u?.last_sign_in_at ?? null,
        hasSetPassword: Boolean(u?.last_sign_in_at || u?.email_confirmed_at),
      };
    });

    return { ok: true, staff: sortByHierarchy(staff), canManage: hasPermission(roles, 'user.manage') };
  } catch (err) {
    return fail(err);
  }
}

/** Invite a new staff member with their role(s) already set. Super Admin only. */
export async function inviteStaffAction(formData: FormData): Promise<ActionResult> {
  try {
    const { actorId } = await getActor('user.manage');
    const parsed = inviteSchema.safeParse({
      email: formData.get('email') ?? '',
      fullName: formData.get('fullName') ?? '',
      designation: formData.get('designation') ?? '',
      reportsTo: formData.get('reportsTo') ?? '',
      displayOrder: formData.get('displayOrder') || 100,
      roles: formData.getAll('roles'),
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    const input = parsed.data;

    const admin = createAdminClient();
    const siteUrl = getSiteUrl(await headers());
    const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
      data: { full_name: input.fullName },
      redirectTo: authCallbackUrl(siteUrl, '/set-password'),
    });
    if (error || !data.user) {
      const msg = error?.message ?? 'Invite failed';
      return {
        ok: false,
        error: /already been registered|already exists/i.test(msg)
          ? 'This email already has an account. Edit it in the staff list instead.'
          : msg,
      };
    }

    const userId = data.user.id;
    const orgId = await internalOrgId(admin);
    // The on_auth_user_created trigger has already inserted the profile row.
    const { error: profErr } = await (admin.from('profiles') as any)
      .update({
        full_name: input.fullName,
        designation: input.designation,
        reports_to: input.reportsTo,
        display_order: input.displayOrder,
        org_id: orgId,
        is_active: true,
      })
      .eq('id', userId);
    if (profErr) throw new Error(`Invite sent, but the profile could not be updated: ${profErr.message}`);

    await replaceRoles(admin, userId, input.roles, actorId);
    return { ok: true, message: `Invitation sent to ${input.email}.` };
  } catch (err) {
    return fail(err);
  }
}

/** Update designation, reports-to, order, roles and active flag. Super Admin only. */
export async function updateStaffAction(userId: string, formData: FormData): Promise<ActionResult> {
  try {
    const { actorId } = await getActor('user.manage');
    const parsed = staffDetailsSchema.safeParse({
      fullName: formData.get('fullName') ?? '',
      designation: formData.get('designation') ?? '',
      reportsTo: formData.get('reportsTo') ?? '',
      displayOrder: formData.get('displayOrder') || 100,
      roles: formData.getAll('roles'),
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    const input = parsed.data;
    const isActive = formData.get('isActive') === 'on' || formData.get('isActive') === 'true';

    const admin = createAdminClient();
    const guard = checkRoleChange({
      actorId,
      targetId: userId,
      newRoles: input.roles,
      newActive: isActive,
      activeSuperAdminIds: await activeSuperAdminIds(admin),
    });
    if (guard) return { ok: false, error: guard };

    if (createsReportingLoop(userId, input.reportsTo, await managerMap(admin))) {
      return { ok: false, error: 'That reporting line would create a loop.' };
    }

    const { error } = await (admin.from('profiles') as any)
      .update({
        full_name: input.fullName,
        designation: input.designation,
        reports_to: input.reportsTo,
        display_order: input.displayOrder,
        is_active: isActive,
      })
      .eq('id', userId);
    if (error) throw new Error(error.message);

    await replaceRoles(admin, userId, input.roles, actorId);

    // A deactivated person is signed out everywhere.
    if (!isActive) await admin.auth.admin.signOut(userId).catch(() => undefined);

    return { ok: true, message: 'Saved.' };
  } catch (err) {
    return fail(err);
  }
}

/** Re-send the invite (not yet accepted) or a password-reset email. Super Admin + IT Officer. */
export async function resendAccessEmailAction(userId: string): Promise<ActionResult> {
  try {
    await getActor('user.view');
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user?.email) return { ok: false, error: 'User not found.' };

    const siteUrl = getSiteUrl(await headers());
    const redirectTo = authCallbackUrl(siteUrl, '/set-password');
    const neverSignedIn = !data.user.last_sign_in_at;
    // An invite only works for an account whose email is not confirmed yet. An account that was
    // created already confirmed (never signed in) gets a set-password email instead.
    const sendInvite = neverSignedIn && !data.user.email_confirmed_at;

    const res = sendInvite
      ? await admin.auth.admin.inviteUserByEmail(data.user.email, { redirectTo })
      : await admin.auth.resetPasswordForEmail(data.user.email, { redirectTo });
    if (res.error) {
      return {
        ok: false,
        error: /already been registered|already exists/i.test(res.error.message)
          ? 'This account already exists. Use the password email instead.'
          : res.error.message,
      };
    }
    return { ok: true, message: sendInvite ? 'Invite re-sent.' : neverSignedIn ? 'Set-password email sent.' : 'Password-reset email sent.' };
  } catch (err) {
    return fail(err);
  }
}

/** Give a staff member access to one project (optionally until a date). Super Admin only. */
export async function assignProjectAccessAction(
  userId: string,
  projectId: string,
  expiresAt: string | null
): Promise<ActionResult> {
  try {
    const { actorId } = await getActor('user.manage');
    const admin = createAdminClient();
    const { error } = await (admin.from('user_project_access') as any).upsert({
      user_id: userId,
      project_id: projectId,
      granted_by: actorId,
      expires_at: expiresAt,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function assignLocationAccessAction(
  userId: string,
  locationId: string,
  expiresAt: string | null
): Promise<ActionResult> {
  try {
    const { actorId } = await getActor('user.manage');
    const admin = createAdminClient();
    const { error } = await (admin.from('user_location_access') as any).upsert({
      user_id: userId,
      location_id: locationId,
      granted_by: actorId,
      expires_at: expiresAt,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
