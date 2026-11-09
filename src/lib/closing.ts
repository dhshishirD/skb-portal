import { z } from 'zod';
import type { AppRole } from './database.types';

/**
 * Closing and Form-7. The database (migration 0023) enforces the rules; these helpers drive what the
 * screen shows (who can do what, the written sections, gaps) and turn database errors into plain words.
 */

export const REPORT_FIELDS = [
  { key: 'projectSummary', column: 'project_summary', label: 'Project summary', hint: 'What the project did, in a few sentences.', max: 5000 },
  { key: 'goalsAchieved', column: 'goals_achieved', label: 'Goals and what was achieved', hint: 'Compare the goals with what happened.', max: 5000 },
  { key: 'localManpower', column: 'local_manpower', label: 'Local manpower', hint: 'Who from the community worked on the project, and how many.', max: 2000 },
  { key: 'beneficiaryStory', column: 'beneficiary_story', label: 'Beneficiary story', hint: 'One real story, without names or ID numbers.', max: 5000 },
  { key: 'challenges', column: 'challenges', label: 'Challenges', hint: 'What was difficult, and how it was handled.', max: 5000 },
  { key: 'lessonsLearned', column: 'lessons_learned', label: 'Lessons learned', hint: 'What SKB would do differently next time.', max: 5000 },
] as const;
export type ReportKey = (typeof REPORT_FIELDS)[number]['key'];
export type ReportText = Record<ReportKey, string>;

export const EMPTY_REPORT: ReportText = {
  projectSummary: '',
  goalsAchieved: '',
  localManpower: '',
  beneficiaryStory: '',
  challenges: '',
  lessonsLearned: '',
};

export interface ChecklistItem {
  key: string;
  label: string;
  checked: null | {
    byName: string | null;
    at: string;
    note: string | null;
    documentId: string | null;
    documentTitle: string | null;
  };
}

export interface LinkableDocument {
  id: string;
  title: string;
}

export interface ClosingData {
  projectId: string;
  closed: boolean;
  report: ReportText;
  updatedAt: string | null;
  updatedByName: string | null;
  signedOffAt: string | null;
  signedOffByName: string | null;
  items: ChecklistItem[];
  documents: LinkableDocument[];
  /** Write the report and tick items (not when signed off or closed). */
  canWrite: boolean;
  /** Executive Director only. */
  canSignOff: boolean;
  /** Make the Form-7 PDF. */
  canExport: boolean;
}

const WRITERS: AppRole[] = ['executive', 'programme_manager', 'project_officer'];
export const canWriteClosing = (roles: readonly AppRole[]) => roles.some((r) => WRITERS.includes(r));
export const canSignOffClosing = (roles: readonly AppRole[]) => roles.includes('executive');

export const countChecked = (items: Pick<ChecklistItem, 'checked'>[]) => items.filter((i) => i.checked).length;
export const allChecked = (items: Pick<ChecklistItem, 'checked'>[]) => items.length > 0 && items.every((i) => i.checked);

/** The written sections that are still empty (Form-7 would print "not written"). */
export function emptySections(report: ReportText): string[] {
  return REPORT_FIELDS.filter((f) => report[f.key].trim() === '').map((f) => f.label);
}

const section = (max: number, label: string) =>
  z
    .string()
    .max(max, `${label} is too long (${max.toLocaleString('en-US')} letters at most).`)
    .transform((v) => v.trim());

export const reportSchema = z.object({
  projectSummary: section(5000, 'The summary'),
  goalsAchieved: section(5000, 'The goals section'),
  localManpower: section(2000, 'The local manpower section'),
  beneficiaryStory: section(5000, 'The beneficiary story'),
  challenges: section(5000, 'The challenges section'),
  lessonsLearned: section(5000, 'The lessons section'),
});
export type ReportFormValues = z.input<typeof reportSchema>;

export const noteSchema = z
  .string()
  .max(300, 'The note is too long (300 letters at most).')
  .transform((v) => v.trim())
  .transform((v) => (v ? v : null));

/** Turn a database error into words a project officer understands. */
export function friendlyClosingError(error: { code?: string | null; message?: string | null }): string {
  const m = (error.message ?? '').toLowerCase();
  if (m.includes('closed project')) return 'This project is closed, so the closing report cannot be changed.';
  if (m.includes('signed off') || m.includes('signed-off')) return 'The report is signed off. The Executive Director must reopen it first.';
  if (m.includes('every item')) return 'Tick every item on the checklist before signing off.';
  if (m.includes('only the executive director')) return 'Only the Executive Director can sign off or reopen the closing report.';
  if (m.includes('linked document')) return 'The linked document must belong to this project.';
  if (error.code === '23505') return 'This item is already ticked.';
  if (error.code === '42501' || m.includes('row-level security') || m.includes('permission denied')) return 'You do not have permission to do that on this project.';
  return 'Could not save. Please try again.';
}
