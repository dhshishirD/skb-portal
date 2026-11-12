'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { friendlyDbError } from '@/lib/dbErrors';
import {
  approveSchema,
  blacklistReasonSchema,
  canLiftBlacklist,
  canManageVendors,
  draftEditSchema,
  purchaseActionsFor,
  purchaseRequestSchema,
  quotationSchema,
  vendorSchema,
  type PurchaseAction,
  type PurchaseRequestFormValues,
  type PurchaseRequestRow,
  type PurchaseStatus,
  type PurchaseTrailStep,
  type QuotationFormValues,
  type QuotationRow,
  type VendorFormValues,
  type VendorRow,
} from '@/lib/procurement';
import { getActor, isUuid } from '@/server/services/projectsData';

/*
 * Procurement: vendors, purchase requests, quotations, orders (migration 0028).
 *
 * Runs as the signed-in user. The database decides; these checks give clearer messages.
 */

type Failure = { ok: false; error: string };
export type ProcurementActionResult = { ok: true; message?: string } | Failure;
export type ProcurementDataResult<T> = { ok: true; data: T } | Failure;

const fail = (error: string): Failure => ({ ok: false, error });
const firstIssue = (e: { issues: Array<{ message: string }> }) => e.issues[0]?.message ?? 'Please check the values.';

function revalidate() {
  revalidatePath('/procurement/requests');
  revalidatePath('/procurement/vendors');
}

interface VendorDb {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  is_blacklisted: boolean;
  blacklist_reason: string | null;
}

export async function listVendorsAction(): Promise<ProcurementDataResult<VendorRow[]>> {
  try {
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const supabase = await createClient();
    const { data, error } = await (supabase.from('vendors') as any)
      .select('id, name, contact_person, phone, email, is_blacklisted, blacklist_reason')
      .order('name', { ascending: true })
      .limit(1000);
    if (error) return fail('Could not load vendors. Please refresh the page.');
    const manage = canManageVendors(actor.roles);
    const lift = canLiftBlacklist(actor.roles);
    return {
      ok: true,
      data: ((data ?? []) as VendorDb[]).map((v) => ({
        id: v.id,
        name: v.name,
        contactPerson: v.contact_person,
        phone: v.phone,
        email: v.email,
        isBlacklisted: v.is_blacklisted,
        blacklistReason: v.blacklist_reason,
        canManage: manage,
        canLift: lift,
      })),
    };
  } catch {
    return fail('Could not load vendors. Please refresh the page.');
  }
}

