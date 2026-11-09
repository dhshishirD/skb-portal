'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { contentMatchesMime } from '@/lib/apiAccess';
import {
  DOCUMENT_BUCKET,
  canReleaseDocuments,
  canWriteDocuments,
  documentSchema,
  fileProblem,
  friendlyDocumentError,
  safeFileName,
  type DocumentFormValues,
  type DocumentItem,
  type DocumentVersion,
  type DocumentsData,
} from '@/lib/documents';
import { getActor, getProjectById, isUuid } from '@/server/services/projectsData';

/*
 * Projects & Grants: documents (migration 0022).
 *
 * Database rows are read and written as the signed-in user, so Row Level Security and the database
 * guards decide. The private storage bucket is reached only here, with the service role, AFTER the
 * person and the project have been checked. Browsers never get direct storage access: an upload uses
 * a one-time signed upload link, a download uses a short-lived signed link (5 minutes).
 */

type Failure = { ok: false; error: string };
export type DocumentActionResult = { ok: true; message?: string } | Failure;
export type DocumentDataResult<T> = { ok: true; data: T } | Failure;

const fail = (error: string): Failure => ({ ok: false, error });
const firstIssue = (e: { issues: Array<{ message: string }> }) => e.issues[0]?.message ?? 'Please check the values.';
const DOWNLOAD_SECONDS = 5 * 60;

interface DocRow {
  id: string;
  title: string;
  category: string;
  description: string | null;
  created_at: string;
  created_by: string | null;
  released_to_donor: boolean;
  released_at: string | null;
  released_by: string | null;
  current_version_id: string | null;
}
interface VersionRow {
  id: string;
  document_id: string;
  version_no: number;
  original_name: string | null;
  mime: string;
  size: number | string;
  uploaded_by: string | null;
  created_at: string;
}

export async function getDocumentsAction(projectId: string): Promise<DocumentDataResult<DocumentsData>> {
  try {
    if (!isUuid(projectId)) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const project = await getProjectById(projectId);
    if (!project) return fail('Project not found.');

    const supabase = await createClient();
    const docsRes = await (supabase.from('documents') as any)
      .select('id, title, category, description, created_at, created_by, released_to_donor, released_at, released_by, current_version_id')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (docsRes.error) return fail('Could not load the documents. Please refresh the page.');
    const docs = (docsRes.data ?? []) as DocRow[];

    let versionRows: VersionRow[] = [];
    if (docs.length > 0) {
      const vRes = await (supabase.from('document_versions') as any)
        .select('id, document_id, version_no, original_name, mime, size, uploaded_by, created_at')
        .in('document_id', docs.map((d) => d.id))
        .order('version_no', { ascending: false });
      if (vRes.error) return fail('Could not load the documents. Please refresh the page.');
      versionRows = (vRes.data ?? []) as VersionRow[];
    }

    const ids = [...new Set([...docs.flatMap((d) => [d.created_by, d.released_by]), ...versionRows.map((v) => v.uploaded_by)].filter((v): v is string => !!v))];
    const names = new Map<string, string>();
    if (ids.length > 0) {
      const { data } = await (supabase.from('profiles') as any).select('id, full_name').in('id', ids);
      for (const p of (data ?? []) as Array<{ id: string; full_name: string | null }>) {
        if (p.full_name) names.set(p.id, p.full_name);
      }
    }
    const nameOf = (id: string | null) => (id ? names.get(id) ?? null : null);
    const toVersion = (v: VersionRow): DocumentVersion => ({
      id: v.id,
      versionNo: v.version_no,
      originalName: v.original_name,
      mime: v.mime,
      size: Number(v.size),
      uploadedAt: v.created_at,
      uploadedByName: nameOf(v.uploaded_by),
    });

    const documents: DocumentItem[] = docs.map((d) => {
      const versions = versionRows.filter((v) => v.document_id === d.id).map(toVersion);
      return {
        id: d.id,
        title: d.title,
        category: d.category,
        description: d.description,
        createdAt: d.created_at,
        createdByName: nameOf(d.created_by),
        releasedToDonor: d.released_to_donor,
        releasedAt: d.released_at,
        releasedByName: nameOf(d.released_by),
        current: versions.find((v) => v.id === d.current_version_id) ?? versions[0] ?? null,
        versions,
      };
    });

    const closed = project.stage === 'closed';
    return {
      ok: true,
      data: {
        projectId,
        documents,
        closed,
        canWrite: !closed && canWriteDocuments(actor.roles),
        canRelease: !closed && canReleaseDocuments(actor.roles),
        isDonor: actor.roles.includes('donor'),
      },
    };
  } catch {
    return fail('Could not load the documents. Please refresh the page.');
  }
}

