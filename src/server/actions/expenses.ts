'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { friendlyDbError } from '@/lib/dbErrors';
import {
  EXPENSE_STEPS,
  amountInBdt,
  expenseActionsFor,
  expenseClaimSchema,
  expenseCommentSchema,
  type ExpenseAction,
  type ExpenseClaimFormValues,
  type ExpenseRow,
  type ExpenseStatus,
  type ExpenseTrailStep,
} from '@/lib/finance';
import { getActor, isUuid } from '@/server/services/projectsData';

/*
 * Finance: expense claims (migration 0028).
 *
 * Runs as the signed-in user. The database decides (row level security, guard_expense and the
 * act_on_expense function); the checks here only give clearer messages and fail fast.
 */

type Failure = { ok: false; error: string };
export type ExpenseActionResult = { ok: true; message?: string } | Failure;
export type ExpenseDataResult<T> = { ok: true; data: T } | Failure;

const fail = (error: string): Failure => ({ ok: false, error });
const firstIssue = (e: { issues: Array<{ message: string }> }) => e.issues[0]?.message ?? 'Please check the values.';

interface ExpenseDb {
  id: string;
  project_id: string;
  claimant_id: string;
  amount: number | string;
  currency: string;
  fx_rate_to_bdt: number | string;
  expense_date: string;
  description: string;
  vendor_name: string | null;
  receipt_ref: string | null;
  status: ExpenseStatus;
  submitted_at: string;
}

interface ApprovalDb {
  subject_id: string;
  step_no: number;
  required_role: ExpenseTrailStep['role'];
  status: ExpenseTrailStep['status'];
  actor_id: string | null;
  acted_at: string | null;
  comment: string | null;
}

function revalidate() {
  revalidatePath('/finance/expense-claims');
  revalidatePath('/finance/approvals');
}

/** Claims this user may see, with the approval trail and the buttons they may press. */
export async function listExpensesAction(): Promise<ExpenseDataResult<ExpenseRow[]>> {
  try {
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const supabase = await createClient();

    const { data, error } = await (supabase.from('expenses') as any)
      .select('id, project_id, claimant_id, amount, currency, fx_rate_to_bdt, expense_date, description, vendor_name, receipt_ref, status, submitted_at')
      .order('submitted_at', { ascending: false })
      .limit(500);
    if (error) return fail('Could not load the claims. Please refresh the page.');
    const rows = (data ?? []) as ExpenseDb[];
    if (rows.length === 0) return { ok: true, data: [] };

    const ids = rows.map((r) => r.id);
    const projectIds = [...new Set(rows.map((r) => r.project_id))];
    const [approvalsRes, projectsRes] = await Promise.all([
      (supabase.from('approvals') as any)
        .select('subject_id, step_no, required_role, status, actor_id, acted_at, comment')
        .eq('subject_type', 'expense')
        .in('subject_id', ids)
        .order('step_no', { ascending: true }),
      (supabase.from('projects') as any).select('id, code, title').in('id', projectIds),
    ]);
    const approvals = (approvalsRes.data ?? []) as ApprovalDb[];
    const projects = new Map(((projectsRes.data ?? []) as Array<{ id: string; code: string | null; title: string | null }>).map((p) => [p.id, p]));

    const personIds = [...new Set([...rows.map((r) => r.claimant_id), ...approvals.map((a) => a.actor_id).filter((x): x is string => !!x)])];
    const { data: people } = await (supabase.from('profiles') as any).select('id, full_name').in('id', personIds);
    const names = new Map(((people ?? []) as Array<{ id: string; full_name: string | null }>).map((p) => [p.id, p.full_name]));

    const result: ExpenseRow[] = rows.map((r) => {
      const trail: ExpenseTrailStep[] = approvals
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
      const lastApproved = [...trail].reverse().find((t) => t.status === 'approved');
      const { actions, approveLabel, waitingFor } = expenseActionsFor({
        status: r.status,
        claimantId: r.claimant_id,
        userId: actor.userId,
        roles: actor.roles,
        lastApproverId: lastApproved?.actorId ?? null,
      });
      const amount = Number(r.amount);
      const fx = Number(r.fx_rate_to_bdt);
      const project = projects.get(r.project_id);
      return {
        id: r.id,
        projectId: r.project_id,
        projectCode: project?.code ?? null,
        projectTitle: project?.title ?? null,
        claimantId: r.claimant_id,
        claimantName: names.get(r.claimant_id) ?? null,
        amount,
        currency: r.currency,
        fxRateToBdt: fx,
        amountBdt: amountInBdt(amount, r.currency, fx),
        expenseDate: r.expense_date,
        description: r.description,
        vendorName: r.vendor_name,
        receiptRef: r.receipt_ref,
        status: r.status,
        submittedAt: r.submitted_at,
        trail,
        actions,
        approveLabel,
        waitingFor,
      };
    });
    return { ok: true, data: result };
  } catch {
    return fail('Could not load the claims. Please refresh the page.');
  }
}

/** File a new expense claim. It starts at "submitted"; the database enforces the rest. */
export async function fileExpenseAction(values: ExpenseClaimFormValues): Promise<ExpenseActionResult> {
  try {
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const parsed = expenseClaimSchema.safeParse(values);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const v = parsed.data;

    const supabase = await createClient();
    const { error } = await (supabase.from('expenses') as any).insert({
      project_id: v.projectId,
      amount: v.amount,
      currency: v.currency,
      fx_rate_to_bdt: v.fxRate,
      expense_date: v.expenseDate,
      description: v.description,
      vendor_name: v.vendorName,
      receipt_ref: v.receiptRef,
      status: 'submitted',
    });
    if (error) return fail(friendlyDbError(error, 'Could not file the claim. Please check the values and try again.'));
    revalidate();
    return { ok: true, message: 'Claim filed. It now waits for the Programme Manager.' };
  } catch {
    return fail('Could not file the claim. Please try again.');
  }
}

/** Approve, return, reject or cancel. Returning and rejecting need a comment. */
export async function actOnExpenseAction(expenseId: string, action: ExpenseAction, comment?: string): Promise<ExpenseActionResult> {
  try {
    if (!isUuid(expenseId)) return fail('Claim not found.');
    if (!['approve', 'return', 'reject', 'cancel'].includes(action)) return fail('Unknown action.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');

    const c = expenseCommentSchema.safeParse(comment ?? '');
    if (!c.success) return fail(firstIssue(c.error));
    if ((action === 'return' || action === 'reject') && c.data.length < 3) {
      return fail('A comment is required (at least 3 characters).');
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('act_on_expense' as never, {
      p_expense_id: expenseId,
      p_action: action,
      p_comment: c.data === '' ? null : c.data,
    } as never);
    if (error) return fail(friendlyDbError(error, 'Could not save this step. Please refresh and try again.'));
    revalidate();
    const next = typeof data === 'string' ? (data as ExpenseStatus) : null;
    const waiting = next ? EXPENSE_STEPS[next] : undefined;
    return { ok: true, message: waiting ? `Done. Next step: ${waiting.approveLabel} by ${waiting.role.replace('_', ' ')}.` : 'Done.' };
  } catch {
    return fail('Could not save this step. Please try again.');
  }
}
