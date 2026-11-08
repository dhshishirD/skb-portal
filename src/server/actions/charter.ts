'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  canApproveCharter,
  canWriteCharter,
  charterSchema,
  friendlyCharterError,
  isEmptyCharter,
  sameCharterText,
  type CharterData,
  type CharterFormValues,
  type CharterVersion,
} from '@/lib/charter';
import { buildCharterPdf } from '@/lib/charterPdf';
import { getActor, getOwnOrganization, getProjectById, isUuid } from '@/server/services/projectsData';

/*
 * Projects & Grants: project charter (migration 0018).
 *
 * Everything runs as the signed-in user, so Row Level Security and the database guard decide.
 * The checks below only give clearer messages and fail fast.
 */

type Failure = { ok: false; error: string };
export type CharterActionResult = { ok: true; message?: string } | Failure;
export type CharterDataResult<T> = { ok: true; data: T } | Failure;

const fail = (error: string): Failure => ({ ok: false, error });
const firstIssue = (e: { issues: Array<{ message: string }> }) => e.issues[0]?.message ?? 'Please check the values.';

interface VersionRow {
  id: string;
  version: number;
  background: string;
  objectives: string;
  scope_in: string;
  scope_out: string;
  deliverables: string;
  risks: string;
  team: string;
  change_note: string | null;
  created_by: string | null;
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
}

const COLUMNS =
  'id, version, background, objectives, scope_in, scope_out, deliverables, risks, team, change_note, created_by, created_at, approved_by, approved_at';

async function namesFor(supabase: any, rows: VersionRow[]): Promise<Map<string, string>> {
  const ids = [...new Set(rows.flatMap((r) => [r.created_by, r.approved_by]).filter((v): v is string => !!v))];
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data } = await (supabase.from('profiles') as any).select('id, full_name').in('id', ids);
    for (const p of (data ?? []) as Array<{ id: string; full_name: string | null }>) {
      if (p.full_name) names.set(p.id, p.full_name);
    }
  }
  return names;
}

const toVersion = (r: VersionRow, names: Map<string, string>): CharterVersion => ({
  id: r.id,
  version: r.version,
  background: r.background,
  objectives: r.objectives,
  scopeIn: r.scope_in,
  scopeOut: r.scope_out,
  deliverables: r.deliverables,
  risks: r.risks,
  team: r.team,
  changeNote: r.change_note,
  createdAt: r.created_at,
  createdByName: r.created_by ? names.get(r.created_by) ?? null : null,
  approvedAt: r.approved_at,
  approvedByName: r.approved_by ? names.get(r.approved_by) ?? null : null,
});

const factsOf = (project: NonNullable<Awaited<ReturnType<typeof getProjectById>>>) => ({
  code: project.code,
  title: project.title,
  donorName: project.donor_name,
  location: project.location,
  budgetAmount: project.budget_amount === null || project.budget_amount === '' ? null : Number(project.budget_amount),
  currency: project.budget_currency,
  beneficiaryTarget: project.beneficiary_target,
  startDate: project.start_date,
  endDate: project.end_date,
});

export async function getCharterAction(projectId: string): Promise<CharterDataResult<CharterData>> {
  try {
    if (!isUuid(projectId)) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const project = await getProjectById(projectId);
    if (!project) return fail('Project not found.');

    const supabase = await createClient();
    const { data, error } = await (supabase.from('project_charter_versions') as any)
      .select(COLUMNS)
      .eq('project_id', projectId)
      .order('version', { ascending: false });
    if (error) return fail('Could not load the charter. Please refresh the page.');
    const rows = (data ?? []) as VersionRow[];
    const names = await namesFor(supabase, rows);
    const closed = project.stage === 'closed';
    return {
      ok: true,
      data: {
        projectId,
        facts: factsOf(project),
        versions: rows.map((r) => toVersion(r, names)),
        closed,
        canWrite: !closed && canWriteCharter(actor.roles),
        canApprove: !closed && canApproveCharter(actor.roles),
      },
    };
  } catch {
    return fail('Could not load the charter. Please refresh the page.');
  }
}

