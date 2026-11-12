import type { AppRole } from './database.types';
import { calculateBudget, type BudgetItem } from './budget';
import { countTasks, isOverdue, type Task, type TaskCounts } from './tasks';
import { indicatorProgress, type Indicator } from './logframe';
import { totalReceipts, type FundReceipt, type ReceiptTotals } from './fundReceipts';

/**
 * The project "health page" on Overview: money spent, late tasks, indicator progress,
 * last fund receipt and dates coming up. Everything here is worked out from data the
 * portal already holds; nothing new is stored.
 */

/** Who may see the money and fund figures. Donors and field officers do not. */
const MONEY_VIEWERS: AppRole[] = ['executive', 'programme_manager', 'project_officer', 'finance', 'me_officer', 'board', 'legal_officer'];
const TEAM_VIEWERS: AppRole[] = [...MONEY_VIEWERS, 'field_officer', 'procurement', 'super_admin'];
export const canSeeHealthMoney = (roles: readonly AppRole[]) => roles.some((r) => MONEY_VIEWERS.includes(r));
export const canSeeHealth = (roles: readonly AppRole[]) => roles.some((r) => TEAM_VIEWERS.includes(r));

/** Claims that count as money spent (approved by the director, or paid) and claims still waiting. */
const SPENT: string[] = ['director_approved', 'paid'];
const WAITING: string[] = ['submitted', 'pm_approved', 'finance_verified'];

export interface ExpenseRow {
  amount: number;
  fxRateToBdt: number;
  status: string;
}

export function sumExpenses(rows: ExpenseRow[]): { spentBdtCents: number; waitingBdtCents: number } {
  let spent = 0;
  let waiting = 0;
  for (const r of rows) {
    const c = Math.round(r.amount * r.fxRateToBdt * 100);
    if (SPENT.includes(r.status)) spent += c;
    else if (WAITING.includes(r.status)) waiting += c;
  }
  return { spentBdtCents: spent, waitingBdtCents: waiting };
}

export interface BudgetHealth {
  plannedBdtCents: number;
  spentBdtCents: number;
  waitingBdtCents: number;
  /** Spent as a share of planned, in whole percent; null when nothing is planned yet. */
  percentSpent: number | null;
  overspent: boolean;
}

export function budgetHealth(input: {
  items: BudgetItem[];
  packagesCount: number;
  adminPercent: number;
  expenses: ExpenseRow[];
}): BudgetHealth {
  const calc = calculateBudget({
    items: input.items,
    packagesCount: input.packagesCount,
    adminPercent: input.adminPercent,
    exchangeRate: null,
    donorAmount: null,
    currency: 'BDT',
  });
  const { spentBdtCents, waitingBdtCents } = sumExpenses(input.expenses);
  const planned = calc.projectBdtCents;
  return {
    plannedBdtCents: planned,
    spentBdtCents,
    waitingBdtCents,
    percentSpent: planned > 0 ? Math.round((spentBdtCents * 100) / planned) : null,
    overspent: planned > 0 && spentBdtCents > planned,
  };
}

export interface IndicatorHealth {
  total: number;
  withValidatedData: number;
  /** Average progress (each indicator capped at 100%) over indicators that have validated data, whole percent. */
  averagePercent: number | null;
  pendingValues: number;
  /** The slowest indicators that have data, lowest first (at most three). */
  slowest: Array<{ id: string; name: string; percent: number }>;
}

export function indicatorHealth(indicators: Indicator[]): IndicatorHealth {
  let withData = 0;
  let pending = 0;
  const pcts: Array<{ id: string; name: string; percent: number }> = [];
  for (const ind of indicators) {
    const p = indicatorProgress(ind);
    pending += p.pendingCount;
    if (p.validatedCount > 0 && p.percentBp !== null) {
      withData += 1;
      pcts.push({ id: ind.id, name: ind.name, percent: Math.min(100, Math.max(0, Math.round(p.percentBp / 100))) });
    }
  }
  return {
    total: indicators.length,
    withValidatedData: withData,
    averagePercent: pcts.length === 0 ? null : Math.round(pcts.reduce((s, x) => s + x.percent, 0) / pcts.length),
    pendingValues: pending,
    slowest: [...pcts].sort((a, b) => a.percent - b.percent).slice(0, 3),
  };
}

