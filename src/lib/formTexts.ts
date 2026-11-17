import { z } from 'zod';
import type { AppRole } from './database.types';

/**
 * The written answers donor forms ask for, kept once per project (migration 0036): the rationale (Form 3, 2.5),
 * experience (3.2), internal control (3.3), other funding (4.3), sustainability (4.4) and, for Form 7, how the
 * project supported local people (4.2). All optional.
 */

export const FORM_TEXT_KEYS = ['rationale', 'experience', 'internalControl', 'otherFunding', 'sustainability', 'localSupport'] as const;
export type FormTextKey = (typeof FORM_TEXT_KEYS)[number];
export type FormTexts = Record<FormTextKey, string>;

export const EMPTY_FORM_TEXTS: FormTexts = { rationale: '', experience: '', internalControl: '', otherFunding: '', sustainability: '', localSupport: '' };

export const MAX_FORM_TEXT = 4000;

export const FORM_TEXT_FIELDS: Array<{ key: FormTextKey; label: string; hint: string }> = [
  { key: 'rationale', label: 'Why the project is needed (Form 3, 2.5)', hint: 'The need and the reason for this project.' },
  { key: 'experience', label: 'Our experience and ability (Form 3, 3.2)', hint: 'Past work of the organisation that makes it able to carry this out.' },
  { key: 'internalControl', label: 'Internal control (Form 3, 3.3)', hint: 'How money and work are checked: approvals, audits, monitoring.' },
  { key: 'otherFunding', label: 'Other funding applied for (Form 3, 4.3)', hint: 'Other institutions this was submitted to and what was received. Write "None" if none.' },
  { key: 'sustainability', label: 'Sustainability (Form 3, 4.4)', hint: 'What continues after the project ends.' },
  { key: 'localSupport', label: 'Support to local people and economy (Form 7, 4.2)', hint: 'How the project helped the local people and the local economy.' },
];

const text = z.string().max(MAX_FORM_TEXT, `Each text can have ${MAX_FORM_TEXT} letters at most.`);
export const formTextsSchema = z.object({
  rationale: text,
  experience: text,
  internalControl: text,
  otherFunding: text,
  sustainability: text,
  localSupport: text,
});

export interface FormTextsData {
  projectId: string;
  texts: FormTexts;
  closed: boolean;
  canWrite: boolean;
}

const WRITERS: AppRole[] = ['executive', 'programme_manager', 'project_officer'];
const READERS: AppRole[] = [...WRITERS, 'me_officer', 'board', 'legal_officer'];
export const canWriteFormTexts = (roles: readonly AppRole[]) => roles.some((r) => WRITERS.includes(r));
export const canReadFormTexts = (roles: readonly AppRole[]) => roles.some((r) => READERS.includes(r));

export function friendlyFormTextError(error: { code?: string | null; message?: string | null }): string {
  const m = (error.message ?? '').toLowerCase();
  if (m.includes('closed project')) return 'This project is closed, so the texts cannot be changed.';
  if (error.code === '42501' || m.includes('row-level security') || m.includes('permission denied')) return 'You do not have permission to change these texts.';
  if (error.code === '23514') return 'A text is too long (4000 letters at most).';
  return 'Could not save. Please try again.';
}
