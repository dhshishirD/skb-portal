import type { AppRole } from './database.types';
import { calculateBudget, type BudgetItem } from './budget';
import { EXPENSE_STATUS_LABELS, type ExpenseStatus } from './finance';
import { PURCHASE_STATUS_LABELS, type PurchaseStatus } from './procurement';

/**
 * Planned against actual for one project: the budget on one side, expense claims and purchase
 * requests on the other. Worked out from existing data; nothing is stored.
 *
 * Claims and purchases are not tied to individual budget lines yet, so the comparison is for the
 * whole project. All amounts are BDT, in whole cents.
 */

/** Only roles that can read EVERY claim and purchase request of the project, so the totals are complete. */
const VIEWERS: AppRole[] = ['executive', 'programme_manager', 'project_officer', 'finance'];
export const canSeeBudgetVsActual = (roles: readonly AppRole[]) => roles.some((r) => VIEWERS.includes(r));

const CLAIM_SPENT = ['director_approved', 'paid'];
const CLAIM_WAITING = ['submitted', 'pm_approved', 'finance_verified'];

export interface ClaimInput {
  id: string;
  description: string;
  amount: number;
  fxRateToBdt: number;
  status: string;
  expenseDate: string;
}
export interface PurchaseInput {
  id: string;
  description: string;
  estimatedAmount: number;
  /** Total of the purchase order, when one has been issued. */
  orderTotal: number | null;
  status: string;
  createdAt: string;
}

export interface ActualLine {
  id: string;
  kind: 'claim' | 'purchase';
  description: string;
  bdtCents: number;
  statusLabel: string;
  date: string;
  counted: 'spent' | 'ordered' | 'waiting' | 'none';
}

export interface BudgetVsActual {
  plannedBdtCents: number;
  /** Claims approved by the director or paid. */
  claimsSpentBdtCents: number;
  claimsWaitingBdtCents: number;
  /** Purchase orders issued (the order total). */
  purchasesOrderedBdtCents: number;
  /** Purchases approved but not yet ordered, at the estimate. */
  purchasesApprovedBdtCents: number;
  /** Purchase requests still being quoted or waiting for approval, at the estimate. */
  purchasesWaitingBdtCents: number;
  /** Spent plus ordered plus approved: money that is gone or promised. */
  committedBdtCents: number;
  remainingBdtCents: number;
  percentCommitted: number | null;
  overBudget: boolean;
  lines: ActualLine[];
}

const cents = (n: number) => Math.round(n * 100);

export function budgetVsActual(input: {
  items: BudgetItem[];
  packagesCount: number;
  adminPercent: number;
  claims: ClaimInput[];
  purchases: PurchaseInput[];
}): BudgetVsActual {
  const planned = calculateBudget({
    items: input.items,
    packagesCount: input.packagesCount,
    adminPercent: input.adminPercent,
    exchangeRate: null,
    donorAmount: null,
    currency: 'BDT',
  }).projectBdtCents;

  let claimsSpent = 0;
  let claimsWaiting = 0;
  let ordered = 0;
  let approved = 0;
  let waiting = 0;
  const lines: ActualLine[] = [];

  for (const c of input.claims) {
    const bdt = Math.round(c.amount * c.fxRateToBdt * 100);
    const counted = CLAIM_SPENT.includes(c.status) ? 'spent' : CLAIM_WAITING.includes(c.status) ? 'waiting' : 'none';
    if (counted === 'spent') claimsSpent += bdt;
    if (counted === 'waiting') claimsWaiting += bdt;
    lines.push({
      id: c.id,
      kind: 'claim',
      description: c.description,
      bdtCents: bdt,
      statusLabel: EXPENSE_STATUS_LABELS[c.status as ExpenseStatus] ?? c.status,
      date: c.expenseDate,
      counted,
    });
  }

  for (const p of input.purchases) {
    let counted: ActualLine['counted'] = 'none';
    let bdt = cents(p.estimatedAmount);
    if (p.status === 'po_issued') {
      bdt = cents(p.orderTotal ?? p.estimatedAmount);
      ordered += bdt;
      counted = 'ordered';
    } else if (p.status === 'approved') {
      approved += bdt;
      counted = 'ordered';
    } else if (p.status === 'submitted' || p.status === 'quotations_attached') {
      waiting += bdt;
      counted = 'waiting';
    }
    lines.push({
      id: p.id,
      kind: 'purchase',
      description: p.description,
      bdtCents: bdt,
      statusLabel: PURCHASE_STATUS_LABELS[p.status as PurchaseStatus] ?? p.status,
      date: p.createdAt.slice(0, 10),
      counted,
    });
  }

  const committed = claimsSpent + ordered + approved;
  return {
    plannedBdtCents: planned,
    claimsSpentBdtCents: claimsSpent,
    claimsWaitingBdtCents: claimsWaiting,
    purchasesOrderedBdtCents: ordered,
    purchasesApprovedBdtCents: approved,
    purchasesWaitingBdtCents: waiting,
    committedBdtCents: committed,
    remainingBdtCents: planned - committed,
    percentCommitted: planned > 0 ? Math.round((committed * 100) / planned) : null,
    overBudget: planned > 0 && committed > planned,
    lines: lines.sort((a, b) => b.date.localeCompare(a.date) || a.description.localeCompare(b.description)),
  };
}
