'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { friendlyPlanError, isOpen, planItemSchema, planStatusSchema, type PlanItem, type PlanItemInput, type PlanStatus } from '@/lib/workPlan';
import { canSetReviewers, isDate, todayInDhaka } from '@/lib/workStatement';
import { getActor, isUuid, listProjects } from '@/server/services/projectsData';

/*
 * Daily work plan (migration 0041). Everything runs as the signed-in user, so Row Level Security and the database
 * guard decide who may read and change what; the checks here only give clear messages. Everyone reads and changes
 * their own plan; the Executive Director and the Super Admin read every plan and may give a task to a person.
 */

type Failure = { ok: false; error: string };
export type PlanActionResult = { ok: true; message?: string } | Failure;
export type PlanDataResult<T> = { ok: true; data: T } | Failure;
const fail = (error: string): Failure => ({ ok: false, error });
const PAGE = '/workspace/daily-plan';
const TEAM_PAGE = '/workspace/team-plan';

interface PlanRow {
  id: string;
  user_id: string;
  plan_date: string;
  title: string;
  project_id: string | null;
  place: string | null;
  note: string | null;
  status: PlanStatus;
  reason: string | null;
  assigned: boolean;
  assigned_by: string | null;
}
const COLUMNS = 'id, user_id, plan_date, title, project_id, place, note, status, reason, assigned, assigned_by';
const toItem = (r: PlanRow): PlanItem => ({
  id: r.id,
  userId: r.user_id,
  date: r.plan_date,
  title: r.title,
  projectId: r.project_id,
  place: r.place ?? '',
  note: r.note ?? '',
  status: r.status,
  reason: r.reason ?? '',
  assigned: r.assigned,
  assignedBy: r.assigned_by,
});

export interface ProjectRef {
  id: string;
  code: string;
  title: string;
}
async function openProjects(): Promise<ProjectRef[]> {
  const projects = (await listProjects().catch(() => [])) as Array<{ id: string; code: string; title: string; stage?: string }>;
  return projects.filter((p) => p.stage !== 'closed').map((p) => ({ id: p.id, code: p.code, title: p.title }));
}

