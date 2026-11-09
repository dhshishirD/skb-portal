import { describe, expect, it } from 'vitest';
import {
  beneficiarySchema, canDeleteBeneficiaries, canReadAccessLog, canReadBeneficiaries, canRegisterBeneficiaries,
  countGroups, friendlyBeneficiaryError, groupOf, normalizeNationalId, normalizePhone,
} from '../beneficiaries';

describe('who can do what', () => {
  it('limits reading, registering, deleting and the access log', () => {
    expect(canReadBeneficiaries(['me_officer'])).toBe(true);
    expect(canReadBeneficiaries(['donor'])).toBe(false);
    expect(canReadBeneficiaries(['finance'])).toBe(false);
    expect(canRegisterBeneficiaries(['field_officer'])).toBe(true);
    expect(canRegisterBeneficiaries(['me_officer'])).toBe(false);
    expect(canDeleteBeneficiaries(['field_officer'])).toBe(false);
    expect(canDeleteBeneficiaries(['programme_manager'])).toBe(true);
    expect(canReadAccessLog(['field_officer'])).toBe(false);
    expect(canReadAccessLog(['executive'])).toBe(true);
  });
});

describe('groups and counts', () => {
  it('splits women, men, girls and boys at 18', () => {
    expect(groupOf('female', 2000, 2026)).toBe('women');
    expect(groupOf('female', 2008, 2026)).toBe('women'); // exactly 18
    expect(groupOf('female', 2009, 2026)).toBe('girls');
    expect(groupOf('male', 1990, 2026)).toBe('men');
    expect(groupOf('male', 2015, 2026)).toBe('boys');
  });
  it('puts missing or other data in "not stated" so the total adds up', () => {
    expect(groupOf('other', 1990, 2026)).toBe('unspecified');
    expect(groupOf('female', null, 2026)).toBe('unspecified');
    const c = countGroups([
      { sex: 'female', birthYear: 1990 }, { sex: 'male', birthYear: 2015 }, { sex: 'other', birthYear: 1980 }, { sex: null, birthYear: null },
    ], 2026);
    expect(c).toEqual({ women: 1, men: 0, girls: 0, boys: 1, unspecified: 2, total: 4 });
    expect(c.women + c.men + c.girls + c.boys + c.unspecified).toBe(c.total);
  });
});

describe('typed values', () => {
  it('normalises ID numbers and phone numbers', () => {
    expect(normalizeNationalId('123 456-7890')).toBe('1234567890');
    expect(normalizePhone('+8801712345678')).toBe('01712345678');
    expect(normalizePhone('8801712345678')).toBe('01712345678');
    expect(normalizePhone('017 1234-5678')).toBe('01712345678');
  });
  const base = { fullName: 'Test Person', nationalId: '', phone: '', sex: 'female', birthYear: '' };
  it('accepts a minimal person and a full one', () => {
    expect(beneficiarySchema.parse(base)).toMatchObject({ nationalId: null, phone: null, birthYear: null });
    const full = beneficiarySchema.parse({ ...base, nationalId: '1234 567 890', phone: '+8801712345678', birthYear: '1990' });
    expect(full.birthYear).toBe(1990);
  });
  it('rejects bad input', () => {
    expect(beneficiarySchema.safeParse({ ...base, fullName: 'x' }).success).toBe(false);
    expect(beneficiarySchema.safeParse({ ...base, nationalId: '12345' }).success).toBe(false);
    expect(beneficiarySchema.safeParse({ ...base, nationalId: '12345abcde' }).success).toBe(false);
    expect(beneficiarySchema.safeParse({ ...base, phone: '12345' }).success).toBe(false);
    expect(beneficiarySchema.safeParse({ ...base, sex: 'x' }).success).toBe(false);
    expect(beneficiarySchema.safeParse({ ...base, birthYear: '1800' }).success).toBe(false);
    expect(beneficiarySchema.safeParse({ ...base, birthYear: '3000' }).success).toBe(false);
  });
  it('explains database errors', () => {
    expect(friendlyBeneficiaryError({ code: '23505', message: 'duplicate' })).toMatch(/already registered/);
    expect(friendlyBeneficiaryError({ message: 'the beneficiaries of a closed project cannot be changed' })).toMatch(/closed/);
    expect(friendlyBeneficiaryError({ code: '42501', message: 'x' })).toMatch(/permission/);
  });
});
