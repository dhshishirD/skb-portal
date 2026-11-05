import { z } from 'zod';
import type { AppRole } from './database.types';

/**
 * Fund receipts: each transfer received from the donor for a project.
 *
 * The database (migration 0017) is what really enforces who may do what. The helpers here drive
 * what the screen shows, check typed values, add up the amounts (in whole cents, never floating
 * point) and turn database errors into plain words.
 */

export type AckStatus = 'not_sent' | 'sent' | 'signed_copy_received';

export const ACK_STATUSES: AckStatus[] = ['not_sent', 'sent', 'signed_copy_received'];
export const ACK_LABELS: Record<AckStatus, string> = {
  not_sent: 'Letter not sent',
  sent: 'Letter sent, waiting for signed copy',
  signed_copy_received: 'Signed copy received',
};
export const isAckStatus = (v: unknown): v is AckStatus => ACK_STATUSES.includes(v as AckStatus);

export interface FundReceipt {
  id: string;
  receivedOn: string; // yyyy-mm-dd
  amount: number;
  currency: string;
  reference: string | null;
  fromName: string | null;
  note: string | null;
  ackStatus: AckStatus;
}

export interface FundReceiptData {
  projectId: string;
  projectCode: string;
  projectTitle: string;
  /** Donor amount on the project and its currency (projects.budget_amount / budget_currency). */
  donorAmount: number | null;
  currency: string;
  donorName: string | null;
  receipts: FundReceipt[];
  closed: boolean;
  canRecord: boolean;
  canDelete: boolean;
}

// ===== Who may do what =====
const RECORDERS: AppRole[] = ['executive', 'finance', 'project_officer'];
export const canRecordReceipts = (roles: AppRole[]) => roles.some((r) => RECORDERS.includes(r));
export const canDeleteReceipts = (roles: AppRole[]) => roles.some((r) => r === 'executive' || r === 'finance');

// ===== Totals (whole cents) =====
const cents = (n: number) => Math.round(n * 100);

export interface ReceiptTotals {
  /** Per currency, in cents. */
  byCurrency: Record<string, number>;
  /** Received in the project's currency, in cents. */
  receivedCents: number;
  /** Donor amount minus received, in cents; null when the project has no donor amount. */
  remainingCents: number | null;
  /** Receipts in a currency other than the project's. */
  otherCurrencies: string[];
}

export function totalReceipts(receipts: FundReceipt[], currency: string, donorAmount: number | null): ReceiptTotals {
  const byCurrency: Record<string, number> = {};
  for (const r of receipts) byCurrency[r.currency] = (byCurrency[r.currency] ?? 0) + cents(r.amount);
  const receivedCents = byCurrency[currency] ?? 0;
  return {
    byCurrency,
    receivedCents,
    remainingCents: donorAmount === null ? null : cents(donorAmount) - receivedCents,
    otherCurrencies: Object.keys(byCurrency).filter((c) => c !== currency),
  };
}

export const formatMoney = (centsValue: number | null): string =>
  centsValue === null
    ? '—'
    : (centsValue / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// ===== Typed values (the form holds text) =====
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((v) => (v === '' ? null : v));

export const fundReceiptSchema = z.object({
  receivedOn: z
    .string()
    .trim()
    .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)), 'Choose the date the money was received'),
  amount: z
    .string()
    .trim()
    .transform((value, ctx) => {
      const text = value.replace(/,/g, '');
      const bad = (message: string) => {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });
        return z.NEVER;
      };
      if (text === '') return bad('Amount is required');
      if (!/^\d+(\.\d+)?$/.test(text)) return bad('Amount must be a number');
      if ((text.split('.')[1]?.length ?? 0) > 2) return bad('Amount can have at most 2 decimal places');
      const n = Number(text);
      if (n <= 0) return bad('Amount must be more than zero');
      if (n > 999_999_999_999) return bad('Amount is too large');
      return n;
    }),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter code such as EUR'),
  reference: optionalText(120, 'Bank reference'),
  fromName: optionalText(200, 'From'),
  note: optionalText(500, 'Note'),
});
export type FundReceiptFormValues = z.input<typeof fundReceiptSchema>;
export type FundReceiptInput = z.output<typeof fundReceiptSchema>;

export const emptyReceiptForm = (currency: string, donorName: string | null): FundReceiptFormValues => ({
  receivedOn: '',
  amount: '',
  currency,
  reference: '',
  fromName: donorName ?? '',
  note: '',
});

/** Plain-words version of a database error from migration 0017. */
export function friendlyReceiptError(error: { code?: string | null; message?: string | null }): string {
  const message = error.message ?? '';
  const code = error.code ?? '';
  if (/closed project/i.test(message)) return 'The fund receipts of a closed project cannot be changed.';
  if (/row-level security|violates row-level|permission denied/i.test(message) || code === '42501') {
    return 'You do not have permission to do this.';
  }
  if (code === '23514' || /violates check constraint/i.test(message)) return 'Some values are not allowed. Please check them and try again.';
  return 'The database could not save this. Please try again.';
}
