import { describe, it, expect } from 'vitest';
import { requiresMFA, PRIVILEGED_MFA_ROLES } from '../mfa-rules';

describe('MFA Role Enforcement Rules', () => {
  it('should require MFA for all 4 privileged roles', () => {
    expect(requiresMFA(['super_admin'])).toBe(true);
    expect(requiresMFA(['executive'])).toBe(true);
    expect(requiresMFA(['finance'])).toBe(true);
    expect(requiresMFA(['programme_manager'])).toBe(true);
  });

  it('should NOT require MFA for field officers or donors', () => {
    expect(requiresMFA(['field_officer'])).toBe(false);
    expect(requiresMFA(['donor'])).toBe(false);
    expect(requiresMFA(['partner'])).toBe(false);
  });
});