export interface FundHealth {
  lastReceivedOn: string | null;
  lastAmount: number | null;
  lastCurrency: string | null;
  daysSinceLast: number | null;
  totals: ReceiptTotals;
  /** Receipts whose acknowledgement letter has not been sent yet. */
  unacknowledged: number;
}

export const daysBetween = (fromIso: string, toIso: string): number =>
  Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86400000);

export function fundHealth(receipts: FundReceipt[], currency: string, donorAmount: number | null, today: string): FundHealth {
  const sorted = [...receipts].sort((a, b) => b.receivedOn.localeCompare(a.receivedOn));
  const last = sorted[0] ?? null;
  return {
    lastReceivedOn: last?.receivedOn ?? null,
    lastAmount: last?.amount ?? null,
    lastCurrency: last?.currency ?? null,
    daysSinceLast: last ? daysBetween(last.receivedOn, today) : null,
    totals: totalReceipts(receipts, currency, donorAmount),
    unacknowledged: receipts.filter((r) => r.ackStatus === 'not_sent').length,
  };
}

export interface UpcomingItem {
  kind: 'task' | 'project_end';
  label: string;
  date: string;
  /** Negative when already past. */
  daysFromToday: number;
}

export function upcomingDates(input: { tasks: Task[]; endDate: string | null; today: string; withinDays?: number }): UpcomingItem[] {
  const within = input.withinDays ?? 30;
  const out: UpcomingItem[] = [];
  for (const t of input.tasks) {
    if (t.status === 'done' || !t.dueDate) continue;
    const d = daysBetween(input.today, t.dueDate);
    if (d >= 0 && d <= within) out.push({ kind: 'task', label: t.title, date: t.dueDate, daysFromToday: d });
  }
  if (input.endDate) {
    const d = daysBetween(input.today, input.endDate);
    if (d >= 0 && d <= within * 3) out.push({ kind: 'project_end', label: 'Project end date', date: input.endDate, daysFromToday: d });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label)).slice(0, 8);
}

export interface TaskHealth extends TaskCounts {
  blocked: number;
  /** The most overdue open tasks, oldest first (at most five). */
  overdueList: Array<{ id: string; title: string; dueDate: string; assigneeName: string | null; daysLate: number }>;
}

export function taskHealth(tasks: Task[], today: string): TaskHealth {
  const counts = countTasks(tasks, today);
  return {
    ...counts,
    blocked: tasks.filter((t) => t.status === 'blocked').length,
    overdueList: tasks
      .filter((t) => isOverdue(t, today))
      .sort((a, b) => (a.dueDate as string).localeCompare(b.dueDate as string))
      .slice(0, 5)
      .map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate as string, assigneeName: t.assigneeName, daysLate: daysBetween(t.dueDate as string, today) })),
  };
}

export interface ProjectHealth {
  today: string;
  /** null when this user may not see money, or the budget could not be read. */
  budget: BudgetHealth | null;
  funds: FundHealth | null;
  tasks: TaskHealth | null;
  indicators: IndicatorHealth | null;
  upcoming: UpcomingItem[];
  /** Short plain sentences: what needs attention now. */
  attention: string[];
}

export function attentionList(h: Pick<ProjectHealth, 'budget' | 'funds' | 'tasks' | 'indicators'>): string[] {
  const out: string[] = [];
  if (h.tasks && h.tasks.overdue > 0) out.push(`${h.tasks.overdue} task${h.tasks.overdue === 1 ? ' is' : 's are'} late.`);
  if (h.tasks && h.tasks.blocked > 0) out.push(`${h.tasks.blocked} task${h.tasks.blocked === 1 ? ' is' : 's are'} blocked.`);
  if (h.budget?.overspent) out.push('Spending is above the planned budget.');
  else if (h.budget?.percentSpent !== null && h.budget && (h.budget.percentSpent ?? 0) >= 90) out.push(`${h.budget.percentSpent}% of the planned budget is already spent.`);
  if (h.funds && h.funds.unacknowledged > 0) out.push(`${h.funds.unacknowledged} fund receipt${h.funds.unacknowledged === 1 ? '' : 's'} still need an acknowledgement letter.`);
  if (h.indicators && h.indicators.pendingValues > 0) out.push(`${h.indicators.pendingValues} indicator value${h.indicators.pendingValues === 1 ? '' : 's'} wait for validation.`);
  return out;
}
