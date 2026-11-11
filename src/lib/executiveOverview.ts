import { formatMoney, PROJECT_STAGES, STAGE_LABELS } from '@/lib/projects';
import type { ProjectStage } from '@/lib/database.types';

/*
 * Executive Director overview: the whole portfolio at a glance, built only from real database rows.
 * Pure functions (no database, no browser). The reads are in src/server/services/executiveOverviewData.ts.
 *
 * Design rules (from NGO and portfolio dashboard practice): a few vital numbers with context, what needs a
 * decision first, detail below; never colour alone (every status has words); nothing is invented, so an
 * empty portfolio shows empty states, not sample figures.
 */

export interface ExecProject {
  id: string;
  code: string;
  title: string;
  stage: ProjectStage;
  donor_name: string | null;
  budget_amount: number | string | null;
  budget_currency: string;
  end_date: string | null;
}

export interface ExecInput {
  today: string; // YYYY-MM-DD, Dhaka
  projects: ExecProject[];
  receipts: Array<{ project_id: string; amount: number | string; currency: string }>;
  openTasks: Array<{ project_id: string; due_date: string | null }>;
  /** One entry per registered person (the project it belongs to). */
  beneficiaryProjectIds: string[];
  headcounts: Array<{ project_id: string; women: number; men: number; girls: number; boys: number }>;
  budgetItemProjectIds: string[];
  closingReportProjectIds: string[];
  signedOffProjectIds: string[];
  /** Ticked closing checklist items per project. */
  closingCheckCounts: Record<string, number>;
  /** Number of items on the closing checklist. */
  closingChecklistSize: number;
  gates: Array<{ project_id: string; stage: ProjectStage; required: boolean; done: boolean }>;
}

export interface MoneyLine {
  currency: string;
  amount: number;
  text: string;
}

export interface AttentionItem {
  level: 'decision' | 'warning';
  projectId: string;
  code: string;
  text: string;
  /** Project tab to open. */
  tab: string;
}

export interface PortfolioRow {
  id: string;
  code: string;
  title: string;
  stage: ProjectStage;
  stageLabel: string;
  donor: string;
  agreedText: string;
  receivedText: string;
  /** Percent of the agreed amount received (same currency only); null when it cannot be worked out. */
  receivedPct: number | null;
  openTasks: number;
  overdueTasks: number;
  people: number;
  endDate: string | null;
  /** Short words, never colour alone. */
  health: 'closed' | 'needs_action' | 'ok';
  healthLabel: string;
}

export interface ExecutiveOverview {
  total: number;
  active: number;
  closed: number;
  stageCounts: Array<{ stage: ProjectStage; label: string; count: number }>;
  agreed: MoneyLine[];
  received: MoneyLine[];
  /** Overall percent received, only when everything is in one currency; otherwise null. */
  receivedPct: number | null;
  people: { total: number; registered: number; headcountOnly: number };
  openTasks: number;
  overdueTasks: number;
  attention: AttentionItem[];
  rows: PortfolioRow[];
}

const num = (v: number | string | null | undefined) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) ? n : 0;
};
const cents = (n: number) => Math.round(n * 100);

function sumByCurrency(pairs: Array<{ currency: string; amount: number }>): MoneyLine[] {
  const map = new Map<string, number>();
  for (const p of pairs) map.set(p.currency, (map.get(p.currency) ?? 0) + cents(p.amount));
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([currency, c]) => ({ currency, amount: c / 100, text: formatMoney(c / 100, currency) }));
}

const nextOf = (s: ProjectStage): ProjectStage | null => {
  const i = PROJECT_STAGES.indexOf(s);
  return i >= 0 && i < PROJECT_STAGES.length - 1 ? PROJECT_STAGES[i + 1] : null;
};

