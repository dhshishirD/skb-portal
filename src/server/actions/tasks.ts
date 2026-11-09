'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  canCommentOnTasks,
  canManageTasks,
  commentSchema,
  friendlyTaskError,
  isPriority,
  isStatus,
  taskSchema,
  type Task,
  type TaskFormValues,
  type TaskStatus,
  type TasksData,
} from '@/lib/tasks';
import { KIND_LABELS, isKind } from '@/lib/logframe';
import { getActor, getProjectById, isUuid } from '@/server/services/projectsData';

/*
 * Projects & Grants: tasks and workplan (migration 0020).
 * Everything runs as the signed-in user; Row Level Security and the database guards decide.
 * The checks here only give clearer messages and fail fast.
 */

type Failure = { ok: false; error: string };
export type TaskActionResult = { ok: true; message?: string } | Failure;
export type TaskDataResult<T> = { ok: true; data: T } | Failure;

const fail = (error: string): Failure => ({ ok: false, error });
const firstIssue = (e: { issues: Array<{ message: string }> }) => e.issues[0]?.message ?? 'Please check the values.';
const path = (projectId: string) => `/projects/${projectId}/tasks`;

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assignee_id: string | null;
  node_id: string | null;
  completed_at: string | null;
}
interface CommentRow {
  id: string;
  task_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
}

export async function getTasksAction(projectId: string): Promise<TaskDataResult<TasksData>> {
  try {
    if (!isUuid(projectId)) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const project = await getProjectById(projectId);
    if (!project) return fail('Project not found.');

    const supabase = await createClient();
    const tasksRes = await (supabase.from('tasks') as any)
      .select('id, title, description, status, priority, due_date, assignee_id, node_id, completed_at')
      .eq('project_id', projectId)
      .is('deleted_at', null);
    if (tasksRes.error) return fail('Could not load the tasks. Please refresh the page.');
    const rows = (tasksRes.data ?? []) as TaskRow[];

    let comments: CommentRow[] = [];
    if (rows.length > 0) {
      const cRes = await (supabase.from('task_comments') as any)
        .select('id, task_id, author_id, body, created_at')
        .in('task_id', rows.map((r) => r.id))
        .order('created_at', { ascending: true });
      if (cRes.error) return fail('Could not load the comments. Please refresh the page.');
      comments = (cRes.data ?? []) as CommentRow[];
    }

    const teamRes = await (supabase as any).rpc('project_team', { _project_id: projectId });
    const team = ((teamRes.data ?? []) as Array<{ id: string; full_name: string | null }>).map((t) => ({
      id: t.id,
      name: t.full_name ?? 'Unnamed',
    }));
    const names = new Map(team.map((t) => [t.id, t.name]));
    // names of people who are no longer on the team but wrote a comment or hold a task
    const missing = [...new Set([...rows.map((r) => r.assignee_id), ...comments.map((c) => c.author_id)].filter((x): x is string => !!x && !names.has(x)))];
    if (missing.length > 0) {
      const { data } = await (supabase.from('profiles') as any).select('id, full_name').in('id', missing);
      for (const p of (data ?? []) as Array<{ id: string; full_name: string | null }>) {
        if (p.full_name) names.set(p.id, p.full_name);
      }
    }

    const nodesRes = await (supabase.from('logframe_nodes') as any).select('id, kind, code, title').eq('project_id', projectId);
    const nodes = ((nodesRes.data ?? []) as Array<{ id: string; kind: string; code: string; title: string }>)
      .filter((n) => isKind(n.kind))
      .sort((a, b) => a.code.localeCompare(b.code, 'en', { numeric: true }))
      .map((n) => ({ id: n.id, label: `${n.code}. ${n.title} (${KIND_LABELS[n.kind as keyof typeof KIND_LABELS]})` }));
    const nodeLabel = new Map(nodes.map((n) => [n.id, n.label]));

    const tasks: Task[] = rows
      .filter((r) => isStatus(r.status) && isPriority(r.priority))
      .map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        status: r.status as Task['status'],
        priority: r.priority as Task['priority'],
        dueDate: r.due_date,
        assigneeId: r.assignee_id,
        assigneeName: r.assignee_id ? names.get(r.assignee_id) ?? null : null,
        nodeId: r.node_id,
        nodeLabel: r.node_id ? nodeLabel.get(r.node_id) ?? null : null,
        completedAt: r.completed_at,
        comments: comments
          .filter((c) => c.task_id === r.id)
          .map((c) => ({ id: c.id, authorName: c.author_id ? names.get(c.author_id) ?? null : null, body: c.body, createdAt: c.created_at })),
      }));

    const closed = project.stage === 'closed';
    return {
      ok: true,
      data: {
        projectId,
        tasks,
        team,
        nodes,
        userId: actor.userId,
        closed,
        canManage: !closed && canManageTasks(actor.roles),
        canComment: !closed && canCommentOnTasks(actor.roles),
      },
    };
  } catch {
    return fail('Could not load the tasks. Please refresh the page.');
  }
}