export async function saveVendorAction(values: VendorFormValues, vendorId?: string): Promise<ProcurementActionResult> {
  try {
    if (vendorId !== undefined && !isUuid(vendorId)) return fail('Vendor not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canManageVendors(actor.roles)) return fail('Only Procurement or the Executive Director can manage vendors.');
    const parsed = vendorSchema.safeParse(values);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const row = {
      name: parsed.data.name,
      contact_person: parsed.data.contactPerson,
      phone: parsed.data.phone,
      email: parsed.data.email,
    };
    const supabase = await createClient();
    const { error } = vendorId
      ? await (supabase.from('vendors') as any).update(row).eq('id', vendorId)
      : await (supabase.from('vendors') as any).insert(row);
    if (error) return fail(friendlyDbError(error, 'Could not save the vendor. Please try again.'));
    revalidate();
    return { ok: true, message: vendorId ? 'Vendor updated.' : 'Vendor added.' };
  } catch {
    return fail('Could not save the vendor. Please try again.');
  }
}

/** Blacklist needs a reason; only the Executive Director can lift it (the database repeats this). */
export async function setBlacklistAction(vendorId: string, blacklisted: boolean, reason?: string): Promise<ProcurementActionResult> {
  try {
    if (!isUuid(vendorId)) return fail('Vendor not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canManageVendors(actor.roles)) return fail('Only Procurement or the Executive Director can manage vendors.');
    if (!blacklisted && !canLiftBlacklist(actor.roles)) return fail('Only the Executive Director can remove a vendor from the blacklist.');

    let patch: Record<string, unknown>;
    if (blacklisted) {
      const r = blacklistReasonSchema.safeParse(reason ?? '');
      if (!r.success) return fail(firstIssue(r.error));
      patch = { is_blacklisted: true, blacklist_reason: r.data };
    } else {
      patch = { is_blacklisted: false, blacklist_reason: null };
    }
    const supabase = await createClient();
    const { error } = await (supabase.from('vendors') as any).update(patch).eq('id', vendorId);
    if (error) return fail(friendlyDbError(error, 'Could not change the blacklist. Please try again.'));
    revalidate();
    return { ok: true, message: blacklisted ? 'Vendor blacklisted.' : 'Vendor removed from the blacklist.' };
  } catch {
    return fail('Could not change the blacklist. Please try again.');
  }
}

interface RequestDb {
  id: string;
  project_id: string;
  requester_id: string;
  description: string;
  estimated_amount: number | string;
  status: PurchaseStatus;
  created_at: string;
}
interface QuoteDb {
  id: string;
  purchase_request_id: string;
  vendor_id: string;
  amount: number | string;
  is_selected: boolean;
}
interface ApprovalDb {
  subject_id: string;
  step_no: number;
  required_role: PurchaseTrailStep['role'];
  status: PurchaseTrailStep['status'];
  actor_id: string | null;
  acted_at: string | null;
  comment: string | null;
}

export async function listPurchaseRequestsAction(): Promise<ProcurementDataResult<PurchaseRequestRow[]>> {
  try {
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const supabase = await createClient();

    const { data, error } = await (supabase.from('purchase_requests') as any)
      .select('id, project_id, requester_id, description, estimated_amount, status, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) return fail('Could not load the requests. Please refresh the page.');
    const rows = (data ?? []) as RequestDb[];
    if (rows.length === 0) return { ok: true, data: [] };

    const ids = rows.map((r) => r.id);
    const projectIds = [...new Set(rows.map((r) => r.project_id))];
    const [quotesRes, ordersRes, approvalsRes, projectsRes, vendorsRes] = await Promise.all([
      (supabase.from('quotations') as any).select('id, purchase_request_id, vendor_id, amount, is_selected').in('purchase_request_id', ids),
      (supabase.from('purchase_orders') as any).select('purchase_request_id, vendor_id, total_amount, issued_at').in('purchase_request_id', ids),
      (supabase.from('approvals') as any)
        .select('subject_id, step_no, required_role, status, actor_id, acted_at, comment')
        .eq('subject_type', 'procurement')
        .in('subject_id', ids)
        .order('step_no', { ascending: true }),
      (supabase.from('projects') as any).select('id, code, title').in('id', projectIds),
      (supabase.from('vendors') as any).select('id, name, is_blacklisted'),
    ]);
    const quotes = (quotesRes.data ?? []) as QuoteDb[];
    const orders = (ordersRes.data ?? []) as Array<{ purchase_request_id: string; vendor_id: string; total_amount: number | string; issued_at: string }>;
    const approvals = (approvalsRes.data ?? []) as ApprovalDb[];
    const projects = new Map(((projectsRes.data ?? []) as Array<{ id: string; code: string | null; title: string | null }>).map((p) => [p.id, p]));
    const vendors = new Map(((vendorsRes.data ?? []) as Array<{ id: string; name: string; is_blacklisted: boolean }>).map((v) => [v.id, v]));

    const personIds = [...new Set([...rows.map((r) => r.requester_id), ...approvals.map((a) => a.actor_id).filter((x): x is string => !!x)])];
    const { data: people } = await (supabase.from('profiles') as any).select('id, full_name').in('id', personIds);
    const names = new Map(((people ?? []) as Array<{ id: string; full_name: string | null }>).map((p) => [p.id, p.full_name]));

    const result: PurchaseRequestRow[] = rows.map((r) => {
      const quotations: QuotationRow[] = quotes
        .filter((q) => q.purchase_request_id === r.id)
        .map((q) => ({
          id: q.id,
          vendorId: q.vendor_id,
          vendorName: vendors.get(q.vendor_id)?.name ?? 'Unknown vendor',
          amount: Number(q.amount),
          isSelected: q.is_selected,
          isBlacklisted: vendors.get(q.vendor_id)?.is_blacklisted ?? false,
        }));
      const trail: PurchaseTrailStep[] = approvals
        .filter((a) => a.subject_id === r.id)
        .map((a) => ({
          stepNo: a.step_no,
          role: a.required_role,
          status: a.status,
          actorId: a.actor_id,
          actorName: a.actor_id ? (names.get(a.actor_id) ?? null) : null,
          actedAt: a.acted_at,
          comment: a.comment,
        }));
      const approver = [...trail].reverse().find((t) => t.status === 'approved');
      const estimated = Number(r.estimated_amount);
      const { actions, note, canEditQuotations } = purchaseActionsFor({
        status: r.status,
        requesterId: r.requester_id,
        userId: actor.userId,
        roles: actor.roles,
        estimatedAmount: estimated,
        quotations,
        approverId: approver?.actorId ?? null,
      });
      const order = orders.find((o) => o.purchase_request_id === r.id);
      const project = projects.get(r.project_id);
      return {
        id: r.id,
        projectId: r.project_id,
        projectCode: project?.code ?? null,
        projectTitle: project?.title ?? null,
        requesterId: r.requester_id,
        requesterName: names.get(r.requester_id) ?? null,
        description: r.description,
        estimatedAmount: estimated,
        status: r.status,
        createdAt: r.created_at,
        quotations,
        order: order
          ? { vendorName: vendors.get(order.vendor_id)?.name ?? 'Unknown vendor', totalAmount: Number(order.total_amount), issuedAt: order.issued_at }
          : null,
        trail,
        actions,
        note,
        canEditQuotations,
      };
    });
    return { ok: true, data: result };
  } catch {
    return fail('Could not load the requests. Please refresh the page.');
  }
}

export async function createPurchaseRequestAction(values: PurchaseRequestFormValues): Promise<ProcurementActionResult> {
  try {
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const parsed = purchaseRequestSchema.safeParse(values);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const supabase = await createClient();
    const { error } = await (supabase.from('purchase_requests') as any).insert({
      project_id: parsed.data.projectId,
      description: parsed.data.description,
      estimated_amount: parsed.data.estimatedAmount,
      status: 'draft',
    });
    if (error) return fail(friendlyDbError(error, 'Could not save the request. Please check the values and try again.'));
    revalidate();
    return { ok: true, message: 'Draft saved. Submit it when it is ready.' };
  } catch {
    return fail('Could not save the request. Please try again.');
  }
}

export async function updateDraftRequestAction(requestId: string, values: Pick<PurchaseRequestFormValues, 'description' | 'estimatedAmount'>): Promise<ProcurementActionResult> {
  try {
    if (!isUuid(requestId)) return fail('Request not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const parsed = draftEditSchema.safeParse(values);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const supabase = await createClient();
    const { error } = await (supabase.from('purchase_requests') as any)
      .update({ description: parsed.data.description, estimated_amount: parsed.data.estimatedAmount })
      .eq('id', requestId);
    if (error) return fail(friendlyDbError(error, 'Could not update the draft. Please try again.'));
    revalidate();
    return { ok: true, message: 'Draft updated.' };
  } catch {
    return fail('Could not update the draft. Please try again.');
  }
}

export async function deleteDraftRequestAction(requestId: string): Promise<ProcurementActionResult> {
  try {
    if (!isUuid(requestId)) return fail('Request not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const supabase = await createClient();
    const { error } = await (supabase.from('purchase_requests') as any).delete().eq('id', requestId).eq('status', 'draft');
    if (error) return fail(friendlyDbError(error, 'Could not delete the draft. Please try again.'));
    revalidate();
    return { ok: true, message: 'Draft deleted.' };
  } catch {
    return fail('Could not delete the draft. Please try again.');
  }
}

export async function addQuotationAction(requestId: string, values: QuotationFormValues): Promise<ProcurementActionResult> {
  try {
    if (!isUuid(requestId)) return fail('Request not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!actor.roles.includes('procurement')) return fail('Only Procurement can add quotations.');
    const parsed = quotationSchema.safeParse(values);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const supabase = await createClient();
    const { error } = await (supabase.from('quotations') as any).insert({
      purchase_request_id: requestId,
      vendor_id: parsed.data.vendorId,
      amount: parsed.data.amount,
    });
    if (error) return fail(friendlyDbError(error, 'Could not add the quotation. Please try again.'));
    revalidate();
    return { ok: true, message: 'Quotation added.' };
  } catch {
    return fail('Could not add the quotation. Please try again.');
  }
}

export async function removeQuotationAction(quotationId: string): Promise<ProcurementActionResult> {
  try {
    if (!isUuid(quotationId)) return fail('Quotation not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!actor.roles.includes('procurement')) return fail('Only Procurement can remove quotations.');
    const supabase = await createClient();
    const { error } = await (supabase.from('quotations') as any).delete().eq('id', quotationId);
    if (error) return fail(friendlyDbError(error, 'Could not remove the quotation. Please try again.'));
    revalidate();
    return { ok: true, message: 'Quotation removed.' };
  } catch {
    return fail('Could not remove the quotation. Please try again.');
  }
}

/** Submit, mark ready, approve (with the chosen quotation), reject, or issue the order. */
export async function actOnPurchaseRequestAction(
  requestId: string,
  action: PurchaseAction,
  options: { comment?: string; quotationId?: string } = {}
): Promise<ProcurementActionResult> {
  try {
    if (!isUuid(requestId)) return fail('Request not found.');
    if (!['submit', 'ready', 'approve', 'reject', 'issue_po'].includes(action)) return fail('Unknown action.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');

    let quotationId: string | null = null;
    let comment = (options.comment ?? '').trim();
    if (action === 'approve') {
      const parsed = approveSchema.safeParse({ quotationId: options.quotationId ?? '', comment });
      if (!parsed.success) return fail(firstIssue(parsed.error));
      quotationId = parsed.data.quotationId;
      comment = parsed.data.comment;
    }
    if (action === 'reject' && comment.length < 3) return fail('A comment is required (at least 3 characters).');
    if (comment.length > 1000) return fail('Comment must be 1000 characters or fewer.');

    const supabase = await createClient();
    const { error } = await supabase.rpc('act_on_purchase_request' as never, {
      p_request_id: requestId,
      p_action: action,
      p_comment: comment === '' ? null : comment,
      p_quotation_id: quotationId,
    } as never);
    if (error) return fail(friendlyDbError(error, 'Could not save this step. Please refresh and try again.'));
    revalidate();
    const done: Record<PurchaseAction, string> = {
      submit: 'Submitted. Procurement will collect quotations.',
      ready: 'Quotations accepted. It now waits for approval.',
      approve: 'Approved. Procurement can now issue the order.',
      reject: 'Request rejected.',
      issue_po: 'Order issued.',
    };
    return { ok: true, message: done[action] };
  } catch {
    return fail('Could not save this step. Please try again.');
  }
}
