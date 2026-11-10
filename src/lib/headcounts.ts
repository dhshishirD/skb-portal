import { z } from 'zod';
import type { AppRole } from './database.types';
import type { GroupCounts } from './beneficiaries';

/**
 * Head count for a project: women, men, girls and boys as numbers only (migration 0025).
 * Form-7 uses it when no individual beneficiary is registered for the project.
 */

export interface Headcount {
  women: number;
  men: number;
  girls: number;
  boys: number;
  note: string | null;
  updatedAt: string | null;
  updatedByName: string | null;
}

export interface HeadcountData {
  projectId: string;
  /** null until the first save. */
  headcount: Headcount | null;
  /** People registered one by one (they come first in Form-7). */
  registeredTotal: number;
  closed: boolean;
  canWrite: boolean;
}

const WRITERS: AppRole[] = ['executive', 'programme_manager', 'project_officer'];
const READERS: AppRole[] = [...WRITERS, 'me_officer', 'board', 'legal_officer'];
export const canWriteHeadcount = (roles: readonly AppRole[]) => roles.some((r) => WRITERS.includes(r));
export const canReadHeadcount = (roles: readonly AppRole[]) => roles.some((r) => READERS.includes(r));

const count = (label: string) =>
  z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => (v === null || v === undefined || String(v).trim() === '' ? 0 : Number(String(v).trim())))
    .refine((v) => Number.isInteger(v) && v >= 0 && v <= 1000000, `${label} must be a whole number (0 to 1,000,000).`);

export const headcountSchema = z.object({
  women: count('Women'),
  men: count('Men'),
  girls: count('Girls'),
  boys: count('Boys'),
  note: z
    .string()
    .max(300, 'The note is too long (300 letters at most).')
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : null)),
});
export type HeadcountFormValues = z.input<typeof headcountSchema>;

export const headcountTotal = (h: Pick<Headcount, 'women' | 'men' | 'girls' | 'boys'>) => h.women + h.men + h.girls + h.boys;

/** The same shape the registered people give, so Form-7 can use either. */
export function headcountToGroups(h: Pick<Headcount, 'women' | 'men' | 'girls' | 'boys'>): GroupCounts {
  return { women: h.women, men: h.men, girls: h.girls, boys: h.boys, unspecified: 0, total: headcountTotal(h) };
}

/** Registered people always come first; the head count is used only when nobody is registered. */
export function chooseCounts(registered: GroupCounts | null, headcount: Pick<Headcount, 'women' | 'men' | 'girls' | 'boys'> | null): GroupCounts | null {
  if (registered && registered.total > 0) return registered;
  if (headcount && headcountTotal(headcount) > 0) return headcountToGroups(headcount);
  return registered;
}

export function friendlyHeadcountError(error: { code?: string | null; message?: string | null }): string {
  const m = (error.message ?? '').toLowerCase();
  if (m.includes('closed project')) return 'This project is closed, so the head count cannot be changed.';
  if (error.code === '42501' || m.includes('row-level security') || m.includes('permission denied')) return 'You do not have permission to change the head count on this project.';
  if (error.code === '23514') return 'Each number must be a whole number from 0 to 1,000,000.';
  return 'Could not save. Please try again.';
}