type Guard = Failure | { ok: true; userId: string; manage: boolean };
async function guard(projectId: string, need: 'manage' | 'comment' | 'any'): Promise<Guard> {
  if (!isUuid(projectId)) return fail('Project not found.');
  const actor = await getActor();
  if (!actor) return fail('Please sign in again.');
  const manage = canManageTasks(actor.roles);
  if (need === 'manage' && !manage) return fail('You do not have permission to change tasks.');
  if (need === 'comment' && !canCommentOnTasks(actor.roles)) return fail('You do not have permission to comment.');
  if (need === 'any' && !canCommentOnTasks(actor.roles)) return fail('You do not have permission to change tasks.');
  const project = await getProjectById(projectId);
  if (!project) return fail('Project not found.');
  if (project.stage === 'closed') return fail('The tasks of a closed project cannot be changed.');
  return { ok: true, userId: actor.userId, manage };
}
const denied = (g: Guard): g is Failure => g.ok === false;

const columns = (p: ReturnType<typeof taskSchema.parse>) => ({
  title: p.title,
  description: p.description,
  assignee_id: p.assigneeId,
  node_id: p.nodeId,
  due_date: p.dueDate,
  priority: p.priority,
});

export async function addTaskAction(projectId: string, values: TaskFormValues): Promise<TaskActionResult> {
  try {
    const g = await guard(projectId, 'manage');
    if (denied(g)) return g;
    const parsed = taskSchema.safeParse(values);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const supabase = await createClient();
    const { error } = await (supabase.from('tasks') as any).insert({ project_id: projectId, ...columns(parsed.data) });
    if (error) return fail(friendlyTaskError(error));
    revalidatePath(path(projectId));
    return { ok: true, message: 'Task added.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

export async function updateTaskAction(projectId: string, taskId: string, values: TaskFormValues): Promise<TaskActionResult> {
  try {
    if (!isUuid(taskId)) return fail('Invalid request.');
    const g = await guard(projectId, 'manage');
    if (denied(g)) return g;
    const parsed = taskSchema.safeParse(values);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const supabase = await createClient();
    const { data, error } = await (supabase.from('tasks') as any).update(columns(parsed.data)).eq('id', taskId).eq('project_id', projectId).select('id');
    if (error) return fail(friendlyTaskError(error));
    if (!data || data.length === 0) return fail('Task not found, or you are not assigned to this project.');
    revalidatePath(path(projectId));
    return { ok: true, message: 'Saved.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

/** Managers and the person the task is assigned to may change the status. */
export async function setTaskStatusAction(projectId: string, taskId: string, status: TaskStatus): Promise<TaskActionResult> {
  try {
    if (!isUuid(taskId)) return fail('Invalid request.');
    if (!isStatus(status)) return fail('Choose a valid status.');
    const g = await guard(projectId, 'any');
    if (denied(g)) return g;
    const supabase = await createClient();
    const { data, error } = await (supabase.from('tasks') as any).update({ status }).eq('id', taskId).eq('project_id', projectId).select('id');
    if (error) return fail(friendlyTaskError(error));
    if (!data || data.length === 0) return fail('You can only change the status of a task assigned to you.');
    revalidatePath(path(projectId));
    return { ok: true, message: 'Status updated.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

export async function deleteTaskAction(projectId: string, taskId: string): Promise<TaskActionResult> {
  try {
    if (!isUuid(taskId)) return fail('Invalid request.');
    const g = await guard(projectId, 'manage');
    if (denied(g)) return g;
    const supabase = await createClient();
    const { data, error } = await (supabase.from('tasks') as any).delete().eq('id', taskId).eq('project_id', projectId).select('id');
    if (error) return fail(friendlyTaskError(error));
    if (!data || data.length === 0) return fail('Task not found, or you are not assigned to this project.');
    revalidatePath(path(projectId));
    return { ok: true, message: 'Task removed.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

export async function addTaskCommentAction(projectId: string, taskId: string, body: string): Promise<TaskActionResult> {
  try {
    if (!isUuid(taskId)) return fail('Invalid request.');
    const g = await guard(projectId, 'comment');
    if (denied(g)) return g;
    const parsed = commentSchema.safeParse({ body });
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const supabase = await createClient();
    const { data: task } = await (supabase.from('tasks') as any).select('id').eq('id', taskId).eq('project_id', projectId).maybeSingle();
    if (!task) return fail('Task not found in this project.');
    const { error } = await (supabase.from('task_comments') as any).insert({ task_id: taskId, body: parsed.data.body, author_id: g.userId });
    if (error) return fail(friendlyTaskError(error));
    revalidatePath(path(projectId));
    return { ok: true, message: 'Comment added.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}
