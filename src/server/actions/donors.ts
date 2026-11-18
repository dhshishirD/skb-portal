'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AppRole } from '@/lib/database.types';
import { authCallbackUrl, getSiteUrl } from '@/lib/siteUrl';
import {
  canManageDonors,
  canSetProjectDonor,
  donorInviteSchema,
  donorOrgSchema,
  grantCodeFor,
  type DonorsData,
  type DonorUser,
  type ProjectDonor,
} from '@/lib/donors';
import { getProjectById, isUuid } from '@/server/services/projectsData';

/*
 * Donors. Reading and writing use the trusted (service-role) client only AFTER the caller's roles are checked
 * here, because donor organisations and donor accounts are not writable by normal staff policies.
 * Setting a project's donor changes projects.grant_id with the SIGNED-IN user's session, so the database rule
 * (migration 0037) and the audit log see who did it.
 */

type Failure = { ok: false; error: string };
export type DonorsResult = { ok: true; data: DonorsData } | Failure;
export type DonorActionResult = { ok: true; message: string } | Failure;
export type ProjectDonorResult = { ok: true; data: ProjectDonor } | Failure;
const fail = (error: string): Failure => ({ ok: false, error });

async function getActor(): Promise<{ id: string; roles: AppRole[] } | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: rolesData }, { data: profile }] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', user.id),
    supabase.from('profiles').select('is_active').eq('id', user.id).maybeSingle(),
  ]);
  if (!(profile as { is_active?: boolean } | null)?.is_active) return null;
  return { id: user.id, roles: ((rolesData ?? []) as Array<{ role: AppRole }>).map((r) => r.role) };
}

async function requireManager(): Promise<{ id: string; roles: AppRole[] } | Failure> {
  const actor = await getActor();
  if (!actor) return fail('Please sign in again.');
  if (!canManageDonors(actor.roles)) return fail('You do not have permission to manage donors.');
  return actor;
}
const isFailure = (x: unknown): x is Failure => typeof x === 'object' && x !== null && 'ok' in x && (x as Failure).ok === false;

