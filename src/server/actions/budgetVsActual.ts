'use server';

import { createClient } from '@/lib/supabase/server';
import { budgetVsActual, canSeeBudgetVsActual, type BudgetVsActual } from '@/lib/budgetVsActual';
import { getBudgetAction } from '@/server/actions/budget';
import { getActor, getProjectById, isUuid } from '@/server/services/projectsData';

/*
 * Planned against actual for one project. Read-only; runs as the signed-in user so Row Level Security
 * still applies. Only roles that can read every claim and purchase request of the project may open it,
 * so the totals are never partial.
 */

export type BudgetVsActualResult = { ok: true; data: BudgetVsActual } | { ok: false; error: string };

export async function getBudgetVsActualAction(projectId: string): Promise<BudgetVsActualResult> {
  try {
    if (!isUuid(projectId)) return { ok: false, error: 'Project not found.' };
    const actor = await getActor();
    if (!actor) return { ok: false, error: 'Please sign in again.' };
    if (!canSeeBudgetVsActual(actor.roles)) return { ok: false, error: 'not-shown' };
    const project = await getProjectById(projectId);
    if (!project) return { ok: false, error: 'Project not found.' };

    const budget = await getBudgetAction(projectId);
    if (!budget.ok) return { ok: false, error: budget.error };

    const supabase = await createClient();
    const [claimsRes, purchasesRes] = await Promise.all([
      (supabase.from('expenses') as any)
        .select('id, description, amount, fx_rate_to_bdt, status, expense_date')
        .eq('project_id', projectId),
      (supabase.from('purchase_requests') as any)
        .select('id, description, estimated_amount, status, created_at')
        .eq('project_id', projectId),
    ]);
    if (claimsRes.error || purchasesRes.error) return { ok: false, error: 'Could not load the expenses. Please refresh the page.' };

    const requests = (purchasesRes.data ?? []) as Array<{ id: string; description: string; estimated_amount: number | string; status: string; created_at: string }>;
    const orderTotals = new Map<string, number>();
    const issued = requests.filter((r) => r.status === 'po_issued').map((r) => r.id);
    if (issued.length > 0) {
      const po = await (supabase.from('purchase_orders') as any).select('purchase_request_id, total_amount').in('purchase_request_id', issued);
      if (po.error) return { ok: false, error: 'Could not load the purchase orders. Please refresh the page.' };
      for (const o of (po.data ?? []) as Array<{ purchase_request_id: string; total_amount: number | string }>) {
        orderTotals.set(o.purchase_request_id, Number(o.total_amount));
      }
    }

    return {
      ok: true,
      data: budgetVsActual({
        items: budget.data.items,
        packagesCount: budget.data.settings.packagesCount,
        adminPercent: budget.data.settings.adminPercent,
        claims: ((claimsRes.data ?? []) as Array<{ id: string; description: string; amount: number | string; fx_rate_to_bdt: number | string; status: string; expense_date: string }>).map((c) => ({
          id: c.id,
          description: c.description,
          amount: Number(c.amount),
          fxRateToBdt: Number(c.fx_rate_to_bdt),
          status: c.status,
          expenseDate: c.expense_date,
        })),
        purchases: requests.map((r) => ({
          id: r.id,
          description: r.description,
          estimatedAmount: Number(r.estimated_amount),
          orderTotal: orderTotals.get(r.id) ?? null,
          status: r.status,
          createdAt: r.created_at,
        })),
      }),
    };
  } catch {
    return { ok: false, error: 'Could not load the expenses. Please refresh the page.' };
  }
}
