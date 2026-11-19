'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  addMonths,
  canActOnStep,
  canSetReviewers,
  firstDay,
  friendlyWorkError,
  isMonth,
  lastDay,
  monthOf,
  todayInDhaka,
  waitingStep,
  workDaySchema,
  type ReviewStep,
  type StatementInfo,
  type StatementStatus,
  type WorkDay,
  type WorkDayInput,
} from '@/lib/workStatement';
import { doneText } from '@/lib/workPlan';
import { getActor, isUuid, listProjects } from '@/server/services/projectsData';

/*
 * Daily work log and monthly Work Statement (migration 0040).
 * Everything runs as the signed-in user, so Row Level Security and the database guards decide who may do what;
 * the checks here only give clear messages. The saved signature image lives in a private bucket: only this file
 * reads or writes it, after checking the session, and it is handed to the browser only for a step that is done
 * and was ticked on that statement.
 */

type Failure = { ok: false; error: string };
export type WorkActionResult = { ok: true; message?: string } | Failure;
export type WorkDataResult<T> = { ok: true; data: T } | Failure;
const fail = (error: string): Failure => ({ ok: false, error });
const BUCKET = 'staff-signatures';
const MAX_SIGNATURE_BYTES = 500 * 1024;
const PAGE = '/workspace/work-log';

export interface PersonRef {
  id: string;
  fullName: string;
  designation: string | null;
}
export interface MonthData {
  month: string;
  today: string;
  me: PersonRef;
  days: WorkDay[];
  statement: StatementInfo | null;
  verifier: PersonRef | null;
  approver: PersonRef | null;
  verifiedBy: PersonRef | null;
  approvedBy: PersonRef | null;
  /** What the person's reviewers are set to today (used before the first submit). */
  reviewersSet: boolean;
  hasSignature: boolean;
  projects: Array<{ id: string; code: string; title: string }>;
  /** Tasks marked done in the daily plan, by date: text for the "what you did" line, and the place of the first task. */
  planByDate: Record<string, { text: string; place: string; projectId: string | null }>;
}

interface DayRow {
  work_date: string;
  day_type: WorkDay['dayType'];
  place: string | null;
  tasks: string | null;
  project_id: string | null;
}
interface StatementRow {
  id: string;
  user_id: string;
  month: string;
  status: StatementStatus;
  verifier_id: string | null;
  approver_id: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  verified_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  return_note: string | null;
  signed_prepared: boolean;
  signed_verified: boolean;
  signed_approved: boolean;
}
const STATEMENT_COLUMNS =
  'id, user_id, month, status, verifier_id, approver_id, submitted_at, verified_at, verified_by, approved_at, approved_by, return_note, signed_prepared, signed_verified, signed_approved';

const toDay = (r: DayRow): WorkDay => ({ date: r.work_date, dayType: r.day_type, place: r.place ?? '', tasks: r.tasks ?? '', projectId: r.project_id });
const toStatement = (r: StatementRow): StatementInfo => ({
  id: r.id,
  status: r.status,
  verifierId: r.verifier_id,
  approverId: r.approver_id,
  submittedAt: r.submitted_at,
  verifiedAt: r.verified_at,
  verifiedBy: r.verified_by,
  approvedAt: r.approved_at,
  approvedBy: r.approved_by,
  returnNote: r.return_note,
  signedPrepared: r.signed_prepared,
  signedVerified: r.signed_verified,
  signedApproved: r.signed_approved,
});

async function peopleByIds(supabase: Awaited<ReturnType<typeof createClient>>, ids: Array<string | null | undefined>): Promise<Map<string, PersonRef>> {
  const list = [...new Set(ids.filter((x): x is string => !!x))];
  const out = new Map<string, PersonRef>();
  if (list.length === 0) return out;
  const { data } = await (supabase.from('profiles') as any).select('id, full_name, designation').in('id', list);
  for (const p of (data ?? []) as Array<{ id: string; full_name: string | null; designation: string | null }>) {
    out.set(p.id, { id: p.id, fullName: p.full_name?.trim() || 'Unnamed', designation: p.designation });
  }
  return out;
}

