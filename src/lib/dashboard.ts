import { formatMoney, STAGE_LABELS } from '@/lib/projects';
import type { ProjectStage } from '@/lib/database.types';

/*
 * Dashboard "my projects": what the signed-in user can see (Row Level Security decides which projects),
 * with open tasks and the next thing to do on each. Pure helpers only; the reads are in
 * src/server/actions/dashboard.ts.
 */

export interface DashboardProject {
  id: string;
  code: string;
  title: string;
  stage: ProjectStage;
  stageLabel: string;
  donorName: string | null;
  budgetText: string;
  endDate: string | null;
  openTasks: number;
  overdueTasks: number;
  hasBudgetItems: boolean;
  receiptCount: number;
  closingSignedOff: boolean;
  /** Plain-words next steps (at most three). */
  nextSteps: string[];
}

export interface DashboardTask {
  id: string;
  projectId: string;
  projectCode: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  overdue: boolean;
}

export interface DashboardData {
  projects: DashboardProject[];
  myTasks: DashboardTask[];
  /** Total open tasks assigned to the user (myTasks shows the first few). */
  myOpenTaskCount: number;
}

export interface RawTask {
  id: string;
  project_id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assignee_id: string | null;
}

export const isOverdue = (dueDate: string | null, today: string) => !!dueDate && dueDate < today;

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

/** Soonest due first (no date last), then the more urgent. */
export function sortTasks<T extends { dueDate: string | null; priority: string }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    if (a.dueDate !== b.dueDate) {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate < b.dueDate ? -1 : 1;
    }
    return (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
  });
}

export function nextSteps(p: {
  stage: ProjectStage;
  hasBudgetItems: boolean;
  receiptCount: number;
  overdueTasks: number;
  openTasks: number;
  closingSignedOff: boolean;
  endDate: string | null;
}, today: string): string[] {
  if (p.stage === 'closed') return [];
  const steps: string[] = [];
  if (p.overdueTasks > 0) steps.push(`${p.overdueTasks} overdue task${p.overdueTasks === 1 ? '' : 's'}`);
  if (!p.hasBudgetItems) steps.push('Add the budget items');
  if (p.receiptCount === 0) steps.push('Record the fund received');
  if ((p.stage === 'implementation' || p.stage === 'monitoring_evaluation') && p.endDate && p.endDate < today && !p.closingSignedOff) {
    steps.push('The end date has passed: prepare the closing report and Form-7');
  }
  return steps.slice(0, 3);
}

export function buildDashboard(input: {
  userId: string;
  today: string;
  projects: Array<{
    id: string;
    code: string;
    title: string;
    stage: ProjectStage;
    donor_name: string | null;
    budget_amount: number | string | null;
    budget_currency: string;
    end_date: string | null;
  }>;
  openTasks: RawTask[];
  budgetItemProjectIds: string[];
  receiptProjectIds: string[];
  signedOffProjectIds: string[];
}): DashboardData {
  const codeOf = new Map(input.projects.map((p) => [p.id, p.code]));
  const budgetSet = new Set(input.budgetItemProjectIds);
  const signedSet = new Set(input.signedOffProjectIds);
  const receiptCount = new Map<string, number>();
  for (const id of input.receiptProjectIds) receiptCount.set(id, (receiptCount.get(id) ?? 0) + 1);

  const projects: DashboardProject[] = input.projects.map((p) => {
    const mine = input.openTasks.filter((t) => t.project_id === p.id);
    const base = {
      stage: p.stage,
      hasBudgetItems: budgetSet.has(p.id),
      receiptCount: receiptCount.get(p.id) ?? 0,
      overdueTasks: mine.filter((t) => isOverdue(t.due_date, input.today)).length,
      openTasks: mine.length,
      closingSignedOff: signedSet.has(p.id),
      endDate: p.end_date,
    };
    return {
      id: p.id,
      code: p.code,
      title: p.title,
      stage: p.stage,
      stageLabel: STAGE_LABELS[p.stage] ?? p.stage,
      donorName: p.donor_name,
      budgetText: formatMoney(p.budget_amount, p.budget_currency),
      endDate: p.end_date,
      openTasks: base.openTasks,
      overdueTasks: base.overdueTasks,
      hasBudgetItems: base.hasBudgetItems,
      receiptCount: base.receiptCount,
      closingSignedOff: base.closingSignedOff,
      nextSteps: nextSteps(base, input.today),
    };
  });

  const mineAll = input.openTasks
    .filter((t) => t.assignee_id === input.userId)
    .map<DashboardTask>((t) => ({
      id: t.id,
      projectId: t.project_id,
      projectCode: codeOf.get(t.project_id) ?? '',
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.due_date,
      overdue: isOverdue(t.due_date, input.today),
    }));
  return { projects, myTasks: sortTasks(mineAll).slice(0, 8), myOpenTaskCount: mineAll.length };
}
