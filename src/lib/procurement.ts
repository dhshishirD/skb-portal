import { z } from 'zod';
import type { AppRole } from './database.types';
import { decimalText, optionalText } from './budget';

/*
 * Procurement: vendors, purchase requests, quotations, purchase orders (migration 0028).
 *
 * The database is the authority (act_on_purchase_request and the guards). This file gives the
 * screens the same rules so buttons appear for the right people and forms are checked early.
 * Keep the two thresholds in step with the constants inside the SQL function.
 */

/** From this amount (BDT) quotations from 3 different vendors are required. */
export const QUOTE_THRESHOLD_BDT = 50_000;
/** From this amount (BDT) the Executive Director approves instead of the Programme Manager. */
export const EXECUTIVE_THRESHOLD_BDT = 500_000;
export const MIN_VENDORS_ABOVE_THRESHOLD = 3;

export type PurchaseStatus = 'draft' | 'submitted' | 'quotations_attached' | 'approved' | 'po_issued' | 'rejected';
export type PurchaseAction = 'submit' | 'ready' | 'approve' | 'reject' | 'issue_po';

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  draft: 'Draft',
  submitted: 'Collecting quotations',
  quotations_attached: 'Waiting for approval',
  approved: 'Approved, waiting for order',
  po_issued: 'Order issued',
  rejected: 'Rejected',
};

export const purchaseRequestSchema = z.object({
  projectId: z.string().uuid('Choose a project'),
  description: z.string().trim().min(3, 'Describe what is needed (at least 3 characters)').max(1000, 'Description must be 1000 characters or fewer'),
  estimatedAmount: decimalText('Estimated amount', { decimals: 2, max: 999_999_999_999.99, positive: true }),
});
export type PurchaseRequestFormValues = z.input<typeof purchaseRequestSchema>;
export const EMPTY_REQUEST_FORM: PurchaseRequestFormValues = { projectId: '', description: '', estimatedAmount: '' };

export const draftEditSchema = purchaseRequestSchema.omit({ projectId: true });