export interface UploadInput {
  projectId: string;
  /** Add a new version to this document; leave empty to start a new document. */
  documentId: string | null;
  fileName: string;
  mime: string;
  size: number;
}

/** Step 1 of an upload: check the person, the project and the file, then hand out a one-time upload link. */
export async function prepareDocumentUploadAction(input: UploadInput): Promise<DocumentDataResult<{ path: string; token: string }>> {
  try {
    if (!isUuid(input.projectId)) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canWriteDocuments(actor.roles)) return fail('You do not have permission to add documents.');
    const project = await getProjectById(input.projectId);
    if (!project) return fail('Project not found.');
    if (project.stage === 'closed') return fail('The documents of a closed project cannot be changed.');
    const problem = fileProblem({ name: input.fileName, type: input.mime, size: input.size });
    if (problem) return fail(problem);
    if (input.documentId) {
      if (!isUuid(input.documentId)) return fail('Document not found.');
      const supabase = await createClient();
      const { data } = await (supabase.from('documents') as any)
        .select('id')
        .eq('id', input.documentId)
        .eq('project_id', input.projectId)
        .is('deleted_at', null)
        .maybeSingle();
      if (!data) return fail('Document not found.');
    }

    const path = `${input.projectId}/${Date.now()}-${crypto.randomUUID()}-${safeFileName(input.fileName)}`;
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from(DOCUMENT_BUCKET).createSignedUploadUrl(path);
    if (error || !data) return fail('Could not start the upload. Please try again.');
    return { ok: true, data: { path: data.path ?? path, token: data.token } };
  } catch {
    return fail('Could not start the upload. Please try again.');
  }
}

export interface CompleteInput extends UploadInput {
  path: string;
  values: DocumentFormValues;
}

/** Step 2 of an upload: the file is in storage; check what arrived, then record the document and its new version. */
export async function completeDocumentUploadAction(input: CompleteInput): Promise<DocumentActionResult> {
  let admin: ReturnType<typeof createAdminClient> | null = null;
  const discardFile = async () => {
    try {
      await admin?.storage.from(DOCUMENT_BUCKET).remove([input.path]);
    } catch {
      /* best effort */
    }
  };
  try {
    if (!isUuid(input.projectId)) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canWriteDocuments(actor.roles)) return fail('You do not have permission to add documents.');
    if (!input.path.startsWith(`${input.projectId}/`) || input.path.includes('..')) return fail('That file does not belong to this project.');
    const project = await getProjectById(input.projectId);
    if (!project) return fail('Project not found.');
    if (project.stage === 'closed') return fail('The documents of a closed project cannot be changed.');
    const problem = fileProblem({ name: input.fileName, type: input.mime, size: input.size });
    if (problem) return fail(problem);
    const parsed = documentSchema.safeParse(input.values);
    if (!parsed.success) return fail(firstIssue(parsed.error));

    admin = createAdminClient();
    // Look at what was really uploaded: it must exist and its first bytes must match the declared type.
    const { data: signed } = await admin.storage.from(DOCUMENT_BUCKET).createSignedUrl(input.path, 60);
    if (!signed) return fail('The file did not arrive. Please try again.');
    const head = await fetch(signed.signedUrl, { headers: { Range: 'bytes=0-15' } });
    if (!head.ok) return fail('The file did not arrive. Please try again.');
    const bytes = new Uint8Array(await head.arrayBuffer());
    const total = Number((head.headers.get('content-range') ?? '').split('/')[1]);
    const realSize = Number.isFinite(total) && total > 0 ? total : input.size;
    if (!contentMatchesMime(input.mime, bytes)) {
      await discardFile();
      return fail('The file content does not match its type.');
    }

    const supabase = await createClient();
    let documentId = input.documentId;
    let createdHere = false;
    if (documentId) {
      if (!isUuid(documentId)) return fail('Document not found.');
    } else {
      const ins = await (supabase.from('documents') as any)
        .insert({
          project_id: input.projectId,
          title: parsed.data.title,
          category: parsed.data.category,
          description: parsed.data.description,
        })
        .select('id')
        .single();
      if (ins.error || !ins.data) {
        await discardFile();
        return fail(friendlyDocumentError(ins.error?.message));
      }
      documentId = ins.data.id as string;
      createdHere = true;
    }

    const verRes = await (supabase.from('document_versions') as any)
      .insert({
        document_id: documentId,
        storage_path: input.path,
        mime: input.mime,
        size: realSize,
        original_name: input.fileName.slice(0, 200),
      })
      .select('id')
      .single();
    if (verRes.error || !verRes.data) {
      await discardFile();
      if (createdHere) await (supabase.from('documents') as any).update({ deleted_at: new Date().toISOString() }).eq('id', documentId);
      return fail(friendlyDocumentError(verRes.error?.message));
    }

    const upd = await (supabase.from('documents') as any)
      .update({ current_version_id: verRes.data.id })
      .eq('id', documentId)
      .select('id');
    if (upd.error || !(upd.data ?? []).length) return fail('The file was saved but could not be made current. Please refresh the page.');
    return { ok: true, message: createdHere ? 'Document added.' : 'New version added.' };
  } catch {
    await discardFile();
    return fail('Could not save the document. Please try again.');
  }
}

