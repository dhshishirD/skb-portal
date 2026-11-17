'use server';

import { createClient } from '@/lib/supabase/server';
import { canSeeBudgetVsActual } from '@/lib/budgetVsActual';
import type { ActualClaim, ActualOrder, ActualReceipt } from '@/lib/form7Export';
import { getActor, getProjectById, isUuid } from '@/server/services/projectsData';

/*
 * The real spending of one project, for the Form 7 report: approved or paid expense claims, issued purchase
 * orders (with the supplier's name) and the money received from the donor. Read-only; runs as the signed-in
 * user so Row Level Security still applies. Only roles that can read every claim and purchase request may use it.
 */

export type Form7ActualsResult = { ok: true; data: { claims: ActualClaim[]; orders: ActualOrder[]; receipts: ActualReceipt[] } } | { ok: false; error: string };

export async function getForm7ActualsAction(projectId: string): Promise<Form7ActualsResult> {
  try {
    if (!isUuid(projectId)) return { ok: false, error: 'Project not found.' };
    const actor = await getActor();
    if (!actor) return { ok: false, error: 'Please sign in again.' };
    if (!canSeeBudgetVsActual(actor.roles)) return { ok: false, error: 'You do not have permission to see the expenses of this project.' };
    const project = await getProjectById(projectId);
    if (!project) return { ok: false, error: 'Project not found.' };

    const supabase = await createClient();
    const [claimsRes, requestsRes, receiptsRes] = await Promise.all([
      (supabase.from('expenses') as any)
        .select('id, description, amount, fx_rate_to_bdt, expense_date, vendor_name, receipt_ref, quantity, measure')
        .eq('project_id', projectId)
        .in('status', ['director_approved', 'paid']),
      (supabase.from('purchase_requests') as any).select('id, description').eq('project_id', projectId).eq('status', 'po_issued'),
      (supabase.from('project_fund_receipts') as any).select('received_on, amount, currency').eq('project_id', projectId),
    ]);
    if (claimsRes.error || requestsRes.error || receiptsRes.error) return { ok: false, error: 'Could not load the expenses. Please refresh the page.' };

    const requests = (requestsRes.data ?? []) as Array<{ id: string; description: string }>;
    const orders: ActualOrder[] = [];
    if (requests.length > 0) {
      const po = await (supabase.from('purchase_orders') as any)
        .select('id, purchase_request_id, vendor_id, total_amount, issued_at')
        .in('purchase_request_id', requests.map((r) => r.id));
      if (po.error) return { ok: false, error: 'Could not load the purchase orders. Please refresh the page.' };
      const rows = (po.data ?? []) as Array<{ id: string; purchase_request_id: string; vendor_id: string; total_amount: number | string; issued_at: string }>;
      const vendorIds = [...new Set(rows.map((r) => r.vendor_id))];
      const names = new Map<string, string>();
      if (vendorIds.length > 0) {
        const v = await (supabase.from('vendors') as any).select('id, name').in('id', vendorIds);
        for (const x of (v.data ?? []) as Array<{ id: string; name: string }>) names.set(x.id, x.name);
      }
      const desc = new Map(requests.map((r) => [r.id, r.description]));
      for (const r of rows) {
        orders.push({
          id: r.id,
          description: desc.get(r.purchase_request_id) ?? 'Purchase',
          vendorName: names.get(r.vendor_id) ?? null,
          totalBdt: Number(r.total_amount),
          issuedOn: String(r.issued_at).slice(0, 10),
        });
      }
    }

    return {
      ok: true,
      data: {
        claims: ((claimsRes.data ?? []) as Array<{ id: string; description: string; amount: number | string; fx_rate_to_bdt: number | string; expense_date: string; vendor_name: string | null; receipt_ref: string | null; quantity: number | string | null; measure: string | null }>).map((c) => ({
          id: c.id,
          description: c.description,
          amount: Number(c.amount),
          fxRateToBdt: Number(c.fx_rate_to_bdt),
          expenseDate: c.expense_date,
          vendorName: c.vendor_name,
          receiptRef: c.receipt_ref,
          quantity: c.quantity === null ? null : Number(c.quantity),
          measure: c.measure,
        })),
        orders,
        receipts: ((receiptsRes.data ?? []) as Array<{ received_on: string; amount: number | string; currency: string }>).map((r) => ({
          receivedOn: r.received_on,
          amount: Number(r.amount),
          currency: r.currency,
        })),
      },
    };
  } catch {
    return { ok: false, error: 'Could not load the expenses. Please refresh the page.' };
  }
}
