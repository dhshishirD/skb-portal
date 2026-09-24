'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePermission } from '@/lib/permissions';
import { AppRole } from '@/lib/database.types';

async function getActorAndVerifyPermission(): Promise<{ actorId: string; userRoles: AppRole[] }> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Authentication required');
  }

  const { data: rolesData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);

  const userRoles: AppRole[] = (rolesData as Array<{ role: AppRole }> | null)?.map((r) => r.role) || [];
  requirePermission(userRoles, 'user.manage');

  return { actorId: user.id, userRoles };
}

export async function inviteUserAction(formData: FormData): Promise<{ success: boolean; message?: string }> {
  const { actorId } = await getActorAndVerifyPermission();

  const email = formData.get('email') as string;
  const fullName = formData.get('fullName') as string;
  const orgId = formData.get('orgId') as string;
  const role = formData.get('role') as AppRole;

  if (!email || !fullName || !role) {
    throw new Error('Email, Full Name, and Role are required.');
  }

  const adminClient = createAdminClient();

  // Invite user via Supabase Auth Admin API
  const { data: authData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  });

  if (inviteError || !authData.user) {
    throw new Error(inviteError?.message || 'Failed to send user invitation email.');
  }

  const userId = authData.user.id;

  // Update profile org_id
  if (orgId) {
    await (adminClient.from('profiles') as any).update({ org_id: orgId }).eq('id', userId);
  }

  // Assign initial role
  await (adminClient.from('user_roles') as any).insert({
    user_id: userId,
    role,
    granted_by: actorId,
  });

  return { success: true, message: `Invitation sent to ${email}` };
}

export async function updateUserRolesAction(userId: string, roles: AppRole[]): Promise<{ success: boolean }> {
  const { actorId } = await getActorAndVerifyPermission();

  const adminClient = createAdminClient();

  // Remove existing roles
  await (adminClient.from('user_roles') as any).delete().eq('user_id', userId);

  // Insert new roles
  const newRoles = roles.map((role) => ({
    user_id: userId,
    role,
    granted_by: actorId,
  }));

  if (newRoles.length > 0) {
    await (adminClient.from('user_roles') as any).insert(newRoles);
  }

  return { success: true };
}

export async function assignProjectAccessAction(
  userId: string,
  projectId: string,
  expiresAt: string | null
): Promise<{ success: boolean }> {
  const { actorId } = await getActorAndVerifyPermission();

  const adminClient = createAdminClient();

  await (adminClient.from('user_project_access') as any).upsert({
    user_id: userId,
    project_id: projectId,
    granted_by: actorId,
    expires_at: expiresAt,
  });

  return { success: true };
}

export async function assignLocationAccessAction(
  userId: string,
  locationId: string,
  expiresAt: string | null
): Promise<{ success: boolean }> {
  const { actorId } = await getActorAndVerifyPermission();

  const adminClient = createAdminClient();

  await (adminClient.from('user_location_access') as any).upsert({
    user_id: userId,
    location_id: locationId,
    granted_by: actorId,
    expires_at: expiresAt,
  });

  return { success: true };
}

export async function toggleUserActiveAction(userId: string, isActive: boolean): Promise<{ success: boolean }> {
  await getActorAndVerifyPermission();

  const adminClient = createAdminClient();

  await (adminClient.from('profiles') as any).update({ is_active: isActive }).eq('id', userId);

  return { success: true };
}
