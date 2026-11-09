'use server';

import { createClient } from '@/lib/supabase/server';
import { calculateBudget } from '@/lib/budget';
import { countGroups } from '@/lib/beneficiaries';
import {
  REPORT_FIELDS,
  allChecked,
  canSignOffClosing,
  canWriteClosing,
  emptySections,
  friendlyClosingError,
  noteSchema,
  reportSchema,
  type ChecklistItem,
  type ClosingData,
  type ReportFormValues,
  type ReportText,
} from '@/lib/closing';
import { buildForm7Pdf } from '@/lib/form7Pdf';
import { getBudgetAction } from '@/server/actions/budget';
import { getFundReceiptsAction } from '@/server/actions/fundReceipts';
import { getActor, getOwnOrganization, getProjectById, isUuid } from '@/server/services/projectsData';

/*
 * Projects & Grants: closing checklist, Form-7 text and the Form-7 PDF (migration 0023).
 *
 * Everything runs as the signed-in user, so Row Level Security and the database guards decide.
 * The checks below only give clearer messages and fail fast.
 */

type Failure = { ok: false; error: string };
export type ClosingActionResult = { ok: true; message?: string } | Failure;
export type ClosingDataResult<T> = { ok: true; data: T } | Failure;

const fail = (error: string): Failure => ({ ok: false, error });
const firstIssue = (e: { issues: Array<{ message: string }> }) => e.issues[0]?.message ?? 'Please check the values.';

interface ReportRow {
  project_summary: string;
  general_impact: string;
  negative_groups: string;
  goals_achieved: string;
  local_manpower: string;
  beneficiary_story: string;
  challenges: string;
  lessons_learned: string;
  updated_by: string | null;
  updated_at: string;
  families_count: number | null;
  signed_off_by: string | null;
  signed_off_at: string | null;
}

const reportFromRow = (r: ReportRow | null): ReportText => ({
  projectSummary: r?.project_summary ?? '',
  generalImpact: r?.general_impact ?? '',
  negativeGroups: r?.negative_groups ?? '',
  goalsAchieved: r?.goals_achieved ?? '',
  localManpower: r?.local_manpower ?? '',
  beneficiaryStory: r?.beneficiary_story ?? '',
  challenges: r?.challenges ?? '',
  lessonsLearned: r?.lessons_learned ?? '',
});

async function loadClosing(projectId: string, roles: import('@/lib/database.types').AppRole[], closed: boolean) {
  const supabase = await createClient();
  const [itemsRes, checksRes, reportRes, docsRes] = await Promise.all([
    (supabase.from('closing_checklist_items') as any).select('key, label, position').order('position', { ascending: true }),
    (supabase.from('project_closing_checks') as any).select('item_key, checked_by, checked_at, note, document_id').eq('project_id', projectId),
    (supabase.from('project_closing_reports') as any)
      .select('project_summary, general_impact, negative_groups, goals_achieved, local_manpower, beneficiary_story, challenges, lessons_learned, families_count, updated_by, updated_at, signed_off_by, signed_off_at')
      .eq('project_id', projectId)
      .maybeSingle(),
    (supabase.from('documents') as any).select('id, title').eq('project_id', projectId).is('deleted_at', null).order('created_at', { ascending: false }),
  ]);
  if (itemsRes.error || checksRes.error || reportRes.error) return null;

  const checks = (checksRes.data ?? []) as Array<{ item_key: string; checked_by: string; checked_at: string; note: string | null; document_id: string | null }>;
  const report = (reportRes.data ?? null) as ReportRow | null;
  const docs = ((docsRes.data ?? []) as Array<{ id: string; title: string }>) ?? [];

  const ids = [...new Set([...checks.map((c) => c.checked_by), report?.updated_by, report?.signed_off_by].filter((v): v is string => !!v))];
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data } = await (supabase.from('profiles') as any).select('id, full_name').in('id', ids);
    for (const p of (data ?? []) as Array<{ id: string; full_name: string | null }>) if (p.full_name) names.set(p.id, p.full_name);
  }
  const docTitle = new Map(docs.map((d) => [d.id, d.title]));
  const items: ChecklistItem[] = ((itemsRes.data ?? []) as Array<{ key: string; label: string }>).map((i) => {
    const c = checks.find((x) => x.item_key === i.key);
    return {
      key: i.key,
      label: i.label,
      checked: c
        ? {
            byName: names.get(c.checked_by) ?? null,
            at: c.checked_at,
            note: c.note,
            documentId: c.document_id,
            documentTitle: c.document_id ? docTitle.get(c.document_id) ?? null : null,
          }
        : null,
    };
  });
  const signedOff = !!report?.signed_off_at;
  const data: ClosingData = {
    projectId,
    closed,
    report: reportFromRow(report),
    familiesCount: report?.families_count ?? null,
    updatedAt: report?.updated_at ?? null,
    updatedByName: report?.updated_by ? names.get(report.updated_by) ?? null : null,
    signedOffAt: report?.signed_off_at ?? null,
    signedOffByName: report?.signed_off_by ? names.get(report.signed_off_by) ?? null : null,
    items,
    documents: docs,
    canWrite: !closed && !signedOff && canWriteClosing(roles),
    canSignOff: !closed && canSignOffClosing(roles),
    canExport: canWriteClosing(roles),
  };
  return data;
}

