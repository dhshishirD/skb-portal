import { z } from 'zod';
import type { AppRole } from './database.types';

/**
 * "Where the project runs": one row per region with cities, villages, item quantity and families
 * (Form 3 and Form 7, section 2.3). Migration 0032.
 */

export interface ProjectArea {
  id: string;
  position: number;
  region: string;
  cities: string | null;
  villages: string | null;
  itemQuantity: number | null;
  itemUnit: string | null;
  families: number | null;
}

export interface ProjectAreasData {
  projectId: string;
  areas: ProjectArea[];
  closed: boolean;
  canWrite: boolean;
}

/** Donor forms count five people to a family. */
export const PEOPLE_PER_FAMILY = 5;

const WRITERS: AppRole[] = ['executive', 'programme_manager', 'project_officer'];
const READERS: AppRole[] = [...WRITERS, 'me_officer', 'board', 'legal_officer'];
export const canWriteAreas = (roles: readonly AppRole[]) => roles.some((r) => WRITERS.includes(r));
export const canReadAreas = (roles: readonly AppRole[]) => roles.some((r) => READERS.includes(r));

const optionalText = (label: string, max: number) =>
  z
    .string()
    .max(max, `${label} is too long (${max} letters at most).`)
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : null));

const optionalNumber = (label: string, max: number, whole: boolean) =>
  z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => (v === null || v === undefined || String(v).trim() === '' ? null : Number(String(v).trim().replace(/,/g, ''))))
    .refine(
      (v) => v === null || (Number.isFinite(v) && v >= 0 && v <= max && (!whole || Number.isInteger(v))),
      `${label} must be ${whole ? 'a whole number' : 'a number'} from 0 to ${max.toLocaleString('en-US')}.`,
    );

export const areaSchema = z.object({
  region: z
    .string()
    .trim()
    .min(1, 'Please enter the region.')
    .max(120, 'The region is too long (120 letters at most).'),
  cities: optionalText('Cities', 500),
  villages: optionalText('Villages', 500),
  itemQuantity: optionalNumber('Quantity', 100000000, false),
  itemUnit: optionalText('Unit', 40),
  families: optionalNumber('Families', 10000000, true),
});
export type AreaFormValues = z.input<typeof areaSchema>;

export const peopleFromFamilies = (families: number | null | undefined) => (families ? families * PEOPLE_PER_FAMILY : 0);

export function areaTotals(areas: ReadonlyArray<Pick<ProjectArea, 'families' | 'itemQuantity'>>) {
  const families = areas.reduce((s, a) => s + (a.families ?? 0), 0);
  const quantity = areas.reduce((s, a) => s + (a.itemQuantity ?? 0), 0);
  return { families, people: peopleFromFamilies(families), quantity };
}

export function friendlyAreaError(error: { code?: string | null; message?: string | null }): string {
  const m = (error.message ?? '').toLowerCase();
  if (m.includes('closed project')) return 'This project is closed, so the areas cannot be changed.';
  if (error.code === '42501' || m.includes('row-level security') || m.includes('permission denied')) return 'You do not have permission to change the areas on this project.';
  if (error.code === '23514') return 'Please check the numbers and text lengths.';
  return 'Could not save. Please try again.';
}