export function buildExecutiveOverview(input: ExecInput): ExecutiveOverview {
  const { today } = input;
  const byProject = <T extends { project_id: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) m.set(r.project_id, [...(m.get(r.project_id) ?? []), r]);
    return m;
  };
  const receiptsBy = byProject(input.receipts);
  const tasksBy = byProject(input.openTasks);
  const gatesBy = byProject(input.gates);
  const headBy = new Map(input.headcounts.map((h) => [h.project_id, h]));
  const registeredBy = new Map<string, number>();
  for (const id of input.beneficiaryProjectIds) registeredBy.set(id, (registeredBy.get(id) ?? 0) + 1);
  const budgetSet = new Set(input.budgetItemProjectIds);
  const reportSet = new Set(input.closingReportProjectIds);
  const signedSet = new Set(input.signedOffProjectIds);

  const attention: AttentionItem[] = [];
  const rows: PortfolioRow[] = [];
  let registeredTotal = 0;
  let headcountOnlyTotal = 0;
  let overdueTotal = 0;

  for (const p of input.projects) {
    const open = p.stage !== 'closed';
    const tasks = tasksBy.get(p.id) ?? [];
    const overdue = tasks.filter((t) => t.due_date && t.due_date < today).length;
    overdueTotal += overdue;

    const registered = registeredBy.get(p.id) ?? 0;
    const hc = headBy.get(p.id);
    const hcTotal = hc ? hc.women + hc.men + hc.girls + hc.boys : 0;
    const people = registered > 0 ? registered : hcTotal;
    if (registered > 0) registeredTotal += registered;
    else headcountOnlyTotal += hcTotal;

    const agreed = num(p.budget_amount);
    const sameCur = (receiptsBy.get(p.id) ?? []).filter((r) => r.currency === p.budget_currency);
    const receivedSame = sameCur.reduce((s, r) => s + cents(num(r.amount)), 0) / 100;
    const anyReceipt = (receiptsBy.get(p.id) ?? []).length > 0;
    const pct = agreed > 0 && anyReceipt ? Math.round((receivedSame / agreed) * 100) : null;
    const otherCur = [...new Set((receiptsBy.get(p.id) ?? []).filter((r) => r.currency !== p.budget_currency).map((r) => r.currency))];

    // ----- attention -----
    const add = (level: AttentionItem['level'], text: string, tab: string) =>
      attention.push({ level, projectId: p.id, code: p.code, text, tab });
    if (open) {
      const checks = input.closingCheckCounts[p.id] ?? 0;
      if (reportSet.has(p.id) && !signedSet.has(p.id) && input.closingChecklistSize > 0 && checks >= input.closingChecklistSize) {
        add('decision', 'The closing checklist is complete. The report is waiting for your sign-off.', 'closing-report');
      }
      const here = (gatesBy.get(p.id) ?? []).filter((g) => g.stage === p.stage && g.required);
      const next = nextOf(p.stage);
      if (next && here.length > 0 && here.every((g) => g.done)) {
        add('decision', `Every required item of "${STAGE_LABELS[p.stage]}" is done. You can move it to "${STAGE_LABELS[next]}".`, 'kanban');
      }
      if (overdue > 0) add('warning', `${overdue} task${overdue === 1 ? ' is' : 's are'} overdue.`, 'tasks');
      if (p.end_date && p.end_date < today && !signedSet.has(p.id)) {
        add('warning', 'The end date has passed and the project is not closed.', 'closing-report');
      }
      if (!budgetSet.has(p.id)) add('warning', 'The budget has no items yet.', 'budget');
      if (!anyReceipt) add('warning', 'No fund receipt is recorded.', 'receipts');
    }

    const needs = attention.some((a) => a.projectId === p.id);
    rows.push({
      id: p.id,
      code: p.code,
      title: p.title,
      stage: p.stage,
      stageLabel: STAGE_LABELS[p.stage],
      donor: p.donor_name?.trim() || '—',
      agreedText: agreed > 0 ? formatMoney(agreed, p.budget_currency) : '—',
      receivedText: anyReceipt ? formatMoney(receivedSame, p.budget_currency) + (otherCur.length ? ` (+ ${otherCur.join(', ')})` : '') : '—',
      receivedPct: pct,
      openTasks: tasks.length,
      overdueTasks: overdue,
      people,
      endDate: p.end_date,
      health: !open ? 'closed' : needs ? 'needs_action' : 'ok',
      healthLabel: !open ? 'Closed' : needs ? 'Needs attention' : 'On track',
    });
  }

  attention.sort((a, b) => (a.level === b.level ? a.code.localeCompare(b.code) : a.level === 'decision' ? -1 : 1));

  const open = input.projects.filter((p) => p.stage !== 'closed');
  const agreed = sumByCurrency(input.projects.map((p) => ({ currency: p.budget_currency, amount: num(p.budget_amount) })).filter((x) => x.amount > 0));
  const received = sumByCurrency(input.receipts.map((r) => ({ currency: r.currency, amount: num(r.amount) })));
  const receivedPct = agreed.length === 1 && received.length <= 1 && agreed[0].amount > 0 && received.length === 1 && received[0].currency === agreed[0].currency
    ? Math.round((received[0].amount / agreed[0].amount) * 100)
    : null;

  return {
    total: input.projects.length,
    active: open.length,
    closed: input.projects.length - open.length,
    stageCounts: PROJECT_STAGES.map((stage) => ({ stage, label: STAGE_LABELS[stage], count: input.projects.filter((p) => p.stage === stage).length })),
    agreed,
    received,
    receivedPct,
    people: { total: registeredTotal + headcountOnlyTotal, registered: registeredTotal, headcountOnly: headcountOnlyTotal },
    openTasks: input.openTasks.length,
    overdueTasks: overdueTotal,
    attention,
    rows,
  };
}

// ===== Recent activity (from the audit log; no personal data is shown) =====
const TABLE_LABELS: Record<string, string> = {
  projects: 'a project',
  project_budget_items: 'a budget item',
  project_fund_receipts: 'a fund receipt',
  tasks: 'a task',
  beneficiaries: 'a beneficiary record',
  project_headcounts: 'the head count',
  project_closing_reports: 'a closing report',
  project_closing_checks: 'a closing checklist item',
  project_stage_history: 'a stage change',
  stage_gate_items: 'a stage checklist item',
  project_documents: 'a document',
  project_file_records: 'a file record',
  project_charters: 'a charter',
  logframe_nodes: 'a logframe item',
  user_roles: 'a user role',
  profiles: 'a user profile',
  organizations: 'organisation details',
};
const VERB: Record<string, string> = { INSERT: 'added', UPDATE: 'changed', DELETE: 'removed' };

export interface AuditRow {
  id: number | string;
  occurred_at: string;
  actor_id: string | null;
  table_name: string;
  action: string;
}

export function describeActivity(row: AuditRow, actorName: string | null): { id: string; who: string; text: string; at: string } {
  const noun = TABLE_LABELS[row.table_name] ?? row.table_name.replace(/_/g, ' ');
  return {
    id: String(row.id),
    who: actorName?.trim() || (row.actor_id ? 'A user' : 'System'),
    text: `${VERB[row.action] ?? 'changed'} ${noun}`,
    at: row.occurred_at,
  };
}