/** A short-lived download link. The database decides whether this person may see the version at all. */
export async function getDocumentDownloadAction(versionId: string): Promise<DocumentDataResult<{ url: string }>> {
  try {
    if (!isUuid(versionId)) return fail('File not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const supabase = await createClient();
    const { data } = await (supabase.from('document_versions') as any)
      .select('id, storage_path, original_name')
      .eq('id', versionId)
      .maybeSingle();
    if (!data) return fail('File not found.');
    const admin = createAdminClient();
    const { data: signed, error } = await admin.storage
      .from(DOCUMENT_BUCKET)
      .createSignedUrl(data.storage_path as string, DOWNLOAD_SECONDS, { download: (data.original_name as string | null) ?? true });
    if (error || !signed) return fail('Could not create the download link. Please try again.');
    return { ok: true, data: { url: signed.signedUrl } };
  } catch {
    return fail('Could not create the download link. Please try again.');
  }
}

async function updateDocument(projectId: string, documentId: string, patch: Record<string, unknown>, message: string): Promise<DocumentActionResult> {
  try {
    if (!isUuid(projectId) || !isUuid(documentId)) return fail('Document not found.');
    const project = await getProjectById(projectId);
    if (!project) return fail('Project not found.');
    if (project.stage === 'closed') return fail('The documents of a closed project cannot be changed.');
    const supabase = await createClient();
    const { data, error } = await (supabase.from('documents') as any)
      .update(patch)
      .eq('id', documentId)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .select('id');
    if (error) return fail(friendlyDocumentError(error.message));
    if (!(data ?? []).length) return fail('Nothing was changed. The document may have been removed, or you may not have permission.');
    return { ok: true, message };
  } catch {
    return fail('Could not save. Please try again.');
  }
}

export async function updateDocumentAction(projectId: string, documentId: string, values: DocumentFormValues): Promise<DocumentActionResult> {
  const actor = await getActor();
  if (!actor) return fail('Please sign in again.');
  if (!canWriteDocuments(actor.roles)) return fail('You do not have permission to change documents.');
  const parsed = documentSchema.safeParse(values);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  return updateDocument(projectId, documentId, { title: parsed.data.title, category: parsed.data.category, description: parsed.data.description }, 'Details saved.');
}

export async function setDonorReleaseAction(projectId: string, documentId: string, release: boolean): Promise<DocumentActionResult> {
  const actor = await getActor();
  if (!actor) return fail('Please sign in again.');
  if (!canReleaseDocuments(actor.roles)) return fail('Only the Executive Director or Programme Manager can release a document to the donor.');
  return updateDocument(projectId, documentId, { released_to_donor: !!release }, release ? 'Released to the donor.' : 'Withdrawn from the donor.');
}

/** "Remove" hides the document (and withdraws it from the donor). The file and the audit trail stay. */
export async function removeDocumentAction(projectId: string, documentId: string): Promise<DocumentActionResult> {
  const actor = await getActor();
  if (!actor) return fail('Please sign in again.');
  if (!canWriteDocuments(actor.roles)) return fail('You do not have permission to remove documents.');
  return updateDocument(projectId, documentId, { deleted_at: new Date().toISOString() }, 'Document removed.');
}
