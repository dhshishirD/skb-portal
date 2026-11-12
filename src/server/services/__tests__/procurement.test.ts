import { describe, it, expect } from 'vitest';
import { validateProcurementOrder } from '../procurement';
import { generateDedupHash, isPotentialDuplicate } from '@/lib/beneficiary-dedup';

describe('Phase 5 Beneficiary Dedup & Procurement Rules', () => {
  it('should generate identical dedup hashes for normalized names and birth years', () => {
    const hash1 = generateDedupHash({ fullName: '  Abdul  Karim ', birthYear: 1988, locationCode: 'UP-UKHIYA' });
    const hash2 = generateDedupHash({ fullName: 'abdul karim', birthYear: 1988, locationCode: 'up-ukhiya' });
    expect(hash1).toBe(hash2);
  });

  it('should detect duplicate beneficiary registration', () => {
    const existing = [
      { fullName: 'Fatema Begum', birthYear: 1992, locationCode: 'UP-TEKNAF' },
    ];
    const isDup = isPotentialDuplicate(
      { fullName: 'fatema begum', birthYear: 1992, locationCode: 'up-teknaf' },
      existing
    );
    expect(isDup).toBe(true);
  });

  const q = (vendorId: string, amount: number, isBlacklisted = false) => ({ vendorId, vendorName: 'Vendor ' + vendorId, amount, isBlacklisted });

  it('should DENY purchase order issuance if fewer than 3 vendors quoted above the threshold', () => {
    const res = validateProcurementOrder({ estimatedAmount: 75000, quotations: [q('v1', 70000), q('v2', 72000)], selectedVendorId: 'v1' });
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('3 different vendors');
  });

  it('should DENY purchase order to blacklisted vendors', () => {
    const res = validateProcurementOrder({ estimatedAmount: 20000, quotations: [q('v1', 18000, true)], selectedVendorId: 'v1' });
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('blacklisted');
  });

  it('should count different vendors, not rows (three quotes from one vendor are one vendor)', () => {
    const res = validateProcurementOrder({ estimatedAmount: 75000, quotations: [q('v1', 70000), q('v1', 71000), q('v1', 72000)], selectedVendorId: 'v1' });
    expect(res.allowed).toBe(false);
  });

  it('should use the highest quote when the estimate is understated', () => {
    const res = validateProcurementOrder({ estimatedAmount: 10000, quotations: [q('v1', 60000)], selectedVendorId: 'v1' });
    expect(res.allowed).toBe(false);
  });

  it('should refuse a vendor that did not quote, and refuse bad amounts', () => {
    expect(validateProcurementOrder({ estimatedAmount: 1000, quotations: [q('v1', 900)], selectedVendorId: 'v9' }).allowed).toBe(false);
    expect(validateProcurementOrder({ estimatedAmount: 1000, quotations: [q('v1', Number.NaN)], selectedVendorId: 'v1' }).allowed).toBe(false);
    expect(validateProcurementOrder({ estimatedAmount: 1000, quotations: [q('v1', -5)], selectedVendorId: 'v1' }).allowed).toBe(false);
    expect(validateProcurementOrder({ estimatedAmount: Number.NaN, quotations: [q('v1', 900)], selectedVendorId: 'v1' }).allowed).toBe(false);
  });

  it('should ALLOW three different clean vendors above the threshold', () => {
    const res = validateProcurementOrder({ estimatedAmount: 75000, quotations: [q('v1', 70000), q('v2', 72000), q('v3', 74000)], selectedVendorId: 'v1' });
    expect(res.allowed).toBe(true);
  });
});
