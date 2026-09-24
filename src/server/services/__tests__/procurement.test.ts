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

  it('should DENY purchase order issuance if fewer than 3 quotations exist above threshold', () => {
    const res = validateProcurementOrder({
      estimatedAmount: 75000,
      quotations: [
        { vendorId: 'v1', vendorName: 'Vendor A', amount: 70000, isBlacklisted: false },
        { vendorId: 'v2', vendorName: 'Vendor B', amount: 72000, isBlacklisted: false },
      ],
      selectedVendorId: 'v1',
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('require at least 3 competitive vendor quotations');
  });

  it('should DENY purchase order to blacklisted vendors', () => {
    const res = validateProcurementOrder({
      estimatedAmount: 20000,
      quotations: [
        { vendorId: 'v1', vendorName: 'Blacklisted Supplies Ltd', amount: 18000, isBlacklisted: true },
      ],
      selectedVendorId: 'v1',
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('is blacklisted');
  });
});
