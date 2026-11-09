import { z } from 'zod';
import type { AppRole } from './database.types';

/**
 * Project documents. The database (migration 0022) enforces the rules; these helpers drive what the
 * screen shows (who can do what, categories, file checks) and turn database errors into plain words.
 */

export const DOCUMENT_BUCKET = 'project-documents';
export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB, same as the bucket limit
export const ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const CATEGORIES = [
  { id: 'proposal', label: 'Proposal / concept note' },
  { id: 'agreement', label: 'Agreement / MoU' },
  { id: 'approval', label: 'Approvals and permits' },
  { id: 'form7', label: 'Form-7 and donor reports' },
  { id: 'voucher', label: 'Vouchers and invoices' },
  { id: 'distribution', label: 'Distribution records' },
  { id: 'photo', label: 'Photos' },
  { id: 'correspondence', label: 'Letters and clarifications' },
  { id: 'other', label: 'Other' },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]['id'];
const CATEGORY_IDS: string[] = CATEGORIES.map((c) => c.id);
export const isCategory = (v: unknown): v is CategoryId => typeof v === 'string' && CATEGORY_IDS.includes(v);
/** Older rows may carry a category that is not in the list (for example MANDATORY_PRIMARY). */
export function categoryLabel(id: string): string {
  const found = CATEGORIES.find((c) => c.id === id);
  if (found) return found.label;
  return id
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
}

export interface DocumentVersion {
  id: string;
  versionNo: number;
  originalName: string | null;
  mime: string;
  size: number;
  uploadedAt: string;
  uploadedByName: string | null;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: string;
  description: string | null;
  createdAt: string;
  createdByName: string | null;
  releasedToDonor: boolean;
  releasedAt: string | null;
  releasedByName: string | null;
  /** The newest file, or null for a document that has no file yet. */
  current: DocumentVersion | null;
  versions: DocumentVersion[];
}

export interface DocumentsData {
  projectId: string;
  documents: DocumentItem[];
  closed: boolean;
  /** Add documents and new versions, edit details, remove. */
  canWrite: boolean;
  /** Release to (or withdraw from) the donor. */
  canRelease: boolean;
  isDonor: boolean;
}

const WRITERS: AppRole[] = ['executive', 'programme_manager', 'project_officer'];
const RELEASERS: AppRole[] = ['executive', 'programme_manager'];
export const canWriteDocuments = (roles: readonly AppRole[]) => roles.some((r) => WRITERS.includes(r));
export const canReleaseDocuments = (roles: readonly AppRole[]) => roles.some((r) => RELEASERS.includes(r));

export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Returns a plain-words problem with the chosen file, or null when it is fine. */
export function fileProblem(file: { name: string; type: string; size: number }): string | null {
  if (!file.name) return 'Choose a file.';
  if (file.size <= 0) return 'The file is empty.';
  if (file.size > MAX_FILE_BYTES) return 'The file is larger than 25 MB. Send very large files through a shared link and record the link instead.';
  if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return 'File type not allowed. Use PDF, Word, Excel, CSV, JPG, PNG or WEBP.';
  }
  return null;
}

/** Only simple characters in the stored file name (the folder is always the project id). */
export const safeFileName = (name: string) =>
  name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 120) || 'file';

export const documentSchema = z.object({
  title: z.string().trim().min(2, 'Give the document a title (at least 2 letters).').max(200, 'The title is too long (200 letters at most).'),
  category: z.string().refine(isCategory, 'Choose a category.'),
  description: z
    .string()
    .trim()
    .max(1000, 'The note is too long (1,000 letters at most).')
    .optional()
    .transform((v) => (v ? v : null)),
});
export type DocumentFormValues = z.input<typeof documentSchema>;

/** Turn a database error into words a project officer understands. */
export function friendlyDocumentError(message: string | undefined): string {
  const m = (message ?? '').toLowerCase();
  if (m.includes('closed project')) return 'The documents of a closed project cannot be changed.';
  if (m.includes('only the executive director or programme manager')) return 'Only the Executive Director or Programme Manager can release a document to the donor.';
  if (m.includes('no file cannot be released')) return 'Add a file before releasing the document to the donor.';
  if (m.includes('removed document')) return 'This document was removed.';
  if (m.includes('does not belong to this project')) return 'That file does not belong to this project.';
  if (m.includes('row-level security') || m.includes('permission denied')) return 'You do not have permission to do that on this project.';
  return 'Could not save. Please try again.';
}