export async function getDonorsAction(): Promise<DonorsResult> {
  try {
    const actor = await requireManager();
    if (isFailure(actor)) return actor;
    const admin = createAdminClient();
    const [orgsRes, grantsRes, projectsRes, profilesRes, rolesRes, usersRes] = await Promise.all([
      (admin.from('organizations') as any).select('id, name, country').eq('type', 'donor').eq('is_active', true).order('name'),
      (admin.from('grants') as any).select('id, donor_org_id').is('deleted_at', null),
      (admin.from('projects') as any).select('grant_id').is('deleted_at', null).not('grant_id', 'is', null),
      (admin.from('profiles') as any).select('id, org_id, full_name, is_active'),
      (admin.from('user_roles') as any).select('user_id').eq('role', 'donor'),
      admin.auth.admin.listUsers({ page: 1, perPage: 500 }),
    ]);
    if (orgsRes.error || grantsRes.error || projectsRes.error || profilesRes.error || rolesRes.error) return fail('Could not load the donors. Please refresh the page.');
    if (usersRes.error) return fail('Could not read the sign-in details of the accounts. Please tell the programmer.');

    const grantOrg = new Map<string, string>(((grantsRes.data ?? []) as Array<{ id: string; donor_org_id: string }>).map((g) => [g.id, g.donor_org_id]));
    const counts = new Map<string, number>();
    for (const p of (projectsRes.data ?? []) as Array<{ grant_id: string }>) {
      const org = grantOrg.get(p.grant_id);
      if (org) counts.set(org, (counts.get(org) ?? 0) + 1);
    }
    const donorIds = new Set(((rolesRes.data ?? []) as Array<{ user_id: string }>).map((r) => r.user_id));
    const authBy = new Map((usersRes.data?.users ?? []).map((u) => [u.id, u]));
    const users: DonorUser[] = ((profilesRes.data ?? []) as Array<{ id: string; org_id: string | null; full_name: string; is_active: boolean }>)
      .filter((p) => donorIds.has(p.id) && p.org_id)
      .map((p) => ({
        id: p.id,
        orgId: p.org_id as string,
        fullName: p.full_name || authBy.get(p.id)?.email || 'Unnamed',
        email: authBy.get(p.id)?.email ?? null,
        isActive: p.is_active,
        lastSignInAt: authBy.get(p.id)?.last_sign_in_at ?? null,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
    return {
      ok: true,
      data: {
        orgs: ((orgsRes.data ?? []) as Array<{ id: string; name: string; country: string | null }>).map((o) => ({ ...o, projectCount: counts.get(o.id) ?? 0 })),
        users,
      },
    };
  } catch {
    return fail('Could not load the donors. Please refresh the page.');
  }
}

export async function createDonorOrgAction(values: { name: string; country: string }): Promise<DonorActionResult> {
  try {
    const actor = await requireManager();
    if (isFailure(actor)) return actor;
    const parsed = donorOrgSchema.safeParse(values);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Please check the details.');
    const admin = createAdminClient();
    const { data: dup } = await (admin.from('organizations') as any).select('id').eq('type', 'donor').ilike('name', parsed.data.name).limit(1);
    if (dup && dup.length > 0) return fail('A donor with this name already exists.');
    const { error } = await (admin.from('organizations') as any).insert({ name: parsed.data.name, country: parsed.data.country, type: 'donor', created_by: actor.id });
    if (error) return fail('Could not add the donor. Please try again.');
    revalidatePath('/admin/donors');
    return { ok: true, message: 'Donor added.' };
  } catch {
    return fail('Could not add the donor. Please try again.');
  }
}

/** Invite a person from a donor organisation. They get the Donor role only and are tied to that organisation. */
export async function inviteDonorUserAction(values: { orgId: string; email: string; fullName: string }): Promise<DonorActionResult> {
  try {
    const actor = await requireManager();
    if (isFailure(actor)) return actor;
    const parsed = donorInviteSchema.safeParse(values);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Please check the details.');
    const v = parsed.data;
    const admin = createAdminClient();
    const { data: org } = await (admin.from('organizations') as any).select('id, type, is_active').eq('id', v.orgId).maybeSingle();
    if (!org || org.type !== 'donor' || !org.is_active) return fail('Choose a donor organisation from the list.');

    const siteUrl = getSiteUrl(await headers());
    const { data, error } = await admin.auth.admin.inviteUserByEmail(v.email, {
      data: { full_name: v.fullName },
      redirectTo: authCallbackUrl(siteUrl, '/set-password'),
    });
    if (error || !data.user) {
      const msg = error?.message ?? 'Invite failed';
      return fail(/already been registered|already exists/i.test(msg) ? 'This email already has an account.' : 'Could not send the invitation. Please try again.');
    }
    const userId = data.user.id;
    const { error: profErr } = await (admin.from('profiles') as any)
      .update({ full_name: v.fullName, designation: 'Donor representative', org_id: v.orgId, is_active: true })
      .eq('id', userId);
    if (profErr) return fail('The invitation was sent, but the account could not be set up. Please tell the programmer.');
    const { error: roleErr } = await (admin.from('user_roles') as any).insert({ user_id: userId, role: 'donor', granted_by: actor.id });
    if (roleErr) return fail('The invitation was sent, but the donor role could not be set. Please tell the programmer.');
    revalidatePath('/admin/donors');
    return { ok: true, message: `Invitation sent to ${v.email}.` };
  } catch {
    return fail('Could not send the invitation. Please try again.');
  }
}

/** Switch a donor user off (or on again). A switched-off person is signed out everywhere. */
export async function setDonorUserActiveAction(userId: string, isActive: boolean): Promise<DonorActionResult> {
  try {
    const actor = await requireManager();
    if (isFailure(actor)) return actor;
    if (!isUuid(userId)) return fail('Person not found.');
    const admin = createAdminClient();
    const { data: role } = await (admin.from('user_roles') as any).select('user_id').eq('user_id', userId).eq('role', 'donor').maybeSingle();
    if (!role) return fail('This person is not a donor user.');
    const { error } = await (admin.from('profiles') as any).update({ is_active: isActive }).eq('id', userId);
    if (error) return fail('Could not save. Please try again.');
    if (!isActive) await admin.auth.admin.signOut(userId).catch(() => undefined);
    revalidatePath('/admin/donors');
    return { ok: true, message: isActive ? 'Switched on.' : 'Switched off and signed out.' };
  } catch {
    return fail('Could not save. Please try again.');
  }
}

/** The donor of one project, and the donors that can be chosen. */
export async function getProjectDonorAction(projectId: string): Promise<ProjectDonorResult> {
  try {
    if (!isUuid(projectId)) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canSetProjectDonor(actor.roles)) return fail('You do not have permission to see the donor of this project.');
    const project = await getProjectById(projectId);
    if (!project) return fail('Project not found.');
    const admin = createAdminClient();
    const [orgs, grant] = await Promise.all([
      (admin.from('organizations') as any).select('id, name').eq('type', 'donor').eq('is_active', true).order('name'),
      (project as any).grant_id ? (admin.from('grants') as any).select('donor_org_id').eq('id', (project as any).grant_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    if (orgs.error) return fail('Could not load the donors. Please refresh the page.');
    const options = (orgs.data ?? []) as Array<{ id: string; name: string }>;
    const donorOrgId: string | null = grant.data?.donor_org_id ?? null;
    return {
      ok: true,
      data: { donorOrgId, donorName: options.find((o) => o.id === donorOrgId)?.name ?? null, options, canSet: project.stage !== 'closed', closed: project.stage === 'closed' },
    };
  } catch {
    return fail('Could not load the donor. Please refresh the page.');
  }
}

/** Set (or clear) the one donor of a project. */
export async function setProjectDonorAction(projectId: string, donorOrgId: string | null): Promise<DonorActionResult> {
  try {
    if (!isUuid(projectId) || (donorOrgId !== null && !isUuid(donorOrgId))) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canSetProjectDonor(actor.roles)) return fail('Only the Executive Director, the Programme Manager or the Super Admin can change the donor of a project.');
    let project = (await getProjectById(projectId)) as any;
    if (!project && actor.roles.includes('super_admin')) {
      // the Super Admin does not read every project through the database rules; the role was checked above
      const { data } = await (createAdminClient().from('projects') as any)
        .select('id, code, title, stage, grant_id, budget_currency, budget_amount')
        .eq('id', projectId)
        .is('deleted_at', null)
        .maybeSingle();
      project = data;
    }
    if (!project) return fail('Project not found.');
    if (project.stage === 'closed') return fail('This project is closed, so the donor cannot be changed.');

    const admin = createAdminClient();
    let grantId: string | null = null;
    if (donorOrgId) {
      const { data: org } = await (admin.from('organizations') as any).select('id, type, is_active').eq('id', donorOrgId).maybeSingle();
      if (!org || org.type !== 'donor' || !org.is_active) return fail('Choose a donor from the list.');

      if (project.grant_id) {
        const { data: shared } = await (admin.from('projects') as any).select('id').eq('grant_id', project.grant_id).neq('id', projectId).limit(1);
        if (!shared || shared.length === 0) {
          // only this project uses its grant: move the grant to the new donor
          const { error } = await (admin.from('grants') as any).update({ donor_org_id: donorOrgId }).eq('id', project.grant_id);
          if (error) return fail('Could not change the donor. Please try again.');
          grantId = project.grant_id;
        }
      }
      if (!grantId) {
        const { data: codes } = await (admin.from('grants') as any).select('code').like('code', `G-${project.code}%`);
        const code = grantCodeFor(project.code, new Set(((codes ?? []) as Array<{ code: string }>).map((c) => c.code)));
        const { data: created, error } = await (admin.from('grants') as any)
          .insert({
            code,
            title: project.title,
            donor_org_id: donorOrgId,
            currency: /^[A-Z]{3}$/.test(project.budget_currency ?? '') ? project.budget_currency : 'BDT',
            total_amount: Number(project.budget_amount ?? 0),
            status: 'active',
            created_by: actor.id,
          })
          .select('id')
          .single();
        if (error || !created) return fail('Could not change the donor. Please try again.');
        grantId = created.id;
      }
    }
    const supabase = await createServerClient();
    const { error } = await (supabase as any).rpc('set_project_donor', { _project_id: projectId, _grant_id: grantId });
    if (error) return fail('You do not have permission to change the donor of this project.');
    revalidatePath(`/projects/${projectId}/overview`);
    revalidatePath('/admin/donors');
    return { ok: true, message: donorOrgId ? 'Donor saved.' : 'Donor removed from the project.' };
  } catch {
    return fail('Could not change the donor. Please try again.');
  }
}
