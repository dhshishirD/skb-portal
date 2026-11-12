'use server';

import { createClient } from '@/lib/supabase/server';
import {
  attentionList,
  budgetHealth,
  canSeeHealth,
  canSeeHealthMoney,
  fundHealth,
  indicatorHealth,
  taskHealth,
  upcomingDates,
  type ExpenseRow,
  type ProjectHealth,
} from '@/lib/projectHealth';
import { getBudgetAction } from '@/server/actions/budget';
import { getFundReceiptsAction } from '@/server/actions/fundReceipts';
import { getLogframeAction } from '@/server/actions/logframe';
import { getTasksAction } from '@/server/actions/tasks';
import { getActor, getProjectById, isUuid } from '@/server/services/projectsData';

/*
 * Project health (Overview). Reads what the portal already holds, as the signed-in user, so Row Level
 * Security still decides what each person sees. Each part is worked out on its own: if one cannot be
 * read, only that part is left out. Nothing is written.
 */

export type ProjectHealthResult = { ok: true; data: ProjectHealth } | { ok: false; error: string };

export async function getProjectHealthAction(projectId: string): Promise<ProjectHealthResult> {
  try {
    if (!isUuid(projectId)) return { ok: false, error: 'Project not found.' };
    const actor = await getActor();
    if (!actor) return { ok: false, error: 'Please sign in again.' };
    if (!canSeeHealth(actor.roles)) return { ok: false, error: 'This summary is not shown for your role.' };
    const project = await getProjectById(projectId);
    if (!project) return { ok: false, error: 'Project not found.' };

    const money = canSeeHealthMoney(actor.roles);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    const supabase = await createClient();

    const [tasksRes, logRes, budgetRes, receiptsRes, expensesRes] = await Promise.all([
      getTasksAction(projectId),
      getLogframeAction(projectId),
      money ? getBudgetAction(projectId) : Promise.resolve(null),
      money ? getFundReceiptsAction(projectId) : Promise.resolve(null),
      money
        ? (supabase.from('expenses') as any).select('amount, fx_rate_to_bdt, status').eq('project_id', projectId)
        : Promise.resolve(null),
    ]);

    const tasks = tasksRes.ok ? taskHealth(tasksRes.data.tasks, today) : null;
    const indicators = logRes.ok && logRes.data.indicators.length > 0 ? indicatorHealth(logRes.data.indicators) : null;

    let budget = null;
    if (budgetRes?.ok && expensesRes && !expensesRes.error && budgetRes.data.items.length > 0) {
      const expenses: ExpenseRow[] = ((expensesRes.data ?? []) as Array<{ amount: number | string; fx_rate_to_bdt: number | string; status: string }>).map((e) => ({
        amount: Number(e.amount),
        fxRateToBdt: Number(e.fx_rate_to_bdt),
        status: e.status,
      }));
      budget = budgetHealth({
        items: budgetRes.data.items,
        packagesCount: budgetRes.data.settings.packagesCount,
        adminPercent: budgetRes.data.settings.adminPercent,
        expenses,
      });
    }

    const funds = receiptsRes?.ok
      ? fundHealth(receiptsRes.data.receipts, receiptsRes.data.currency, receiptsRes.data.donorAmount, today)
      : null;

    const upcoming = upcomingDates({ tasks: tasksRes.ok ? tasksRes.data.tasks : [], endDate: project.end_date ?? null, today });
    return { ok: true, data: { today, budget, funds, tasks, indicators, upcoming, attention: attentionList({ budget, funds, tasks, indicators }) } };
  } catch {
    return { ok: false, error: 'Could not load the summary. Please refresh the page.' };
  }
}