// ===== My month =====
export async function getMyMonthAction(month: string): Promise<WorkDataResult<MonthData>> {
  try {
    if (!isMonth(month)) return fail('Choose a month.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const supabase = await createClient();
    const [daysRes, stRes, revRes, sigRes, projects, planRes] = await Promise.all([
      (supabase.from('work_days') as any)
        .select('work_date, day_type, place, tasks, project_id')
        .eq('user_id', actor.userId)
        .gte('work_date', firstDay(month))
        .lte('work_date', lastDay(month))
        .order('work_date'),
      (supabase.from('work_statements') as any).select(STATEMENT_COLUMNS).eq('user_id', actor.userId).eq('month', firstDay(month)).maybeSingle(),
      (supabase.from('work_reviewers') as any).select('verifier_id, approver_id').eq('user_id', actor.userId).maybeSingle(),
      (supabase.from('staff_signatures') as any).select('user_id').eq('user_id', actor.userId).maybeSingle(),
      listProjects().catch(() => []),
      (supabase.from('work_plan_items') as any)
        .select('plan_date, title, place, project_id')
        .eq('user_id', actor.userId)
        .eq('status', 'done')
        .gte('plan_date', firstDay(month))
        .lte('plan_date', lastDay(month))
        .order('created_at'),
    ]);
    if (daysRes.error) return fail('Could not load your work log. Please refresh the page.');
    const planByDate: MonthData['planByDate'] = {};
    {
      const grouped = new Map<string, Array<{ title: string; status: 'done'; place: string; projectId: string | null }>>();
      for (const r of (planRes?.data ?? []) as Array<{ plan_date: string; title: string; place: string | null; project_id: string | null }>) {
        grouped.set(r.plan_date, [...(grouped.get(r.plan_date) ?? []), { title: r.title, status: 'done', place: r.place ?? '', projectId: r.project_id }]);
      }
      for (const [date, list] of grouped) {
        planByDate[date] = { text: doneText(list), place: list.find((x) => x.place)?.place ?? '', projectId: list.find((x) => x.projectId)?.projectId ?? null };
      }
    }
    const statement = stRes.data ? toStatement(stRes.data as StatementRow) : null;
    const rev = (revRes.data ?? null) as { verifier_id: string | null; approver_id: string | null } | null;
    const verifierId = statement && statement.status !== 'draft' && statement.status !== 'returned' ? statement.verifierId : rev?.verifier_id ?? null;
    const approverId = statement && statement.status !== 'draft' && statement.status !== 'returned' ? statement.approverId : rev?.approver_id ?? null;
    const people = await peopleByIds(supabase, [actor.userId, verifierId, approverId, statement?.verifiedBy, statement?.approvedBy]);
    return {
      ok: true,
      data: {
        month,
        today: todayInDhaka(),
        me: people.get(actor.userId) ?? { id: actor.userId, fullName: 'Me', designation: null },
        days: ((daysRes.data ?? []) as DayRow[]).map(toDay),
        statement,
        verifier: verifierId ? people.get(verifierId) ?? null : null,
        approver: approverId ? people.get(approverId) ?? null : null,
        verifiedBy: statement?.verifiedBy ? people.get(statement.verifiedBy) ?? null : null,
        approvedBy: statement?.approvedBy ? people.get(statement.approvedBy) ?? null : null,
        reviewersSet: !!(approverId || verifierId),
        planByDate,
        hasSignature: !!sigRes.data,
        projects: ((projects ?? []) as Array<{ id: string; code: string; title: string; stage?: string }>)
          .filter((p) => p.stage !== 'closed')
          .map((p) => ({ id: p.id, code: p.code, title: p.title })),
      },
    };
  } catch {
    return fail('Could not load your work log. Please refresh the page.');
  }
}

export async function saveWorkDayAction(input: WorkDayInput): Promise<WorkActionResult> {
  try {
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const parsed = workDaySchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Please check the values.');
    const v = parsed.data;
    if (v.date > todayInDhaka()) return fail('You cannot record a day that has not come yet.');
    if (v.projectId && !isUuid(v.projectId)) return fail('Choose a project from the list.');
    const supabase = await createClient();
    const { error } = await (supabase.from('work_days') as any).upsert(
      {
        user_id: actor.userId,
        work_date: v.date,
        day_type: v.dayType,
        place: v.place || null,
        tasks: v.tasks || null,
        project_id: v.projectId ?? null,
      },
      { onConflict: 'user_id,work_date' },
    );
    if (error) return fail(friendlyWorkError(error));
    revalidatePath(PAGE);
    return { ok: true, message: 'Saved.' };
  } catch {
    return fail('Something went wrong. Nothing was saved.');
  }
}

export async function clearWorkDayAction(date: string): Promise<WorkActionResult> {
  try {
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail('Choose a date.');
    const supabase = await createClient();
    const { error } = await (supabase.from('work_days') as any).delete().eq('user_id', actor.userId).eq('work_date', date);
    if (error) return fail(friendlyWorkError(error));
    revalidatePath(PAGE);
    return { ok: true, message: 'Removed.' };
  } catch {
    return fail('Something went wrong. Nothing was changed.');
  }
}

/** Submit the month. `sign` adds the person's saved signature (optional; the month is submitted either way). */
export async function submitStatementAction(month: string, sign: boolean): Promise<WorkActionResult> {
  try {
    if (!isMonth(month)) return fail('Choose a month.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const supabase = await createClient();
    const first = firstDay(month);
    const existing = await (supabase.from('work_statements') as any).select('id, status').eq('user_id', actor.userId).eq('month', first).maybeSingle();
    let id = (existing.data as { id: string } | null)?.id;
    if (!id) {
      const created = await (supabase.from('work_statements') as any).insert({ user_id: actor.userId, month: first }).select('id').single();
      if (created.error || !created.data) return fail(friendlyWorkError(created.error));
      id = (created.data as { id: string }).id;
    }
    const { error } = await (supabase.from('work_statements') as any).update({ status: 'submitted', signed_prepared: !!sign }).eq('id', id);
    if (error) return fail(friendlyWorkError(error));
    const after = await (supabase.from('work_statements') as any).select('status').eq('id', id).maybeSingle();
    revalidatePath(PAGE);
    // With no reviewer set for this person the month is final at once (migration 0041).
    return { ok: true, message: (after.data as { status?: string } | null)?.status === 'approved' ? 'Submitted. This month is final.' : 'Submitted. It now waits for review.' };
  } catch {
    return fail('Something went wrong. Nothing was submitted.');
  }
}

// ===== Review =====
export interface ReviewItem {
  id: string;
  ownerId: string;
  ownerName: string;
  month: string;
  step: ReviewStep;
  submittedAt: string | null;
}
export async function getReviewQueueAction(): Promise<WorkDataResult<ReviewItem[]>> {
  try {
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const supabase = await createClient();
    const { data, error } = await (supabase.from('work_statements') as any)
      .select(STATEMENT_COLUMNS)
      .in('status', ['submitted', 'verified'])
      .neq('user_id', actor.userId)
      .order('month', { ascending: false })
      .limit(100);
    if (error) return fail('Could not load the statements waiting for you.');
    const rows = ((data ?? []) as StatementRow[]).filter((r) => canActOnStep(toStatement(r), r.user_id, { id: actor.userId, roles: actor.roles }));
    const people = await peopleByIds(supabase, rows.map((r) => r.user_id));
    return {
      ok: true,
      data: rows.map((r) => ({
        id: r.id,
        ownerId: r.user_id,
        ownerName: people.get(r.user_id)?.fullName ?? 'Unnamed',
        month: monthOf(r.month),
        step: waitingStep({ status: r.status, verifierId: r.verifier_id })!,
        submittedAt: r.submitted_at,
      })),
    };
  } catch {
    return fail('Could not load the statements waiting for you.');
  }
}

export interface ReviewDetail {
  id: string;
  owner: PersonRef;
  month: string;
  days: WorkDay[];
  statement: StatementInfo;
  verifier: PersonRef | null;
  approver: PersonRef | null;
  verifiedBy: PersonRef | null;
  approvedBy: PersonRef | null;
  /** The step this person may act on now, or null (read only). */
  myStep: ReviewStep | null;
  hasSignature: boolean;
}
export async function getStatementAction(id: string): Promise<WorkDataResult<ReviewDetail>> {
  try {
    if (!isUuid(id)) return fail('Statement not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const supabase = await createClient();
    const st = await (supabase.from('work_statements') as any).select(STATEMENT_COLUMNS).eq('id', id).maybeSingle();
    if (st.error || !st.data) return fail('Statement not found, or you may not open it.');
    const row = st.data as StatementRow;
    const [daysRes, sigRes] = await Promise.all([
      (supabase.from('work_days') as any)
        .select('work_date, day_type, place, tasks, project_id')
        .eq('user_id', row.user_id)
        .gte('work_date', row.month)
        .lte('work_date', lastDay(monthOf(row.month)))
        .order('work_date'),
      (supabase.from('staff_signatures') as any).select('user_id').eq('user_id', actor.userId).maybeSingle(),
    ]);
    const info = toStatement(row);
    const people = await peopleByIds(supabase, [row.user_id, row.verifier_id, row.approver_id, row.verified_by, row.approved_by]);
    return {
      ok: true,
      data: {
        id: row.id,
        owner: people.get(row.user_id) ?? { id: row.user_id, fullName: 'Unnamed', designation: null },
        month: monthOf(row.month),
        days: ((daysRes.data ?? []) as DayRow[]).map(toDay),
        statement: info,
        verifier: row.verifier_id ? people.get(row.verifier_id) ?? null : null,
        approver: row.approver_id ? people.get(row.approver_id) ?? null : null,
        verifiedBy: row.verified_by ? people.get(row.verified_by) ?? null : null,
        approvedBy: row.approved_by ? people.get(row.approved_by) ?? null : null,
        myStep: canActOnStep(info, row.user_id, { id: actor.userId, roles: actor.roles }) ? waitingStep(info) : null,
        hasSignature: !!sigRes.data,
      },
    };
  } catch {
    return fail('Could not open the statement.');
  }
}

/** Verify, approve or return one statement. `sign` adds the reviewer's saved signature (optional). */
export async function reviewStatementAction(id: string, decision: 'forward' | 'return', note: string, sign: boolean): Promise<WorkActionResult> {
  try {
    if (!isUuid(id)) return fail('Statement not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const supabase = await createClient();
    const st = await (supabase.from('work_statements') as any).select(STATEMENT_COLUMNS).eq('id', id).maybeSingle();
    if (st.error || !st.data) return fail('Statement not found, or you may not open it.');
    const row = st.data as StatementRow;
    const info = toStatement(row);
    const step = waitingStep(info);
    if (!step || !canActOnStep(info, row.user_id, { id: actor.userId, roles: actor.roles })) return fail('This statement is not waiting for you.');

    let change: Record<string, unknown>;
    if (decision === 'return') {
      const text = note.trim().slice(0, 500);
      if (!text) return fail('Please write a short note so the person knows what to change.');
      change = { status: 'returned', return_note: text };
    } else if (step === 'verify') {
      change = { status: 'verified', signed_verified: !!sign };
    } else {
      change = { status: 'approved', signed_approved: !!sign };
    }
    const { data, error } = await (supabase.from('work_statements') as any).update(change).eq('id', id).select('id');
    if (error) return fail(friendlyWorkError(error));
    if (!data || data.length === 0) return fail('This statement is not waiting for you.');
    revalidatePath(PAGE);
    return { ok: true, message: decision === 'return' ? 'Returned with your note.' : step === 'verify' ? 'Verified. It now waits for the approver.' : 'Approved.' };
  } catch {
    return fail('Something went wrong. Nothing was changed.');
  }
}

// ===== Saved signature =====
const isPng = (b: Buffer) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
const isJpeg = (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

export async function saveSignatureAction(formData: FormData): Promise<WorkActionResult> {
  try {
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) return fail('Choose a picture of your signature.');
    if (file.size > MAX_SIGNATURE_BYTES) return fail('The picture is too big (500 KB at most).');
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = isPng(bytes) ? 'image/png' : isJpeg(bytes) ? 'image/jpeg' : null;
    if (!mime) return fail('Please use a PNG or JPG picture.');
    const admin = createAdminClient();
    const path = `${actor.userId}/signature.${mime === 'image/png' ? 'png' : 'jpg'}`;
    const up = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: mime, upsert: true });
    if (up.error) return fail('Could not save the signature. Please try again.');
    const { error } = await (admin.from('staff_signatures') as any).upsert({ user_id: actor.userId, image_path: path, mime_type: mime, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) return fail('Could not save the signature. Please try again.');
    revalidatePath(PAGE);
    return { ok: true, message: 'Your signature is saved.' };
  } catch {
    return fail('Could not save the signature. Please try again.');
  }
}

export async function removeSignatureAction(): Promise<WorkActionResult> {
  try {
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const admin = createAdminClient();
    const { data } = await (admin.from('staff_signatures') as any).select('image_path').eq('user_id', actor.userId).maybeSingle();
    if (data?.image_path) await admin.storage.from(BUCKET).remove([data.image_path as string]);
    await (admin.from('staff_signatures') as any).delete().eq('user_id', actor.userId);
    revalidatePath(PAGE);
    return { ok: true, message: 'Your saved signature is removed. Statements already signed keep what was added.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

async function readSignature(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: row } = await (admin.from('staff_signatures') as any).select('image_path, mime_type').eq('user_id', userId).maybeSingle();
  if (!row) return null;
  const file = await admin.storage.from(BUCKET).download(row.image_path as string);
  if (file.error || !file.data) return null;
  const bytes = Buffer.from(await file.data.arrayBuffer());
  return `data:${row.mime_type as string};base64,${bytes.toString('base64')}`;
}

/** The person's own saved signature, for the small preview on the page. */
export async function getMySignatureAction(): Promise<WorkDataResult<string | null>> {
  try {
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    return { ok: true, data: await readSignature(actor.userId) };
  } catch {
    return fail('Could not load your signature.');
  }
}

export interface StatementSignatures {
  prepared: string | null;
  verified: string | null;
  approved: string | null;
}
/**
 * The signature images to put in the Word file of one statement: only for steps that are done AND were signed,
 * and only for someone who may read that statement (the database decides, by letting the statement load).
 */
export async function getStatementSignaturesAction(statementId: string): Promise<WorkDataResult<StatementSignatures>> {
  try {
    if (!isUuid(statementId)) return fail('Statement not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const supabase = await createClient();
    const st = await (supabase.from('work_statements') as any)
      .select('user_id, status, signed_prepared, signed_verified, signed_approved, verified_by, approved_by')
      .eq('id', statementId)
      .maybeSingle();
    if (st.error || !st.data) return fail('Statement not found, or you may not open it.');
    const r = st.data as { user_id: string; status: StatementStatus; signed_prepared: boolean; signed_verified: boolean; signed_approved: boolean; verified_by: string | null; approved_by: string | null };
    const submitted = r.status === 'submitted' || r.status === 'verified' || r.status === 'approved';
    const out: StatementSignatures = { prepared: null, verified: null, approved: null };
    if (submitted && r.signed_prepared) out.prepared = await readSignature(r.user_id);
    if ((r.status === 'verified' || r.status === 'approved') && r.signed_verified && r.verified_by) out.verified = await readSignature(r.verified_by);
    if (r.status === 'approved' && r.signed_approved && r.approved_by) out.approved = await readSignature(r.approved_by);
    return { ok: true, data: out };
  } catch {
    return fail('Could not load the signatures.');
  }
}

// ===== Who verifies and approves whom (Super Admin, Executive Director) =====
export interface ReviewerRow {
  userId: string;
  fullName: string;
  designation: string | null;
  verifierId: string | null;
  approverId: string | null;
}
export async function getReviewersAction(): Promise<WorkDataResult<{ rows: ReviewerRow[]; people: PersonRef[] }>> {
  try {
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canSetReviewers(actor.roles)) return fail('You do not have permission to see this page.');
    const supabase = await createClient();
    const [{ data: roleRows }, { data: revs }] = await Promise.all([
      (supabase.from('user_roles') as any).select('user_id, role'),
      (supabase.from('work_reviewers') as any).select('user_id, verifier_id, approver_id'),
    ]);
    const staffRoles = new Set(['super_admin', 'executive', 'programme_manager', 'project_officer', 'field_officer', 'finance', 'procurement', 'me_officer', 'board', 'legal_officer', 'it_officer']);
    const ids = [...new Set(((roleRows ?? []) as Array<{ user_id: string; role: string }>).filter((r) => staffRoles.has(r.role)).map((r) => r.user_id))];
    if (ids.length === 0) return { ok: true, data: { rows: [], people: [] } };
    const { data: profs } = await (supabase.from('profiles') as any).select('id, full_name, designation, is_active').in('id', ids).eq('is_active', true).order('full_name');
    const people = ((profs ?? []) as Array<{ id: string; full_name: string | null; designation: string | null }>).map((p) => ({ id: p.id, fullName: p.full_name?.trim() || 'Unnamed', designation: p.designation }));
    const byUser = new Map(((revs ?? []) as Array<{ user_id: string; verifier_id: string | null; approver_id: string | null }>).map((r) => [r.user_id, r]));
    return {
      ok: true,
      data: {
        people,
        rows: people.map((p) => ({ userId: p.id, fullName: p.fullName, designation: p.designation, verifierId: byUser.get(p.id)?.verifier_id ?? null, approverId: byUser.get(p.id)?.approver_id ?? null })),
      },
    };
  } catch {
    return fail('Could not load the list. Please refresh the page.');
  }
}

export async function setReviewersAction(userId: string, verifierId: string | null, approverId: string | null): Promise<WorkActionResult> {
  try {
    if (!isUuid(userId) || (verifierId && !isUuid(verifierId)) || (approverId && !isUuid(approverId))) return fail('Choose people from the list.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canSetReviewers(actor.roles)) return fail('Only the Super Admin or the Executive Director can change this.');
    if (verifierId === userId || approverId === userId) return fail('A person cannot verify or approve their own statement.');
    if (verifierId && verifierId === approverId) return fail('Choose two different people, or leave the verifier empty.');
    const supabase = await createClient();
    const { error } = await (supabase.from('work_reviewers') as any).upsert({ user_id: userId, verifier_id: verifierId, approver_id: approverId }, { onConflict: 'user_id' });
    if (error) return fail(friendlyWorkError(error));
    revalidatePath('/admin/work-reviewers');
    return { ok: true, message: 'Saved.' };
  } catch {
    return fail('Something went wrong. Nothing was saved.');
  }
}
