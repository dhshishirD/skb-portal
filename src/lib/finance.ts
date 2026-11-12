import { z } from 'zod';
import type { AppRole } from './database.types';
import { decimalText, optionalText } from './budget';
import { validateApprovalStep } from '@/server/services/approvalEngine';

/*
 * Finance: expense claims (migration 0028).
 *
 * The database is the authority (act_on_expense). This file only gives the screens the same
 * rules, so buttons are shown to the right people and forms are checked before they are sent.
 */

export type ExpenseStatus =
  | 'draft'
  | 'submitted'
  | 'pm_approved'
  | 'finance_verified'
  | 'director_approved'
  | 'paid'
  | 'returned'
  | 'rejected'
  | 'cancelled';

export type ExpenseAction = 'approve' | 'return' | 'reject' | 'cancel';

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  draft: 'Draft',
  submitted: 'Waiting for Programme Manager',
  pm_approved: 'Waiting for Finance',
  finance_verified: 'Waiting for Executive Director',
  director_approved: 'Approved, waiting for payment',
  paid: 'Paid',
  returned: 'Returned',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

/** Who acts next on a claim in each status (same chain as public.act_on_expense). */
export const EXPENSE_STEPS: Partial<Record<ExpenseStatus, { role: AppRole; approveLabel: string }>> = {
  submitted: { role: 'programme_manager', approveLabel: 'Approve' },
  pm_approved: { role: 'finance', approveLabel: 'Verify' },
  finance_verified: { role: 'executive', approveLabel: 'Approve' },
  director_approved: { role: 'finance', approveLabel: 'Mark as paid' },
};

export const EXPENSE_CURRENCIES = ['BDT', 'EUR', 'USD', 'GBP'] as const;

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expense date is required')
  .refine((v) => !Number.isNaN(Date.parse(v + 'T00:00:00Z')), 'Expense date is not a real date')
  .refine((v) => Date.parse(v + 'T00:00:00Z') <= Date.now() + 2 * 86_400_000, 'The expense date cannot be in the future');

const fxSchema = decimalText('Exchange rate to BDT', { decimals: 4, max: 99_999_999.9999, positive: true });

export const expenseClaimSchema = z
  .object({
    projectId: z.string().uuid('Choose a project'),
    amount: decimalText('Amount', { decimals: 2, max: 999_999_999, positive: true }),
    currency: z.enum(EXPENSE_CURRENCIES, { errorMap: () => ({ message: 'Choose a currency' }) }),
    fxRate: z.string().trim().default(''),
    expenseDate: isoDate,
    description: z.string().trim().min(3, 'Describe the expense (at least 3 characters)').max(1000, 'Description must be 1000 characters or fewer'),
    vendorName: optionalText(200, 'Vendor name').refine((v) => v === null || v.length >= 2, 'Vendor name must be at least 2 characters'),
    receiptRef: optionalText(100, 'Receipt or voucher number'),
  })
  .superRefine((v, ctx) => {
    if (v.currency !== 'BDT') {
      const r = fxSchema.safeParse(v.fxRate);
      if (!r.success) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fxRate'], message: r.error.issues[0]?.message ?? 'Exchange rate is required' });
    }
  })
  .transform((v) => ({ ...v, fxRate: v.currency === 'BDT' ? 1 : fxSchema.parse(v.fxRate) }));

export type ExpenseClaimFormValues = z.input<typeof expenseClaimSchema>;
export type ExpenseClaimInput = z.output<typeof expenseClaimSchema>;

export const EMPTY_EXPENSE_FORM: ExpenseClaimFormValues = {
  projectId: '',
  amount: '',
  currency: 'BDT',
  fxRate: '',
  expenseDate: '',
  description: '',
  vendorName: '',
  receiptRef: '',
};

export const expenseCommentSchema = z.string().trim().max(1000, 'Comment must be 1000 characters or fewer');

export interface ExpenseTrailStep {
  stepNo: number;
  role: AppRole;
  status: 'approved' | 'rejected' | 'returned' | 'pending';
  actorId: string | null;
  actorName: string | null;
  actedAt: string | null;
  comment: string | null;
}

export interface ExpenseRow {
  id: string;
  projectId: string;
  projectCode: string | null;
  projectTitle: string | null;
  claimantId: string;
  claimantName: string | null;
  amount: number;
  currency: string;
  fxRateToBdt: number;
  amountBdt: number;
  expenseDate: string;
  description: string;
  vendorName: string | null;
  receiptRef: string | null;
  status: ExpenseStatus;
  submittedAt: string;
  trail: ExpenseTrailStep[];
  /** What the signed-in user may do with this claim right now. */
  actions: ExpenseAction[];
  approveLabel: string | null;
  waitingFor: AppRole | null;
}

export function amountInBdt(amount: number, currency: string, fxRate: number): number {
  const value = currency === 'BDT' ? amount : amount * fxRate;
  return Math.round(value * 100) / 100;
}

/** The buttons a person should see on one claim. The database repeats every check. */
export function expenseActionsFor(args: {
  status: ExpenseStatus;
  claimantId: string;
  userId: string;
  roles: readonly AppRole[];
  lastApproverId: string | null;
}): { actions: ExpenseAction[]; approveLabel: string | null; waitingFor: AppRole | null } {
  const step = EXPENSE_STEPS[args.status];
  const actions: ExpenseAction[] = [];
  if (args.status === 'submitted' && args.claimantId === args.userId) actions.push('cancel');
  if (!step) return { actions, approveLabel: null, waitingFor: null };
  const verdict = validateApprovalStep({
    claimantId: args.claimantId,
    actorId: args.userId,
    previousActorId: args.lastApproverId ?? undefined,
    actorRoles: [...args.roles],
    requiredRole: step.role,
  });
  if (verdict.allowed) actions.unshift('approve', 'return', 'reject');
  return { actions, approveLabel: verdict.allowed ? step.approveLabel : null, waitingFor: step.role };
}
