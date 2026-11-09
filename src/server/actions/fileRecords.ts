'use server';

import { createClient } from '@/lib/supabase/server';
import {
  canDeleteFileRecords,
  canReadFileRecords,
  canWriteFileRecords,
  fileRecordSchema,
  friendlyFileRecordError,
  isKind,
  isStatus,
  type FileRecord,
  type FileRecordFormValues,
  type FileRecordsData,
  type FileStatus,
} from '@/lib/fileRecords';
import { getActor, getProjectById, isUuid } from '@/server/services/projectsData';

/*
 * Distribution list and NID sheet tracking (migration 0024).
 * Runs as the signed-in user, so Row Level Security and the database guards decide.
 */

type Failure = { ok: false; error: string };
export type FileRecordActionResult = { ok: true; message?: string } | Failure;
export type FileRecordDataResult<T> = { ok: true; data: T } | Failure;

const fail = (error: string): Failure => ({ ok: false, error });
const firstIssue = (e: { issues: Array<{ message: string }> }) => e.issues[0]?.message ?? 'Please check the values.';
const LIMIT = 200;

interface Row {
  id: string;
  kind: string;
  name: string;
  status: string;
  link: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function getFileRecordsAction(projectId: string): Promise<FileRecordDataResult<FileRecordsData>> {
  try {
    if (!isUuid(projectId)) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canReadFileRecords(actor.roles)) return fail('You do not have permission to see these records.');
    const project = await getProjectById(projectId);
    if (!project) return fail('Project not found.');
    const supabase = await createClient();
    const res = await (supabase.from('project_file_records') as any)
      .select('id, kind, name, status, link, note, created_by, created_at, updated_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .range(0, LIMIT - 1);
    if (res.error) return fail('Could not load the file records. Please refresh the page.');
    const rows = (res.data ?? []) as Row[];
    const ids = [...new Set(rows.map((r) => r.created_by).filter((x): x is string => !!x))];
    const names = new Map<string, string>();
    if (ids.length > 0) {
      const { data } = await (supabase.from('profiles') as any).select('id, full_name').in('id', ids);
      for (const p of (data ?? []) as Array<{ id: string; full_name: string | null }>) if (p.full_name) names.set(p.id, p.full_name);
    }
    const records: FileRecord[] = rows
      .filter((r) => isKind(r.kind) && isStatus(r.status))
      .map((r) => ({
        id: r.id,
        kind: r.kind as FileRecord['kind'],
        name: r.name,
        status: r.status as FileStatus,
        link: r.link,
        note: r.note,
        createdByName: r.created_by ? names.get(r.created_by) ?? null : null,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    const closed = project.stage === 'closed';
    return { ok: true, data: { projectId, records, closed, canWrite: !closed && canWriteFileRecords(actor.roles), canDelete: !closed && canDeleteFileRecords(actor.roles) } };
  } catch {
    return fail('Could not load the file records. Please refresh the page.');
  }
}

async function guard(projectId: string, needDelete = false): Promise<{ failure: Failure } | { ok: true }> {
  if (!isUuid(projectId)) return { failure: fail('Project not found.') };
  const actor = await getActor();
  if (!actor) return { failure: fail('Please sign in again.') };
  const allowed = needDelete ? canDeleteFileRecords(actor.roles) : canWriteFileRecords(actor.roles);
  if (!allowed) return { failure: fail('You do not have permission to change these records.') };
  const project = await getProjectById(projectId);
  if (!project) return { failure: fail('Project not found.') };
  if (project.stage === 'closed') return { failure: fail('This project is closed, so file records cannot be changed.') };
  return { ok: true };
}

export async function addFileRecordAction(projectId: string, values: FileRecordFormValues): Promise<FileRecordActionResult> {
  try {
    const g = await guard(projectId);
    if ('failure' in g) return g.failure;
    const parsed = fileRecordSchema.safeParse(values);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const supabase = await createClient();
    const { error } = await (supabase.from('project_file_records') as any).insert({ project_id: projectId, ...parsed.data });
    if (error) return fail(friendlyFileRecordError(error));
    return { ok: true, message: 'Record added.' };
  } catch {
    return fail('Could not save. Please try again.');
  }
}

export async function updateFileRecordAction(projectId: string, id: string, values: Omit<FileRecordFormValues, 'kind'>): Promise<FileRecordActionResult> {
  try {
    const g = await guard(projectId);
    if ('failure' in g) return g.failure;
    if (!isUuid(id)) return fail('Record not found.');
    const parsed = fileRecordSchema.omit({ kind: true }).safeParse(values);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const supabase = await createClient();
    const { data, error } = await (supabase.from('project_file_records') as any)
      .update(parsed.data)
      .eq('id', id)
      .eq('project_id', projectId)
      .select('id');
    if (error) return fail(friendlyFileRecordError(error));
    if (!(data ?? []).length) return fail('Nothing was saved. The record may be gone, or you may not have permission.');
    return { ok: true, message: 'Saved.' };
  } catch {
    return fail('Could not save. Please try again.');
  }
}

export async function setFileRecordStatusAction(projectId: string, id: string, status: string): Promise<FileRecordActionResult> {
  try {
    const g = await guard(projectId);
    if ('failure' in g) return g.failure;
    if (!isUuid(id)) return fail('Record not found.');
    if (!isStatus(status)) return fail('Choose a status.');
    const supabase = await createClient();
    const { data, error } = await (supabase.from('project_file_records') as any).update({ status }).eq('id', id).eq('project_id', projectId).select('id');
    if (error) return fail(friendlyFileRecordError(error));
    if (!(data ?? []).length) return fail('Nothing was changed. The record may be gone, or you may not have permission.');
    return { ok: true, message: 'Status updated.' };
  } catch {
    return fail('Could not save. Please try again.');
  }
}

export async function deleteFileRecordAction(projectId: string, id: string): Promise<FileRecordActionResult> {
  try {
    const g = await guard(projectId, true);
    if ('failure' in g) return g.failure;
    if (!isUuid(id)) return fail('Record not found.');
    const supabase = await createClient();
    const { data, error } = await (supabase.from('project_file_records') as any).delete().eq('id', id).eq('project_id', projectId).select('id');
    if (error) return fail(friendlyFileRecordError(error));
    if (!(data ?? []).length) return fail('Nothing was deleted. The record may be gone, or you may not have permission.');
    return { ok: true, message: 'Record deleted.' };
  } catch {
    return fail('Could not delete. Please try again.');
  }
}