/** Save the charter as a NEW version (the database numbers it). Nothing is saved if the text did not change. */
export async function saveCharterVersionAction(projectId: string, values: CharterFormValues): Promise<CharterActionResult> {
  try {
    if (!isUuid(projectId)) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canWriteCharter(actor.roles)) return fail('You do not have permission to change the charter.');
    const project = await getProjectById(projectId);
    if (!project) return fail('Project not found.');
    if (project.stage === 'closed') return fail('The charter of a closed project cannot be changed.');
    const parsed = charterSchema.safeParse(values);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    if (isEmptyCharter(parsed.data)) return fail('Write something in at least one section before saving.');

    const supabase = await createClient();
    const { data: latest, error: latestError } = await (supabase.from('project_charter_versions') as any)
      .select(COLUMNS)
      .eq('project_id', projectId)
      .order('version', { ascending: false })
      .limit(1);
    if (latestError) return fail('Could not check the latest version. Please try again.');
    const last = ((latest ?? []) as VersionRow[])[0];
    if (last) {
      const lastText = toVersion(last, new Map());
      if (sameCharterText(lastText, parsed.data)) return fail('Nothing has changed since the latest version.');
    }

    const { error } = await (supabase.from('project_charter_versions') as any).insert({
      project_id: projectId,
      background: parsed.data.background,
      objectives: parsed.data.objectives,
      scope_in: parsed.data.scopeIn,
      scope_out: parsed.data.scopeOut,
      deliverables: parsed.data.deliverables,
      risks: parsed.data.risks,
      team: parsed.data.team,
      change_note: parsed.data.changeNote,
    });
    if (error) return fail(friendlyCharterError(error));
    revalidatePath(`/projects/${projectId}/charter`);
    return { ok: true, message: 'Saved as a new version.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

/** Executive Director approves one version. The database records who and when. */
export async function approveCharterVersionAction(projectId: string, versionId: string): Promise<CharterActionResult> {
  try {
    if (!isUuid(projectId) || !isUuid(versionId)) return fail('Invalid request.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canApproveCharter(actor.roles)) return fail('Only the Executive Director can approve the charter.');
    const project = await getProjectById(projectId);
    if (!project) return fail('Project not found.');
    if (project.stage === 'closed') return fail('The charter of a closed project cannot be changed.');

    const supabase = await createClient();
    const { data, error } = await (supabase.from('project_charter_versions') as any)
      .update({ approved_by: actor.userId, approved_at: new Date().toISOString() })
      .eq('id', versionId)
      .eq('project_id', projectId)
      .select('id');
    if (error) return fail(friendlyCharterError(error));
    if (!data || data.length === 0) return fail('Version not found.');
    revalidatePath(`/projects/${projectId}/charter`);
    return { ok: true, message: 'Charter version approved.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

/** One saved version as a PDF (base64) to print, sign by hand and scan. */
export async function exportCharterPdfAction(
  projectId: string,
  versionId: string,
): Promise<CharterDataResult<{ filename: string; base64: string }>> {
  try {
    if (!isUuid(projectId) || !isUuid(versionId)) return fail('Invalid request.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const project = await getProjectById(projectId);
    if (!project) return fail('Project not found.');

    const supabase = await createClient();
    const { data, error } = await (supabase.from('project_charter_versions') as any)
      .select(COLUMNS)
      .eq('id', versionId)
      .eq('project_id', projectId)
      .maybeSingle();
    if (error) return fail('Could not load the version. Please try again.');
    if (!data) return fail('Version not found.');
    const row = data as VersionRow;
    const v = toVersion(row, await namesFor(supabase, [row]));
    const org = await getOwnOrganization();

    const bytes = await buildCharterPdf({
      organisationName: org?.name ?? 'SKB',
      facts: factsOf(project),
      version: v.version,
      text: v,
      changeNote: v.changeNote,
      savedOn: v.createdAt,
      approvedOn: v.approvedAt,
      approvedByName: v.approvedByName,
    });
    const safeCode = project.code.replace(/[^A-Za-z0-9_-]+/g, '-');
    return { ok: true, data: { filename: `charter-${safeCode}-v${v.version}.pdf`, base64: Buffer.from(bytes).toString('base64') } };
  } catch {
    return fail('Could not make the PDF. Please try again.');
  }
}
