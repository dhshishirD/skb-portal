import { z } from 'zod';
import { isDate } from './workStatement';

/**
 * Letters on the SKB letterhead pad (migration 0042). Pure helpers: the Ref number, what a person may type, how
 * the body is split into paragraphs, and plain-words database errors. The database numbers and locks letters.
 */

export type LetterStatus = 'draft' | 'issued' | 'void';
export const LETTER_STATUS_LABELS: Record<LetterStatus, string> = { draft: 'Draft', issued: 'Issued', void: 'Cancelled' };

/** SKB-082/26: the sequence of the year, three digits at least, and the last two digits of the year. */
export function refNo(seq: number, year: number): string {
  return `SKB-${String(seq).padStart(3, '0')}/${String(year % 100).padStart(2, '0')}`;
}

export interface LetterInfo {
  id: string;
  status: LetterStatus;
  refNo: string | null;
  letterDate: string | null; // YYYY-MM-DD; set when issued
  toLines: string;
  subject: string;
  salutation: string;
  body: string;
  closing: string;
  signatoryName: string;
  signatoryTitle: string;
  cc: string;
  withSignature: boolean;
  withStamp: boolean;
  createdBy: string;
  issuedBy: string | null;
  issuedAt: string | null;
  voidReason: string;
  updatedAt: string;
}

export const DEFAULT_SALUTATION = 'Dear Sir/Madam,';
export const DEFAULT_CLOSING = 'Sincerely,';

export const letterSchema = z.object({
  toLines: z.string().trim().max(600, 'The "To" block must be 600 characters or fewer').optional().default(''),
  subject: z.string().trim().max(250, 'The subject must be 250 characters or fewer').optional().default(''),
  salutation: z.string().trim().max(80, 'The greeting must be 80 characters or fewer').optional().default(DEFAULT_SALUTATION),
  body: z.string().max(8000, 'The letter must be 8000 characters or fewer').optional().default(''),
  closing: z.string().trim().max(60, 'The closing must be 60 characters or fewer').optional().default(DEFAULT_CLOSING),
  signatoryName: z.string().trim().max(120, 'The name must be 120 characters or fewer').optional().default(''),
  signatoryTitle: z.string().trim().max(160, 'The title must be 160 characters or fewer').optional().default(''),
  cc: z.string().trim().max(500, 'The copy list must be 500 characters or fewer').optional().default(''),
  withSignature: z.boolean().optional().default(false),
  withStamp: z.boolean().optional().default(false),
});
export type LetterInput = z.input<typeof letterSchema>;

/** What a letter needs before it can be issued (a number is spent on issue, so an empty letter must not get one). */
export function missingForIssue(l: Pick<LetterInfo, 'toLines' | 'subject' | 'body' | 'signatoryName'>): string[] {
  const missing: string[] = [];
  if (!l.toLines.trim()) missing.push('who the letter is to');
  if (!l.subject.trim()) missing.push('the subject');
  if (!l.body.trim()) missing.push('the letter text');
  if (!l.signatoryName.trim()) missing.push('the name of the person who signs');
  return missing;
}

/** Paragraphs are separated by a blank line; a single new line stays a line break inside the paragraph. */
export function bodyParagraphs(body: string): string[] {
  return body
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export const nonEmptyLines = (text: string): string[] =>
  text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

/** Short date for the Date line of the pad: 22 Nov 2026. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function padDate(iso: string): string {
  if (!isDate(iso)) return '';
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export const letterFileName = (l: Pick<LetterInfo, 'refNo' | 'subject'>): string => {
  const ref = (l.refNo ?? 'Draft').replace(/[^A-Za-z0-9]+/g, '-');
  const subject = l.subject.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `SKB-Letter-${ref}${subject ? `-${subject}` : ''}.docx`;
};

/** Plain-words version of a database error from migration 0042. */
export function friendlyLetterError(error: { code?: string; message?: string } | null | undefined): string {
  const m = (error?.message ?? '').toLowerCase();
  if (m.includes('already been issued')) return 'This letter has already been issued, so it cannot be changed. Make a copy to write a new one.';
  if (m.includes('save your signature')) return 'Save your signature first (on the Work Log page), or issue the letter without it.';
  if (m.includes('no stamp')) return 'No stamp has been saved yet. Upload the stamp first, or issue the letter without it.';
  if (m.includes('is needed')) return 'Fill in the letter first: who it is to, the subject, the text and the name of the person who signs.';
  if (m.includes('only the person who wrote')) return 'Only the person who wrote this letter, the Executive Director or the Super Admin can do this.';
  if (error?.code === '42501') return 'You do not have permission to do this.';
  return 'Something went wrong. Nothing was saved.';
}