// ===== My plan =====
export interface MyPlanData {
  date: string;
  today: string;
  items: PlanItem[];
  /** Tasks of the last 14 days that were never finished: offered to move to this day. */
  carry: PlanItem[];
  /** Names of the people who gave tasks (for the "given by" label). */
  givers: Record<string, string>;
  projects: ProjectRef[];
}
export async function getMyPlanAction(date: string): Promise<PlanDataResult<MyPlanData>> {
  try {
    if (!isDate(date)) return fail('Choose a date.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const supabase = await createClient();
    const from = new Date(`${date}T00:00:00Z`);
    from.setUTCDate(from.getUTCDate() - 14);
    const [dayRes, carryRes, projects] = await Promise.all([
      (supabase.from('work_plan_items') as any).select(COLUMNS).eq('user_id', actor.userId).eq('plan_date', date).order('created_at'),
      (supabase.from('work_plan_items') as any)
        .select(COLUMNS)
        .eq('user_id', actor.userId)
        .gte('plan_date', from.toISOString().slice(0, 10))
        .lt('plan_date', date)
        .in('status', ['planned', 'doing'])
        .order('plan_date')
        .limit(50),
      openProjects(),
    ]);
    if (dayRes.error) return fail('Could not load your plan. Please refresh the page.');
    const items = ((dayRes.data ?? []) as PlanRow[]).map(toItem);
    const carry = ((carryRes.data ?? []) as PlanRow[]).map(toItem).filter(isOpen);
    const giverIds = [...new Set([...items, ...carry].map((i) => i.assignedBy).filter((x): x is string => !!x))];
    const givers: Record<string, string> = {};
    if (giverIds.length > 0) {
      const { data } = await (supabase.from('profiles') as any).select('id, full_name').in('id', giverIds);
      for (const p of (data ?? []) as Array<{ id: string; full_name: string | null }>) givers[p.id] = p.full_name?.trim() || 'Management';
    }
    return { ok: true, data: { date, today: todayInDhaka(), items, carry, givers, projects } };
  } catch {
    return fail('Could not load your plan. Please refresh the page.');
  }
}

function checkInput(input: PlanItemInput): { ok: true; v: ReturnType<typeof planItemSchema.parse> } | Failure {
  const parsed = planItemSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Please check the values.');
  if (parsed.data.projectId && !isUuid(parsed.data.projectId)) return fail('Choose a project from the list.');
  return { ok: true, v: parsed.data };
}

export async function addPlanItemAction(input: PlanItemInput): Promise<PlanActionResult> {
  try {
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const c = checkInput(input);
    if (!c.ok) return c;
    const supabase = await createClient();
    const { error } = await (supabase.from('work_plan_items') as any).insert({
      user_id: actor.userId,
      plan_date: c.v.date,
      title: c.v.title,
      project_id: c.v.projectId ?? null,
      place: c.v.place || null,
      note: c.v.note || null,
    });
    if (error) return fail(friendlyPlanError(error));
    revalidatePath(PAGE);
    return { ok: true, message: 'Task added.' };
  } catch {
    return fail('Something went wrong. Nothing was saved.');
  }
}

/** Edit a task (the person's own, or one the signed-in Executive Director / Super Admin gave). The database decides which fields count. */
export async function updatePlanItemAction(id: string, input: PlanItemInput): Promise<PlanActionResult> {
  try {
    if (!isUuid(id)) return fail('Task not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const c = checkInput(input);
    if (!c.ok) return c;
    const supabase = await createClient();
    const { data, error } = await (supabase.from('work_plan_items') as any)
      .update({ plan_date: c.v.date, title: c.v.title, project_id: c.v.projectId ?? null, place: c.v.place || null, note: c.v.note || null })
      .eq('id', id)
      .select('id');
    if (error) return fail(friendlyPlanError(error));
    if (!data || data.length === 0) return fail('You cannot change this task.');
    revalidatePath(PAGE);
    revalidatePath(TEAM_PAGE);
    return { ok: true, message: 'Saved.' };
  } catch {
    return fail('Something went wrong. Nothing was saved.');
  }
}

/** The person reports on a task: planned, in progress, done, or not done (with a short reason). */
export async function setPlanStatusAction(id: string, status: PlanStatus, reason: string): Promise<PlanActionResult> {
  try {
    if (!isUuid(id)) return fail('Task not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const parsed = planStatusSchema.safeParse({ status, reason });
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Please check the values.');
    const supabase = await createClient();
    const { data, error } = await (supabase.from('work_plan_items') as any)
      .update({ status: parsed.data.status, reason: parsed.data.status === 'not_done' ? parsed.data.reason || null : null })
      .eq('id', id)
      .eq('user_id', actor.userId)
      .select('id');
    if (error) return fail(friendlyPlanError(error));
    if (!data || data.length === 0) return fail('Task not found.');
    revalidatePath(PAGE);
    return { ok: true, message: 'Saved.' };
  } catch {
    return fail('Something went wrong. Nothing was saved.');
  }
}

export async function removePlanItemAction(id: string): Promise<PlanActionResult> {
  try {
    if (!isUuid(id)) return fail('Task not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const supabase = await createClient();
    const { data, error } = await (supabase.from('work_plan_items') as any).delete().eq('id', id).select('id');
    if (error) return fail(friendlyPlanError(error));
    if (!data || data.length === 0) return fail('You cannot remove this task. If it was given to you, mark it "Not done" with a reason.');
    revalidatePath(PAGE);
    revalidatePath(TEAM_PAGE);
    return { ok: true, message: 'Removed.' };
  } catch {
    return fail('Something went wrong. Nothing was changed.');
  }
}

/** Move unfinished tasks to another day (the person's own tasks, including ones they were given). */
export async function moveTasksAction(ids: string[], toDate: string): Promise<PlanActionResult> {
  try {
    if (!isDate(toDate)) return fail('Choose a date.');
    if (ids.length === 0 || ids.length > 100 || ids.some((i) => !isUuid(i))) return fail('Choose the tasks to move.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const supabase = await createClient();
    const { data, error } = await (supabase.from('work_plan_items') as any)
      .update({ plan_date: toDate })
      .in('id', ids)
      .eq('user_id', actor.userId)
      .select('id');
    if (error) return fail(friendlyPlanError(error));
    revalidatePath(PAGE);
    return { ok: true, message: `${(data ?? []).length} task${(data ?? []).length === 1 ? '' : 's'} moved.` };
  } catch {
    return fail('Something went wrong. Nothing was changed.');
  }
}

// ===== Team plan (Executive Director and Super Admin) =====
export interface TeamPerson {
  id: string;
  fullName: string;
  designation: string | null;
  items: PlanItem[];
}
export interface TeamPlanData {
  date: string;
  today: string;
  people: TeamPerson[];
  projects: ProjectRef[];
  givers: Record<string, string>;
}
const STAFF_ROLES = ['super_admin', 'executive', 'programme_manager', 'project_officer', 'field_officer', 'finance', 'procurement', 'me_officer', 'board', 'legal_officer', 'it_officer'];

export async function getTeamPlanAction(date: string): Promise<PlanDataResult<TeamPlanData>> {
  try {
    if (!isDate(date)) return fail('Choose a date.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canSetReviewers(actor.roles)) return fail('Only the Executive Director or the Super Admin can see the team plan.');
    const supabase = await createClient();
    const [{ data: roleRows }, itemsRes, projects] = await Promise.all([
      (supabase.from('user_roles') as any).select('user_id, role'),
      (supabase.from('work_plan_items') as any).select(COLUMNS).eq('plan_date', date).order('created_at').limit(2000),
      openProjects(),
    ]);
    if (itemsRes.error) return fail('Could not load the team plan. Please refresh the page.');
    const ids = [...new Set(((roleRows ?? []) as Array<{ user_id: string; role: string }>).filter((r) => STAFF_ROLES.includes(r.role)).map((r) => r.user_id))];
    if (ids.length === 0) return { ok: true, data: { date, today: todayInDhaka(), people: [], projects, givers: {} } };
    const { data: profs } = await (supabase.from('profiles') as any).select('id, full_name, designation, is_active').in('id', ids).eq('is_active', true).order('full_name');
    const items = ((itemsRes.data ?? []) as PlanRow[]).map(toItem);
    const byUser = new Map<string, PlanItem[]>();
    for (const i of items) byUser.set(i.userId, [...(byUser.get(i.userId) ?? []), i]);
    const people = ((profs ?? []) as Array<{ id: string; full_name: string | null; designation: string | null }>).map((p) => ({
      id: p.id,
      fullName: p.full_name?.trim() || 'Unnamed',
      designation: p.designation,
      items: byUser.get(p.id) ?? [],
    }));
    const givers: Record<string, string> = {};
    for (const p of people) givers[p.id] = p.fullName;
    return { ok: true, data: { date, today: todayInDhaka(), people, projects, givers } };
  } catch {
    return fail('Could not load the team plan. Please refresh the page.');
  }
}

/** The Executive Director or Super Admin gives a task to a staff member. */
export async function assignTaskAction(userId: string, input: PlanItemInput): Promise<PlanActionResult> {
  try {
    if (!isUuid(userId)) return fail('Choose a person from the list.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canSetReviewers(actor.roles)) return fail('Only the Executive Director or the Super Admin can give a task.');
    if (userId === actor.userId) return fail('Add your own tasks on "My Daily Plan".');
    const c = checkInput(input);
    if (!c.ok) return c;
    const supabase = await createClient();
    const { error } = await (supabase.from('work_plan_items') as any).insert({
      user_id: userId,
      plan_date: c.v.date,
      title: c.v.title,
      project_id: c.v.projectId ?? null,
      place: c.v.place || null,
      note: c.v.note || null,
    });
    if (error) return fail(friendlyPlanError(error));
    revalidatePath(TEAM_PAGE);
    return { ok: true, message: 'Task given.' };
  } catch {
    return fail('Something went wrong. Nothing was saved.');
  }
}
