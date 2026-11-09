import { z } from 'zod';
import type { AppRole } from './database.types';

/**
 * Tracking of distribution lists and NID sheets. The portal stores no files and no names or ID numbers
 * here, only what the file is, its state, and an optional https link. The database (migration 0024)
 * enforces the rules; these helpers drive the screen and turn database errors into plain words.
 */

export const KINDS = [
  { id: 'distribution_list', label: 'Distribution list' },
  { id: 'nid_sheet', label: 'NID sheet' },
] as const;
export type FileKind = (typeof KINDS)[number]['id'];
export const isKind = (v: unknown): v is FileKind => KINDS.some((k) => k.id === v);
export const kindLabel = (id: string) => KINDS.find((k) => k.id === id)?.label ?? id;

export const STATUSES = [
  { id: 'prepared', label: 'Prepared' },
  { id: 'signed', label: 'Signed' },
  { id: 'sent', label: 'Sent' },
  { id: 'received', label: 'Received' },
] as const;
export type FileStatus = (typeof STATUSES)[number]['id'];
export const isStatus = (v: unknown): v is FileStatus => STATUSES.some((s) => s.id === v);
export const statusLabel = (id: string) => STATUSES.find((s) => s.id === id)?.label ?? id;

export interface FileRecord {
  id: string;
  kind: FileKind;
  name: string;
  status: FileStatus;
  link: string | null;
  note: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FileRecordsData {
  projectId: string;
  records: FileRecord[];
  closed: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

const WRITERS: AppRole[] = ['executive', 'programme_manager', 'project_officer', 'field_officer'];
const DELETERS: AppRole[] = ['executive', 'programme_manager', 'project_officer'];
const READERS: AppRole[] = [...WRITERS, 'me_officer', 'board', 'legal_officer'];
export const canWriteFileRecords = (roles: readonly AppRole[]) => roles.some((r) => WRITERS.includes(r));
export const canDeleteFileRecords = (roles: readonly AppRole[]) => roles.some((r) => DELETERS.includes(r));
export const canReadFileRecords = (roles: readonly AppRole[]) => roles.some((r) => READERS.includes(r));

export const fileRecordSchema = z.object({
  kind: z.string().refine(isKind, 'Choose distribution list or NID sheet.'),
  name: z.string().trim().min(3, 'Give the file a name (at least 3 letters).').max(200, 'The name is too long (200 letters at most).'),
  status: z.string().refine(isStatus, 'Choose a status.'),
  link: z
    .string()
    .trim()
    .max(500, 'The link is too long (500 letters at most).')
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^https:\/\/\S+$/.test(v), 'The link must start with https:// and contain no spaces.'),
  note: z
    .string()
    .trim()
    .max(300, 'The note is too long (300 letters at most).')
    .optional()
    .transform((v) => (v ? v : null)),
});
export type FileRecordFormValues = z.input<typeof fileRecordSchema>;

export function friendlyFileRecordError(error: { code?: string | null; message?: string | null }): string {
  const m = (error.message ?? '').toLowerCase();
  if (m.includes('closed project')) return 'This project is closed, so file records cannot be changed.';
  if (error.code === '23514') return 'Please check the values (the link must start with https://).';
  if (error.code === '42501' || m.includes('row-level security') || m.includes('permission denied')) return 'You do not have permission to do that on this project.';
  return 'Could not save. Please try again.';
}
