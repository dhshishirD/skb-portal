'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AppRole } from '@/lib/database.types';
import {
  canArchiveProjects,
  canAssignOfficers,
  canCreateProjects,
  canEditProjects,
  projectInputSchema,
  projectInputToRow,
  type ProjectFormValues,
  type ProjectRow,
} from '@/lib/projects';
import { getActor, getOwnOrganization, isUuid, listProjects } from '@/server/services/projectsData';

/*
 * Projects & Grants: portfolio actions.
 *
 * Reads and writes run as the signed-in user, so Row Level Security (migration 0012) is the
 * real gate. The role checks below give clearer error messages and fail fast. Only the staff
 * list for officer assignment uses the service-role client, after the caller is checked.
 */

type Failure = { ok: false; error: string; fieldErrors?: Record<string, string> };
export type ActionResult = { ok: true; message?: string } | Failure;
export type DataResult<T> = { ok: true; message?: string; data: T } | Failure;

const fail = (error: string, fieldErrors?: Record<string, string>): Failure => ({
  ok: false,
  error,
  fieldErrors,
});

function friendlyDbError(message: string): string {
  if (/projects_code_key|duplicate key/i.test(message)) return 'A project with this code already exists. Use a different code.';
  if (/row-level security|violates row-level|permission denied|42501/i.test(message)) return 'You do not have permission to do this.';
  if (/only the Executive Director/i.test(message)) return 'Only the Executive Director can archive a project.';
  return 'The database could not save this. Please try again.';
}

function validate(values: ProjectFormValues) {
  const parsed = projectInputSchema.safeParse(values);
  if (parsed.success) return { ok: true as const, input: parsed.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false as const, fieldErrors };
}

// ---------------------------------------------------------------------------------------

export interface PortfolioData {
  projects: ProjectRow[];
  roles: AppRole[];
  userId: string;
}

/** Projects the signed-in user may see, plus their roles so the screen can show the right buttons. */
export async function listProjectsAction(): Promise<DataResult<PortfolioData>> {
  try {
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const projects = await listProjects();
    return { ok: true, data: { projects, roles: actor.roles, userId: actor.userId } };
  } catch {
    return fail('Could not load projects. Please refresh the page.');
  }
}

