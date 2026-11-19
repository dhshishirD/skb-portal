import { z } from 'zod';
import { isDate } from './workStatement';

/**
 * Daily work plan (migration 0041). Pure helpers: the statuses, what a person may type, how a day's tasks are
 * summarised, and the text that fills the "what you did" box of the Work Statement from the tasks marked done.
 * The database enforces the rules (who reads, who edits, frozen months); this file only mirrors them for the pages.
 */

export type PlanStatus = 'planned' | 'doing' | 'done' | 'not_done';
export const PLAN_STATUSES: PlanStatus[] = ['planned', 'doing', 'done', 'not_done'];
export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  planned: 'Planned',
  doing: 'In progress',
  done: 'Done',
  not_done: 'Not done',
};

export interface PlanItem {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  title: string;
  projectId: string | null;
  place: string;
  note: string;
  status: PlanStatus;
  reason: string;
  /** Given by the Executive Director / Super Admin. */
  assigned: boolean;
  assignedBy: string | null;
}

export const planItemSchema = z.object({
  date: z.string().refine(isDate, 'Choose a date'),
  title: z.string().trim().min(1, 'Write what the task is').max(200, 'The task must be 200 characters or fewer'),
  projectId: z.string().uuid().nullable().optional(),
  place: z.string().trim().max(120, 'The place must be 120 characters or fewer').optional().default(''),
  note: z.string().trim().max(500, 'The note must be 500 characters or fewer').optional().default(''),
});
export type PlanItemInput = z.input<typeof planItemSchema>;

export const planStatusSchema = z.object({
  status: z.enum(['planned', 'doing', 'done', 'not_done'], { errorMap: () => ({ message: 'Choose a status' }) }),
  reason: z.string().trim().max(300, 'The reason must be 300 characters or fewer').optional().default(''),
});

export interface PlanSummary {
  total: number;
  planned: number;
  doing: number;
  done: number;
  notDone: number;
}
export function summarizePlan(items: Pick<PlanItem, 'status'>[]): PlanSummary {
  const s: PlanSummary = { total: items.length, planned: 0, doing: 0, done: 0, notDone: 0 };
  for (const i of items) {
    if (i.status === 'planned') s.planned += 1;
    else if (i.status === 'doing') s.doing += 1;
    else if (i.status === 'done') s.done += 1;
    else s.notDone += 1;
  }
  return s;
}

/** Tasks still open (planned or in progress) on earlier days: offered to move to today. */
export const isOpen = (i: Pick<PlanItem, 'status'>) => i.status === 'planned' || i.status === 'doing';

/** The "what you did" text for one day, from the tasks marked done. Empty when none is done. Never longer than the box allows. */
export function doneText(items: Pick<PlanItem, 'title' | 'status'>[], max = 1500): string {
  const text = items
    .filter((i) => i.status === 'done')
    .map((i) => i.title.trim())
    .filter(Boolean)
    .join('; ');
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Plain-words version of a database error from migration 0041. */
export function friendlyPlanError(error: { code?: string; message?: string } | null | undefined): string {
  const m = (error?.message ?? '').toLowerCase();
  if (m.includes('has been submitted')) return 'This month has been submitted, so its plan cannot be changed.';
  if (m.includes('cannot be removed')) return 'A task given to you cannot be removed. Mark it "Not done" and write the reason.';
  if (m.includes('can only be added by the person')) return 'You can only add tasks to your own plan.';
  if (error?.code === '42501') return 'You do not have permission to do this.';
  if (error?.code === '23503') return 'That project or person could not be found.';
  return 'Something went wrong. Nothing was saved.';
}