export async function getClosingAction(projectId: string): Promise<ClosingDataResult<ClosingData>> {
  try {
    if (!isUuid(projectId)) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (actor.roles.includes('donor')) return fail('Project not found.');
    const project = await getProjectById(projectId);
    if (!project) return fail('Project not found.');
    const data = await loadClosing(projectId, actor.roles, project.stage === 'closed');
    if (!data) return fail('Could not load the closing page. Please refresh the page.');
    return { ok: true, data };
  } catch {
    return fail('Could not load the closing page. Please refresh the page.');
  }
}

async function guardWrite(projectId: string): Promise<{ failure: Failure } | { actor: NonNullable<Awaited<ReturnType<typeof getActor>>>; closed: boolean }> {
  if (!isUuid(projectId)) return { failure: fail('Project not found.') };
  const actor = await getActor();
  if (!actor) return { failure: fail('Please sign in again.') };
  if (!canWriteClosing(actor.roles)) return { failure: fail('You do not have permission to change the closing report.') };
  const project = await getProjectById(projectId);
  if (!project) return { failure: fail('Project not found.') };
  if (project.stage === 'closed') return { failure: fail('This project is closed, so the closing report cannot be changed.') };
  return { actor, closed: false };
}

/** Make sure the report row exists (the first save creates it). */
async function ensureReportRow(supabase: any, projectId: string): Promise<{ error: { code?: string; message?: string } | null }> {
  const { data, error } = await supabase.from('project_closing_reports').select('project_id').eq('project_id', projectId).maybeSingle();
  if (error) return { error };
  if (data) return { error: null };
  const ins = await supabase.from('project_closing_reports').insert({ project_id: projectId });
  return { error: ins.error };
}

export async function saveClosingReportAction(projectId: string, values: ReportFormValues): Promise<ClosingActionResult> {
  try {
    const g = await guardWrite(projectId);
    if ('failure' in g) return g.failure;
    const parsed = reportSchema.safeParse(values);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const supabase = await createClient();
    const row = await ensureReportRow(supabase, projectId);
    if (row.error) return fail(friendlyClosingError(row.error));
    const patch: Record<string, string> = {};
    for (const f of REPORT_FIELDS) patch[f.column] = parsed.data[f.key];
    const patchAny: Record<string, string | number | null> = { ...patch, families_count: parsed.data.familiesCount };
    const { data, error } = await (supabase.from('project_closing_reports') as any).update(patchAny).eq('project_id', projectId).select('project_id');
    if (error) return fail(friendlyClosingError(error));
    if (!(data ?? []).length) return fail('Nothing was saved. You may not have permission on this project.');
    return { ok: true, message: 'Saved.' };
  } catch {
    return fail('Could not save. Please try again.');
  }
}

/** Tick (or untick) one checklist item. Ticking again replaces the note and the linked document. */
export async function setClosingCheckAction(
  projectId: string,
  itemKey: string,
  checked: boolean,
  note?: string,
  documentId?: string | null,
): Promise<ClosingActionResult> {
  try {
    const g = await guardWrite(projectId);
    if ('failure' in g) return g.failure;
    if (!/^[a-z0-9_]{3,40}$/.test(itemKey)) return fail('Unknown checklist item.');
    if (documentId && !isUuid(documentId)) return fail('Document not found.');
    const parsedNote = noteSchema.safeParse(note ?? '');
    if (!parsedNote.success) return fail(firstIssue(parsedNote.error));
    const supabase = await createClient();
    const del = await (supabase.from('project_closing_checks') as any).delete().eq('project_id', projectId).eq('item_key', itemKey).select('item_key');
    if (del.error) return fail(friendlyClosingError(del.error));
    if (!checked) {
      if (!(del.data ?? []).length) return fail('Nothing was changed. The report may be signed off, or you may not have permission.');
      return { ok: true, message: 'Item unticked.' };
    }
    const ins = await (supabase.from('project_closing_checks') as any).insert({
      project_id: projectId,
      item_key: itemKey,
      note: parsedNote.data,
      document_id: documentId || null,
    });
    if (ins.error) return fail(friendlyClosingError(ins.error));
    return { ok: true, message: 'Item ticked.' };
  } catch {
    return fail('Could not save. Please try again.');
  }
}

