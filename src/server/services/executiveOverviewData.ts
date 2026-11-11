import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { listProjects } from '@/server/services/projectsData';
import { buildExecutiveOverview, describeActivity, type ExecutiveOverview } from '@/lib/executiveOverview';

/*
 * Reads for the Executive Director overview. Runs as the signed-in user, so Row Level Security still
 * decides what comes back. The caller checks that the person is the Executive Director.
 */

export interface ExecutiveOverviewData {
  overview: ExecutiveOverview;
  activity: Array<{ id: string; who: string; text: string; at: string }>;
  asOf: string;
}

const fail = (what: string, e: { message?: string } | null | undefined) => {
  if (e) throw new Error(`${what}: ${e.message ?? 'failed'}`);
};

export async function loadExecutiveOverview(): Promise<ExecutiveOverviewData> {
  const supabase = await createClient();
  const db = (t: string) => (supabase as any).from(t);
  const projects = await listProjects();
  const ids = projects.map((p) => p.id);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });

  const empty = { data: [] as any[], error: null };
  const inIds = (t: string, cols: string, extra?: (q: any) => any) =>
    ids.length === 0 ? Promise.resolve(empty) : (extra ?? ((q: any) => q))(db(t).select(cols).in('project_id', ids));

  const [receipts, tasks, bens, heads, budget, reports, checks, checklist, gates, audit] = await Promise.all([
    inIds('project_fund_receipts', 'project_id, amount, currency'),
    inIds('tasks', 'project_id, due_date', (q) => q.is('deleted_at', null).neq('status', 'done').limit(5000)),
    inIds('beneficiaries', 'project_id', (q) => q.limit(50000)),
    inIds('project_headcounts', 'project_id, women, men, girls, boys'),
    inIds('project_budget_items', 'project_id', (q) => q.limit(10000)),
    inIds('project_closing_reports', 'project_id, signed_off_at'),
    inIds('project_closing_checks', 'project_id', (q) => q.limit(10000)),
    db('closing_checklist_items').select('key'),
    inIds('stage_gate_items', 'project_id, stage, required, done', (q) => q.limit(10000)),
    db('audit_log').select('id, occurred_at, actor_id, table_name, action').order('occurred_at', { ascending: false }).limit(10),
  ]);
  for (const [name, r] of Object.entries({ receipts, tasks, bens, heads, budget, reports, checks, checklist, gates })) fail(name, (r as any).error);

  const closingCheckCounts: Record<string, number> = {};
  for (const c of checks.data as Array<{ project_id: string }>) closingCheckCounts[c.project_id] = (closingCheckCounts[c.project_id] ?? 0) + 1;

  const overview = buildExecutiveOverview({
    today,
    projects,
    receipts: receipts.data,
    openTasks: tasks.data,
    beneficiaryProjectIds: (bens.data as Array<{ project_id: string }>).map((b) => b.project_id),
    headcounts: heads.data,
    budgetItemProjectIds: (budget.data as Array<{ project_id: string }>).map((b) => b.project_id),
    closingReportProjectIds: (reports.data as Array<{ project_id: string }>).map((r) => r.project_id),
    signedOffProjectIds: (reports.data as Array<{ project_id: string; signed_off_at: string | null }>).filter((r) => r.signed_off_at).map((r) => r.project_id),
    closingCheckCounts,
    closingChecklistSize: (checklist.data as unknown[]).length,
    gates: gates.data,
  });

  // Recent activity: the audit log is optional here; if it cannot be read the rest still shows.
  let activity: ExecutiveOverviewData['activity'] = [];
  if (!(audit as any).error) {
    const rows = ((audit as any).data ?? []) as Array<{ id: number; occurred_at: string; actor_id: string | null; table_name: string; action: string }>;
    const actorIds = [...new Set(rows.map((r) => r.actor_id).filter((x): x is string => !!x))];
    const names = new Map<string, string>();
    if (actorIds.length > 0) {
      const { data } = await db('profiles').select('id, full_name').in('id', actorIds);
      for (const p of (data ?? []) as Array<{ id: string; full_name: string }>) names.set(p.id, p.full_name);
    }
    activity = rows.map((r) => describeActivity(r, r.actor_id ? names.get(r.actor_id) ?? null : null));
  }

  return { overview, activity, asOf: new Date().toISOString() };
}
