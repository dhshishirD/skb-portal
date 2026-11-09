import { z } from 'zod';
import type { AppRole } from './database.types';

/**
 * Beneficiaries: the secure registry for one project (migration 0021).
 *
 * Names, ID numbers and phone numbers are encrypted on the server before they are saved. This file holds
 * the parts that do not need the key: who may do what, age groups and counts, checks on what is typed,
 * and plain-words database errors.
 */

export type Sex = 'female' | 'male' | 'other';
export const SEX_LABELS: Record<Sex, string> = { female: 'Female', male: 'Male', other: 'Other' };
export type RevealField = 'national_id' | 'phone';
export const FIELD_LABELS: Record<RevealField, string> = { national_id: 'National ID', phone: 'Phone' };

export interface BeneficiaryRow {
  id: string;
  fullName: string;
  sex: Sex | null;
  birthYear: number | null;
  hasNationalId: boolean;
  hasPhone: boolean;
  registeredByName: string | null;
  registeredAt: string;
}

export interface AccessLogRow {
  id: string;
  field: RevealField;
  reason: string | null;
  byName: string | null;
  at: string;
  /** The name of the person whose data was opened, when that record still exists. */
  personName: string | null;
}

export interface GroupCounts {
  women: number;
  men: number;
  girls: number;
  boys: number;
  /** Sex "other", or sex / birth year not recorded: counted here so the total always adds up. */
  unspecified: number;
  total: number;
}

export interface BeneficiariesData {
  projectId: string;
  people: BeneficiaryRow[];
  /** Counts cover every registered person; the list above may be shortened. */
  counts: GroupCounts;
  shown: number;
  log: AccessLogRow[] | null;
  closed: boolean;
  /** False until the encryption key is set up on the server: registration is switched off. */
  encryptionReady: boolean;
  canRegister: boolean;
  canDelete: boolean;
  canReveal: boolean;
  consentRecorded: number;
}

// ===== Who may do what =====
const READERS: AppRole[] = ['executive', 'programme_manager', 'project_officer', 'field_officer', 'me_officer'];
const REGISTRARS: AppRole[] = ['project_officer', 'field_officer'];
const DELETERS: AppRole[] = ['project_officer', 'programme_manager', 'executive'];
const LOG_READERS: AppRole[] = ['executive', 'programme_manager'];
export const canReadBeneficiaries = (roles: AppRole[]) => roles.some((r) => READERS.includes(r));
export const canRegisterBeneficiaries = (roles: AppRole[]) => roles.some((r) => REGISTRARS.includes(r));
export const canDeleteBeneficiaries = (roles: AppRole[]) => roles.some((r) => DELETERS.includes(r));
export const canReadAccessLog = (roles: AppRole[]) => roles.some((r) => LOG_READERS.includes(r));

// ===== Age groups and counts (Form-7: women, men, girls, boys) =====
/** Under 18 is a child. Needs a birth year; the year is passed in so tests do not depend on the clock. */
export function groupOf(sex: Sex | null, birthYear: number | null, thisYear: number): keyof Omit<GroupCounts, 'total'> {
  if ((sex !== 'female' && sex !== 'male') || birthYear === null) return 'unspecified';
  const child = thisYear - birthYear < 18;
  if (sex === 'female') return child ? 'girls' : 'women';
  return child ? 'boys' : 'men';
}

export function countGroups(people: Array<{ sex: string | null; birthYear: number | null }>, thisYear: number): GroupCounts {
  const counts: GroupCounts = { women: 0, men: 0, girls: 0, boys: 0, unspecified: 0, total: 0 };
  for (const p of people) {
    const sex = p.sex === 'female' || p.sex === 'male' || p.sex === 'other' ? p.sex : null;
    counts[groupOf(sex, p.birthYear, thisYear)] += 1;
    counts.total += 1;
  }
  return counts;
}

// ===== Typed values =====
/** Digits only: "1234 567 890" and "1234-567-890" mean the same ID. */
export const normalizeNationalId = (value: string): string => value.replace(/[\s-]/g, '');
/** Bangladesh mobile numbers: 01XXXXXXXXX, with or without +88 / 88. */
export function normalizePhone(value: string): string {
  const v = value.replace(/[\s-]/g, '');
  return v.replace(/^\+?88(?=01)/, '');
}

const optional = z.string().trim().transform((v) => (v === '' ? null : v));

export const beneficiarySchema = z.object({
  fullName: z.string().trim().min(2, 'Enter the full name').max(200, 'The name must be 200 characters or fewer'),
  nationalId: optional.superRefine((v, ctx) => {
    if (v === null) return;
    const digits = normalizeNationalId(v);
    if (!/^\d{10}$|^\d{13}$|^\d{17}$/.test(digits)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A national ID has 10, 13 or 17 digits' });
    }
  }),
  phone: optional.superRefine((v, ctx) => {
    if (v === null) return;
    if (!/^01\d{9}$/.test(normalizePhone(v))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A phone number looks like 01XXXXXXXXX' });
    }
  }),
  sex: z.enum(['female', 'male', 'other'], { errorMap: () => ({ message: 'Choose female, male or other' }) }),
  birthYear: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === '') return null;
      const n = Number(v);
      if (!/^\d{4}$/.test(v) || n < 1900 || n > new Date().getFullYear()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a 4-digit birth year' });
        return z.NEVER;
      }
      return n;
    }),
});
export type BeneficiaryFormValues = z.input<typeof beneficiarySchema>;

export const revealSchema = z.object({
  field: z.enum(['national_id', 'phone']),
  reason: z.string().trim().max(200, 'The reason must be 200 characters or fewer').transform((v) => (v === '' ? null : v)),
});

/** Plain-words version of a database error from migration 0021. */
export function friendlyBeneficiaryError(error: { code?: string | null; message?: string | null }): string {
  const message = error.message ?? '';
  const code = error.code ?? '';
  if (/closed project/i.test(message)) return 'The beneficiaries of a closed project cannot be changed.';
  if (code === '23505') return 'This national ID is already registered in this project.';
  if (/must be encrypted/i.test(message)) return 'The data could not be protected. Nothing was saved.';
  if (/row-level security|violates row-level|permission denied/i.test(message) || code === '42501') {
    return 'You do not have permission to do this.';
  }
  if (code === '23514' || /violates check constraint/i.test(message)) return 'Some values are not allowed. Please check them and try again.';
  return 'The database could not save this. Please try again.';
}
