import { z } from 'zod';
import type { AppRole } from './database.types';

/**
 * Project charter: the written parts of a project, saved as numbered versions.
 *
 * The database (migration 0018) is what really enforces the rules: every save is a new version,
 * saved versions never change, only the Executive Director approves one. The helpers here drive
 * what the screen shows, check typed values and turn database errors into plain words.
 */

export const MAX_FIELD_LENGTH = 8000;
export const MAX_NOTE_LENGTH = 500;

export const CHARTER_FIELDS = [
  { key: 'background', label: 'Background and need', hint: 'Why this project, who is affected, what is happening now.' },
  { key: 'objectives', label: 'Objectives', hint: 'What the project will achieve. One clear objective per line.' },
  { key: 'scopeIn', label: 'In scope', hint: 'What the project will do and where.' },
  { key: 'scopeOut', label: 'Out of scope', hint: 'What the project will not do.' },
  { key: 'deliverables', label: 'Main deliverables', hint: 'What will be delivered, for example packages, training, assets.' },
  { key: 'risks', label: 'Risks and assumptions', hint: 'What could go wrong, and what we are assuming.' },
  { key: 'team', label: 'Team and roles', hint: 'Who does what, and who approves.' },
] as const;

export type CharterFieldKey = (typeof CHARTER_FIELDS)[number]['key'];
export type CharterText = Record<CharterFieldKey, string>;

export interface CharterVersion extends CharterText {
  id: string;
  version: number;
  changeNote: string | null;
  createdAt: string;
  createdByName: string | null;
  approvedAt: string | null;
  approvedByName: string | null;
}

export interface CharterProjectFacts {
  code: string;
  title: string;
  donorName: string | null;
  location: string | null;
  budgetAmount: number | null;
  currency: string;
  beneficiaryTarget: number | null;
  startDate: string | null;
  endDate: string | null;
}

export interface CharterData {
  projectId: string;
  facts: CharterProjectFacts;
  /** Newest first. */
  versions: CharterVersion[];
  closed: boolean;
  canWrite: boolean;
  canApprove: boolean;
}

export const emptyCharterText = (): CharterText => ({
  background: '',
  objectives: '',
  scopeIn: '',
  scopeOut: '',
  deliverables: '',
  risks: '',
  team: '',
});

export const textOf = (v: CharterText): CharterText => ({
  background: v.background,
  objectives: v.objectives,
  scopeIn: v.scopeIn,
  scopeOut: v.scopeOut,
  deliverables: v.deliverables,
  risks: v.risks,
  team: v.team,
});

// ===== Who may do what =====
const WRITERS: AppRole[] = ['executive', 'programme_manager', 'project_officer'];
export const canWriteCharter = (roles: AppRole[]) => roles.some((r) => WRITERS.includes(r));
export const canApproveCharter = (roles: AppRole[]) => roles.includes('executive');

/** True when two charters have the same written text (ignoring spaces at the ends). */
export const sameCharterText = (a: CharterText, b: CharterText): boolean =>
  CHARTER_FIELDS.every((f) => a[f.key].trim() === b[f.key].trim());

export const isEmptyCharter = (v: CharterText): boolean => CHARTER_FIELDS.every((f) => v[f.key].trim() === '');

// ===== Typed values =====
const field = (label: string) =>
  z.string().max(MAX_FIELD_LENGTH, `${label} must be ${MAX_FIELD_LENGTH} characters or fewer`).transform((v) => v.trim());

export const charterSchema = z.object({
  background: field('Background'),
  objectives: field('Objectives'),
  scopeIn: field('In scope'),
  scopeOut: field('Out of scope'),
  deliverables: field('Main deliverables'),
  risks: field('Risks and assumptions'),
  team: field('Team and roles'),
  changeNote: z
    .string()
    .max(MAX_NOTE_LENGTH, `The note must be ${MAX_NOTE_LENGTH} characters or fewer`)
    .transform((v) => (v.trim() === '' ? null : v.trim())),
});
export type CharterFormValues = z.input<typeof charterSchema>;

export const formatCharterDate = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Dhaka' })
    : '—';

/** Plain-words version of a database error from migration 0018. */
export function friendlyCharterError(error: { code?: string | null; message?: string | null }): string {
  const message = error.message ?? '';
  const code = error.code ?? '';
  if (/only the Executive Director can approve/i.test(message)) return 'Only the Executive Director can approve the charter.';
  if (/already approved/i.test(message)) return 'This version is already approved.';
  if (/closed project/i.test(message)) return 'The charter of a closed project cannot be changed.';
  if (code === '23505' || /project_charter_version_unique/.test(message)) {
    return 'Someone else saved a new version at the same moment. Reload the page and try again.';
  }
  if (/cannot be edited|cannot be deleted/i.test(message)) return 'A saved version cannot be changed. Save a new version instead.';
  if (/row-level security|violates row-level|permission denied/i.test(message) || code === '42501') {
    return 'You do not have permission to do this.';
  }
  if (code === '23514' || /violates check constraint/i.test(message)) return 'Some text is too long. Please shorten it and try again.';
  return 'The database could not save this. Please try again.';
}
