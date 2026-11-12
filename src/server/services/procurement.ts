import { checkQuotations, type QuotationLine } from '@/lib/procurement';

export interface QuotationInput extends QuotationLine {
  vendorName: string;
}

/**
 * Can a purchase order go to the selected vendor? This is the readable twin of the database rule in
 * public.act_on_purchase_request (migration 0028), which is the one that really decides.
 *
 * The blacklist flags in `quotations` MUST come from the database, never from the browser.
 */
export function validateProcurementOrder(input: {
  estimatedAmount: number;
  quotations: QuotationInput[];
  selectedVendorId: string;
}): { allowed: boolean; reason?: string } {
  const selected = input.quotations.find((q) => q.vendorId === input.selectedVendorId);
  if (!selected) {
    return { allowed: false, reason: 'The selected vendor has not given a quotation for this request.' };
  }
  if (selected.isBlacklisted) {
    return { allowed: false, reason: `Vendor '${selected.vendorName}' is blacklisted and cannot receive POs.` };
  }
  const verdict = checkQuotations({ estimatedAmount: input.estimatedAmount, quotations: input.quotations });
  if (!verdict.ok) return { allowed: false, reason: verdict.reason };
  return { allowed: true };
}