export async function createProjectAction(values: ProjectFormValues): Promise<DataResult<{ id: string }>> {
  try {
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canCreateProjects(actor.roles)) return fail('You do not have permission to create projects.');

    const v = validate(values);
    if (!v.ok) return fail('Please fix the highlighted fields.', v.fieldErrors);

    const supabase = await createClient();
    const { data, error } = await (supabase.from('projects') as any)
      .insert({ ...projectInputToRow(v.input), created_by: actor.userId })
      .select('id')
      .single();
    if (error) {
      if (/projects_code_key|duplicate key/i.test(error.message)) {
        return fail('A project with this code already exists.', { code: 'This code is already used.' });
      }
      return fail(friendlyDbError(error.message));
    }
    revalidatePath('/projects');
    return { ok: true, message: 'Project created.', data: { id: (data as { id: string }).id } };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

export async function updateProjectAction(id: string, values: ProjectFormValues): Promise<ActionResult> {
  try {
    if (!isUuid(id)) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canEditProjects(actor.roles)) return fail('You do not have permission to edit projects.');

    const v = validate(values);
    if (!v.ok) return fail('Please fix the highlighted fields.', v.fieldErrors);

    const supabase = await createClient();
    const { data, error } = await (supabase.from('projects') as any)
      .update(projectInputToRow(v.input))
      .eq('id', id)
      .is('deleted_at', null)
      .select('id');
    if (error) {
      if (/projects_code_key|duplicate key/i.test(error.message)) {
        return fail('A project with this code already exists.', { code: 'This code is already used.' });
      }
      return fail(friendlyDbError(error.message));
    }
    if (!data || data.length === 0) return fail('Project not found, or you are not assigned to it.');
    revalidatePath('/projects');
    revalidatePath(`/projects/${id}`, 'layout');
    return { ok: true, message: 'Project saved.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

/** Archive hides a project from every list. Only the Executive Director can do it. */
export async function archiveProjectAction(id: string): Promise<ActionResult> {
  try {
    if (!isUuid(id)) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canArchiveProjects(actor.roles)) return fail('Only the Executive Director can archive a project.');

    const supabase = await createClient();
    const { data, error } = await (supabase.from('projects') as any)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id');
    if (error) return fail(friendlyDbError(error.message));
    if (!data || data.length === 0) return fail('Project not found.');
    revalidatePath('/projects');
    return { ok: true, message: 'Project archived.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

// ---------------------------------------------------------------------------------------
// Officer assignment (Super Admin or Programme Manager)

export interface OfficerOption {
  id: string;
  fullName: string;
  designation: string | null;
}

export interface OfficerAssignment {
  candidates: OfficerOption[];
  assignedIds: string[];
}

/** Active Program Officers, and which of them are assigned to this project. */
export async function getOfficerAssignmentAction(projectId: string): Promise<DataResult<OfficerAssignment>> {
  try {
    if (!isUuid(projectId)) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canAssignOfficers(actor.roles)) return fail('Only a Super Admin or Programme Manager can assign officers.');

    const admin = createAdminClient();
    const { data: roleRows, error: roleErr } = await (admin.from('user_roles') as any)
      .select('user_id, profiles!inner(id, full_name, designation, is_active, display_order)')
      .eq('role', 'project_officer')
      .eq('profiles.is_active', true);
    if (roleErr) return fail('Could not load staff.');

    const candidates = ((roleRows ?? []) as Array<{ profiles: { id: string; full_name: string; designation: string | null; display_order: number } }>)
      .map((r) => r.profiles)
      .sort((a, b) => a.display_order - b.display_order || a.full_name.localeCompare(b.full_name))
      .map((p) => ({ id: p.id, fullName: p.full_name, designation: p.designation }));

    const supabase = await createClient();
    const { data: access, error: accErr } = await (supabase.from('user_project_access') as any)
      .select('user_id, expires_at')
      .eq('project_id', projectId);
    if (accErr) return fail('Could not load assignments.');
    const now = Date.now();
    const assignedIds = ((access ?? []) as Array<{ user_id: string; expires_at: string | null }>)
      .filter((a) => !a.expires_at || new Date(a.expires_at).getTime() > now)
      .map((a) => a.user_id);

    return { ok: true, data: { candidates, assignedIds } };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

const assignSchema = z.object({ projectId: z.string().uuid(), userIds: z.array(z.string().uuid()).max(200) });

/** Sets exactly which Program Officers can work on this project. Other access rows are untouched. */
export async function setProjectOfficersAction(projectId: string, userIds: string[]): Promise<ActionResult> {
  try {
    const parsed = assignSchema.safeParse({ projectId, userIds });
    if (!parsed.success) return fail('Invalid request.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canAssignOfficers(actor.roles)) return fail('Only a Super Admin or Programme Manager can assign officers.');

    const current = await getOfficerAssignmentAction(projectId);
    if (!current.ok) return current;
    const { candidates, assignedIds } = current.data;
    const candidateIds = new Set(candidates.map((c) => c.id));
    const wanted = new Set(parsed.data.userIds);
    for (const id of wanted) if (!candidateIds.has(id)) return fail('One of the chosen people is not an active Program Officer.');

    const toAdd = [...wanted].filter((id) => !assignedIds.includes(id));
    // Only officers we manage here can be removed; ED/other grants are never touched.
    const toRemove = assignedIds.filter((id) => candidateIds.has(id) && !wanted.has(id));

    const supabase = await createClient();
    if (toAdd.length > 0) {
      const { error } = await (supabase.from('user_project_access') as any).upsert(
        toAdd.map((user_id) => ({ user_id, project_id: projectId, granted_by: actor.userId, expires_at: null })),
        { onConflict: 'user_id,project_id' }
      );
      if (error) return fail(friendlyDbError(error.message));
    }
    if (toRemove.length > 0) {
      const { error } = await (supabase.from('user_project_access') as any)
        .delete()
        .eq('project_id', projectId)
        .in('user_id', toRemove);
      if (error) return fail(friendlyDbError(error.message));
    }
    revalidatePath(`/projects/${projectId}`, 'layout');
    return { ok: true, message: 'Officers updated.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

// ---------------------------------------------------------------------------------------
// Organisation details (registration number), edited by a Super Admin

const orgSchema = z.object({
  registration_no: z.string().trim().max(100, 'Registration number is too long').transform((v) => (v === '' ? null : v)),
  registration_authority: z.string().trim().max(200, 'Authority name is too long').transform((v) => (v === '' ? null : v)),
  address: z.string().trim().max(300, 'Address is too long').transform((v) => (v === '' ? null : v)),
  phone: z.string().trim().max(40, 'Phone number is too long').transform((v) => (v === '' ? null : v)),
  fax: z.string().trim().max(40, 'Fax number is too long').transform((v) => (v === '' ? null : v)),
  email: z
    .string()
    .trim()
    .max(200, 'E-mail is too long')
    .refine((v) => v === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Please enter a valid e-mail address')
    .transform((v) => (v === '' ? null : v)),
  website: z.string().trim().max(200, 'Website is too long').transform((v) => (v === '' ? null : v)),
});

export interface OrganizationFormData {
  name: string;
  registration_no: string;
  registration_authority: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
  canEdit: boolean;
}

export async function getOrganizationDetailsAction(): Promise<DataResult<OrganizationFormData>> {
  try {
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const org = await getOwnOrganization();
    if (!org) return fail('No organisation record found.');
    return {
      ok: true,
      data: {
        name: org.name,
        registration_no: org.registration_no ?? '',
        registration_authority: org.registration_authority ?? '',
        address: org.address ?? '',
        phone: org.phone ?? '',
        fax: org.fax ?? '',
        email: org.email ?? '',
        website: org.website ?? '',
        canEdit: actor.roles.includes('super_admin'),
      },
    };
  } catch {
    return fail('Could not load organisation details.');
  }
}

export async function updateOrganizationDetailsAction(values: {
  registration_no: string;
  registration_authority: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
}): Promise<ActionResult> {
  try {
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!actor.roles.includes('super_admin')) return fail('Only a Super Admin can change organisation details.');
    const parsed = orgSchema.safeParse(values);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid details.');

    const org = await getOwnOrganization();
    if (!org) return fail('No organisation record found.');
    const supabase = await createClient();
    const { data, error } = await (supabase.from('organizations') as any)
      .update(parsed.data)
      .eq('id', org.id)
      .select('id');
    if (error) return fail(friendlyDbError(error.message));
    if (!data || data.length === 0) return fail('You do not have permission to do this.');
    revalidatePath('/projects', 'layout');
    return { ok: true, message: 'Organisation details saved.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}