export const vendorSchema = z.object({
  name: z.string().trim().min(2, 'Vendor name must be at least 2 characters').max(200, 'Vendor name must be 200 characters or fewer'),
  contactPerson: optionalText(120, 'Contact person'),
  phone: optionalText(30, 'Phone'),
  email: optionalText(254, 'Email').refine((v) => v === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Email does not look right'),
});
export type VendorFormValues = z.input<typeof vendorSchema>;
export const EMPTY_VENDOR_FORM: VendorFormValues = { name: '', contactPerson: '', phone: '', email: '' };

export const blacklistReasonSchema = z.string().trim().min(5, 'Write the reason (at least 5 characters)').max(500, 'Reason must be 500 characters or fewer');

export const quotationSchema = z.object({
  vendorId: z.string().uuid('Choose a vendor'),
  amount: decimalText('Quotation amount', { decimals: 2, max: 999_999_999_999.99, positive: true }),
});
export type QuotationFormValues = z.input<typeof quotationSchema>;

export const approveSchema = z.object({
  quotationId: z.string().uuid('Choose a quotation'),
  comment: z.string().trim().max(1000, 'Comment must be 1000 characters or fewer'),
});

export interface QuotationLine {
  vendorId: string;
  amount: number;
  isBlacklisted: boolean;
}

export interface QuotationVerdict {
  ok: boolean;
  reason?: string;
  vendorsNow: number;
  vendorsNeeded: number;
}

const isMoney = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

/**
 * Are the quotations enough to go on? Counts DIFFERENT vendors, ignores nothing silently, and uses the
 * larger of the estimate and the highest quote so an understated estimate cannot avoid the rule.
 */
export function checkQuotations(input: { estimatedAmount: number; quotations: readonly QuotationLine[] }): QuotationVerdict {
  const { estimatedAmount, quotations } = input;
  if (!isMoney(estimatedAmount)) {
    return { ok: false, reason: 'The estimated amount must be a number above zero.', vendorsNow: 0, vendorsNeeded: 1 };
  }
  if (quotations.some((q) => !isMoney(q.amount))) {
    return { ok: false, reason: 'Every quotation amount must be a number above zero.', vendorsNow: 0, vendorsNeeded: 1 };
  }
  const vendorsNow = new Set(quotations.map((q) => q.vendorId)).size;
  if (vendorsNow === 0) return { ok: false, reason: 'Attach at least one quotation.', vendorsNow, vendorsNeeded: 1 };
  if (quotations.some((q) => q.isBlacklisted)) {
    return { ok: false, reason: 'A blacklisted vendor is among the quotations.', vendorsNow, vendorsNeeded: 1 };
  }
  const basis = Math.max(estimatedAmount, ...quotations.map((q) => q.amount));
  const vendorsNeeded = basis >= QUOTE_THRESHOLD_BDT ? MIN_VENDORS_ABOVE_THRESHOLD : 1;
  if (vendorsNow < vendorsNeeded) {
    return {
      ok: false,
      reason: `From BDT ${QUOTE_THRESHOLD_BDT.toLocaleString('en-US')} quotations from ${vendorsNeeded} different vendors are required (now ${vendorsNow}).`,
      vendorsNow,
      vendorsNeeded,
    };
  }
  return { ok: true, vendorsNow, vendorsNeeded };
}

/** Which role approves a purchase of this size. The Executive Director can approve any size. */
export function approverRoleFor(amountBdt: number): AppRole {
  return amountBdt >= EXECUTIVE_THRESHOLD_BDT ? 'executive' : 'programme_manager';
}

export function lowestAmount(quotations: readonly QuotationLine[]): number | null {
  const amounts = quotations.map((q) => q.amount).filter(isMoney);
  return amounts.length ? Math.min(...amounts) : null;
}

export interface PurchaseTrailStep {
  stepNo: number;
  role: AppRole;
  status: 'approved' | 'rejected' | 'returned' | 'pending';
  actorId: string | null;
  actorName: string | null;
  actedAt: string | null;
  comment: string | null;
}

export interface QuotationRow {
  id: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  isSelected: boolean;
  isBlacklisted: boolean;
}

export interface PurchaseRequestRow {
  id: string;
  projectId: string;
  projectCode: string | null;
  projectTitle: string | null;
  requesterId: string;
  requesterName: string | null;
  description: string;
  estimatedAmount: number;
  status: PurchaseStatus;
  createdAt: string;
  quotations: QuotationRow[];
  order: { vendorName: string; totalAmount: number; issuedAt: string } | null;
  trail: PurchaseTrailStep[];
  /** What the signed-in user may do with this request right now. */
  actions: PurchaseAction[];
  /** Plain-words note about what is missing, or null. */
  note: string | null;
  canEditQuotations: boolean;
}

/** The buttons a person should see on one request. The database repeats every check. */
export function purchaseActionsFor(args: {
  status: PurchaseStatus;
  requesterId: string;
  userId: string;
  roles: readonly AppRole[];
  estimatedAmount: number;
  quotations: readonly QuotationLine[];
  approverId: string | null;
}): { actions: PurchaseAction[]; note: string | null; canEditQuotations: boolean } {
  const has = (role: AppRole) => args.roles.includes(role);
  const actions: PurchaseAction[] = [];
  let note: string | null = null;
  const verdict = checkQuotations({ estimatedAmount: args.estimatedAmount, quotations: args.quotations });

  if (args.status === 'draft' && args.requesterId === args.userId) actions.push('submit');
  if (args.status === 'submitted') {
    if (has('procurement') && verdict.ok) actions.push('ready');
    if (!verdict.ok) note = verdict.reason ?? null;
  }
  if (args.status === 'quotations_attached' && args.requesterId !== args.userId) {
    const chosenBasis = Math.max(args.estimatedAmount, ...args.quotations.map((q) => q.amount), 0);
    const need = approverRoleFor(chosenBasis);
    if (has(need) || has('executive')) actions.push('approve');
    else note = `Waiting for the ${need === 'executive' ? 'Executive Director' : 'Programme Manager'}.`;
  }
  if (args.status === 'approved' && has('procurement') && args.approverId !== args.userId) actions.push('issue_po');
  if (['submitted', 'quotations_attached', 'approved'].includes(args.status) && (has('procurement') || has('programme_manager') || has('executive'))) {
    actions.push('reject');
  }
  const canEditQuotations = has('procurement') && ['submitted', 'quotations_attached'].includes(args.status);
  return { actions, note, canEditQuotations };
}

export interface VendorRow {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  isBlacklisted: boolean;
  blacklistReason: string | null;
  canManage: boolean;
  canLift: boolean;
}

export const canManageVendors = (roles: readonly AppRole[]) => roles.includes('procurement') || roles.includes('executive');
export const canLiftBlacklist = (roles: readonly AppRole[]) => roles.includes('executive');