/** Executive Director: sign off (every item must be ticked) or reopen. */
export async function setClosingSignOffAction(projectId: string, signOff: boolean): Promise<ClosingActionResult> {
  try {
    if (!isUuid(projectId)) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canSignOffClosing(actor.roles)) return fail('Only the Executive Director can sign off or reopen the closing report.');
    const project = await getProjectById(projectId);
    if (!project) return fail('Project not found.');
    if (project.stage === 'closed') return fail('This project is closed, so the closing report cannot be changed.');
    const supabase = await createClient();
    const row = await ensureReportRow(supabase, projectId);
    if (row.error) return fail(friendlyClosingError(row.error));
    const { data, error } = await (supabase.from('project_closing_reports') as any)
      .update({ signed_off_at: signOff ? new Date().toISOString() : null })
      .eq('project_id', projectId)
      .select('project_id');
    if (error) return fail(friendlyClosingError(error));
    if (!(data ?? []).length) return fail('Nothing was changed.');
    return { ok: true, message: signOff ? 'Signed off.' : 'Reopened for changes.' };
  } catch {
    return fail('Could not save. Please try again.');
  }
}

/** Form-7 as a PDF (base64) to print, sign by hand and scan. */
export async function generateForm7Action(projectId: string): Promise<ClosingDataResult<{ filename: string; base64: string }>> {
  try {
    if (!isUuid(projectId)) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canWriteClosing(actor.roles)) return fail('You do not have permission to make Form-7.');
    const project = await getProjectById(projectId);
    if (!project) return fail('Project not found.');

    const closing = await loadClosing(projectId, actor.roles, project.stage === 'closed');
    if (!closing) return fail('Could not load the closing page. Please try again.');
    const [budgetRes, receiptsRes, org] = await Promise.all([getBudgetAction(projectId), getFundReceiptsAction(projectId), getOwnOrganization()]);
    if (!budgetRes.ok) return fail(budgetRes.error);
    if (!receiptsRes.ok) return fail(receiptsRes.error);
    const b = budgetRes.data;
    const calc = calculateBudget({
      items: b.items,
      packagesCount: b.settings.packagesCount,
      adminPercent: b.settings.adminPercent,
      exchangeRate: b.settings.exchangeRate,
      donorAmount: b.donorAmount,
      currency: b.currency,
    });

    const supabase = await createClient();
    const ben = await (supabase.from('beneficiaries') as any).select('sex, birth_year').eq('project_id', projectId);
    const counts = ben.error
      ? null
      : countGroups(
          ((ben.data ?? []) as Array<{ sex: string | null; birth_year: number | null }>).map((p) => ({ sex: p.sex, birthYear: p.birth_year })),
          new Date().getFullYear(),
        );

    const bytes = await buildForm7Pdf({
      organisationName: org?.name ?? 'SKB',
      registrationNo: org?.registration_no ?? null,
      project: {
        code: project.code,
        title: project.title,
        donorName: project.donor_name,
        ngoabRef: project.ngoab_ref ?? null,
        location: project.location,
        startDate: project.start_date,
        endDate: project.end_date,
        beneficiaryTarget: project.beneficiary_target,
      },
      counts,
      currency: b.currency,
      items: b.items,
      calc,
      exchangeRate: b.settings.exchangeRate,
      rateDate: b.settings.rateDate,
      receipts: receiptsRes.data.receipts.map((r) => ({ receivedOn: r.receivedOn, amount: r.amount, currency: r.currency, reference: r.reference })),
      report: closing.report,
      familiesCount: closing.familiesCount,
      signedOffOn: closing.signedOffAt,
      signedOffByName: closing.signedOffByName,
      madeOn: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }),
    });
    const safeCode = project.code.replace(/[^A-Za-z0-9_-]+/g, '-');
    return { ok: true, data: { filename: `form-7-${safeCode}.pdf`, base64: Buffer.from(bytes).toString('base64') } };
  } catch {
    return fail('Could not make Form-7. Please try again.');
  }
}

/** Helper for the screen: how many items are done and what is missing (pure, no database). */
export async function closingSummary(data: Pick<ClosingData, 'items' | 'report'>) {
  return { ready: allChecked(data.items), emptySections: emptySections(data.report) };
}
