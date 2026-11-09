import { z } from 'zod';
import type { AppRole } from './database.types';

/**
 * Tasks and workplan. The database (migration 0020) enforces the rules; these helpers drive what the
 * screen shows (who can do what, grouping, overdue) and turn database errors into plain words.
 */

export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export const STATUSES: TaskStatus[] = ['todo', 'doing', 'blocked', 'done'];
export const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
export const STATUS_LABELS: Record<TaskStatus, string> = { todo: 'To do', doing: 'Doing', blocked: 'Blocked', done: 'Done' };
export const PRIORITY_LABELS: Record<TaskPriority, string> = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
export const isStatus = (v: unknown): v is TaskStatus => STATUSES.includes(v as TaskStatus);
export const isPriority = (v: unknown): v is TaskPriority => PRIORITIES.includes(v as TaskPriority);

export interface TaskComment {
  id: string;
  authorName: string | null;
  body: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  nodeId: string | null;
  nodeLabel: string | null;
  completedAt: string | null;
  comments: TaskComment[];
}

export interface TeamMember {
  id: string;
  name: string;
}
export interface NodeOption {
  id: string;
  label: string;
}

export interface TasksData {
  projectId: string;
  tasks: Task[];
  team: TeamMember[];
  nodes: NodeOption[];
  userId: string;
  closed: boolean;
  /** Create, edit, assign and delete. */
  canManage: boolean;
  /** Add a comment. */
  canComment: boolean;
}

const MANAGERS: AppRole[] = ['executive', 'programme_manager', 'project_officer'];
const COMMENTERS: AppRole[] = ['super_admin', 'executive', 'programme_manager', 'project_officer', 'field_officer', 'finance', 'procurement', 'me_officer'];
export const canManageTasks = (roles: AppRole[]) => roles.some((r) => MANAGERS.includes(r));
export const canCommentOnTasks = (roles: AppRole[]) => roles.some((r) => COMMENTERS.includes(r));

/** A manager changes anything; the assignee changes only the status. */
export function canChangeStatus(task: Pick<Task, 'assigneeId'>, userId: string, manage: boolean): boolean {
  return manage || task.assigneeId === userId;
}

const PRIORITY_RANK: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

/** Open tasks first by due date then priority; done tasks last. */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const ad = a.status === 'done' ? 1 : 0;
    const bd = b.status === 'done' ? 1 : 0;
    if (ad !== bd) return ad - bd;
    const da = a.dueDate ?? '9999-12-31';
    const db = b.dueDate ?? '9999-12-31';
    if (da !== db) return da.localeCompare(db);
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.title.localeCompare(b.title);
  });
}

/** Overdue: not done and the due date is before today (today is passed in as YYYY-MM-DD). */
export const isOverdue = (task: Pick<Task, 'status' | 'dueDate'>, today: string): boolean =>
  task.status !== 'done' && !!task.dueDate && task.dueDate < today;

export interface TaskCounts {
  total: number;
  done: number;
  overdue: number;
  /** Whole percent done; 0 when there are no tasks. */
  percentDone: number;
}
export function countTasks(tasks: Pick<Task, 'status' | 'dueDate'>[], today: string): TaskCounts {
  const done = tasks.filter((t) => t.status === 'done').length;
  return {
    total: tasks.length,
    done,
    overdue: tasks.filter((t) => isOverdue(t, today)).length,
    percentDone: tasks.length === 0 ? 0 : Math.round((done * 100) / tasks.length),
  };
}

// ===== Forms =====
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((v) => (v === '' ? null : v));
const optionalId = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .refine((v) => v === null || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v), 'Invalid choice');

export const taskSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(200, 'Title must be 200 characters or fewer'),
  description: optionalText(2000, 'Description'),
  assigneeId: optionalId,
  nodeId: optionalId,
  dueDate: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .refine((v) => v === null || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), 'Choose a valid due date'),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], { errorMap: () => ({ message: 'Choose a priority' }) }),
});
export type TaskFormValues = z.input<typeof taskSchema>;

export const commentSchema = z.object({
  body: z.string().trim().min(1, 'Write a comment first').max(2000, 'A comment must be 2000 characters or fewer'),
});

/** Plain-words version of a database error from migration 0020. */
export function friendlyTaskError(error: { code?: string | null; message?: string | null }): string {
  const message = error.message ?? '';
  const code = error.code ?? '';
  if (/closed project/i.test(message)) return 'The tasks of a closed project cannot be changed.';
  if (/can change only its status/i.test(message)) return 'You can only change the status of a task assigned to you.';
  if (/project team/i.test(message)) return 'A task can only be assigned to someone on the project team.';
  if (/same project/i.test(message)) return 'That logframe item is not part of this project.';
  if (/row-level security|violates row-level|permission denied/i.test(message) || code === '42501') {
    return 'You do not have permission to do this.';
  }
  if (code === '23514' || /violates check constraint/i.test(message)) return 'Some values are not allowed. Please check them and try again.';
  return 'The database could not save this. Please try again.';
}
