export interface QuotationInput {
  vendorId: string;
  vendorName: string;
  amount: number;
  isBlacklisted: boolean;
}

export function validateProcurementOrder(input: {
  estimatedAmount: number;
  quotations: QuotationInput[];
  selectedVendorId: string;
}): { allowed: boolean; reason?: string } {
  // Rule 1: Check selected vendor is not blacklisted
  const selectedVendor = input.quotations.find((q) => q.vendorId === input.selectedVendorId);
  if (selectedVendor && selectedVendor.isBlacklisted) {
    return { allowed: false, reason: `Vendor '${selectedVendor.vendorName}' is blacklisted and cannot receive POs.` };
  }

  // Rule 2: Require minimum 3 quotations for purchase requests above 50,000 BDT
  const PROCUREMENT_THRESHOLD = 50000;
  if (input.estimatedAmount >= PROCUREMENT_THRESHOLD && input.quotations.length < 3) {
    return {
      allowed: false,
      reason: `Procurement policy threshold rule: Requests >= 50,000 BDT require at least 3 competitive vendor quotations (currently has ${input.quotations.length}).`,
    };
  }

  return { allowed: true };
}
