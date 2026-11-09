'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Eye, EyeOff, FileText, History, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  CATEGORIES,
  DOCUMENT_BUCKET,
  categoryLabel,
  fileProblem,
  formatSize,
  type DocumentFormValues,
  type DocumentItem,
  type DocumentsData,
} from '@/lib/documents';
import {
  completeDocumentUploadAction,
  getDocumentDownloadAction,
  getDocumentsAction,
  prepareDocumentUploadAction,
  removeDocumentAction,
  setDonorReleaseAction,
  updateDocumentAction,
  type DocumentActionResult,
} from '@/server/actions/documents';

type Note = { kind: 'ok' | 'error'; text: string } | null;

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white';
const labelCls = 'block text-xs font-bold text-slate-600 mb-1';
const btnCls = 'px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';
const ghostCls = 'px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 disabled:opacity-50';
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/** Documents tab: files for this project, versioned, with the real uploader and a donor-release switch. */
export function DocumentsPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<DocumentsData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [category, setCategory] = useState('all');

  const load = useCallback(async () => {
    try {
      const r = await getDocumentsAction(projectId);
      if (r.ok) {
        setData(r.data);
        setLoadError(null);
      } else setLoadError(r.error);
    } catch {
      setLoadError('Could not load the documents. Please refresh the page.');
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (fn: () => Promise<DocumentActionResult>): Promise<boolean> => {
    setBusy(true);
    setNote(null);
    try {
      const r = await fn();
      if (r.ok) {
        setNote({ kind: 'ok', text: r.message ?? 'Done.' });
        await load();
        return true;
      }
      setNote({ kind: 'error', text: r.error });
      return false;
    } catch {
      setNote({ kind: 'error', text: 'Something went wrong. Please try again.' });
      return false;
    } finally {
      setBusy(false);
    }
  };

  /** Upload straight to private storage with a one-time link, then record it. */
  const upload = async (file: File, documentId: string | null, values: DocumentFormValues): Promise<DocumentActionResult> => {
    const problem = fileProblem(file);
    if (problem) return { ok: false, error: problem };
    const base = { projectId, documentId, fileName: file.name, mime: file.type, size: file.size };
    const prep = await prepareDocumentUploadAction(base);
    if (!prep.ok) return prep;
    const { error } = await createClient().storage.from(DOCUMENT_BUCKET).uploadToSignedUrl(prep.data.path, prep.data.token, file, { contentType: file.type });
    if (error) return { ok: false, error: 'The upload failed. Please try again.' };
    return completeDocumentUploadAction({ ...base, path: prep.data.path, values });
  };

  const download = async (versionId: string) => {
    setNote(null);
    const r = await getDocumentDownloadAction(versionId);
    if (r.ok) window.open(r.data.url, '_blank', 'noopener');
    else setNote({ kind: 'error', text: r.error });
  };

  if (loadError) return <p className="text-sm text-red-700">{loadError}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading…</p>;

  const shown = data.documents.filter((d) => category === 'all' || d.category === category);
  const released = data.documents.filter((d) => d.releasedToDonor).length;

  return (
    <div className="space-y-4">
      {data.closed && <p className="text-sm text-slate-600">This project is closed, so the documents are read-only.</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-700">
          <b>{data.documents.length}</b> document{data.documents.length === 1 ? '' : 's'}
          {released > 0 && <span className="text-slate-500"> · {released} released to the donor</span>}
        </p>
        <div className="flex items-center gap-2">
          <select aria-label="Filter by category" className="px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          {data.canWrite && (
            <button type="button" className={btnCls} onClick={() => setAdding((v) => !v)}>
              <Plus size={12} className="inline" /> Add document
            </button>
          )}
        </div>
      </div>
      {note && (
        <p role="status" className={`text-sm ${note.kind === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>
          {note.text}
        </p>
      )}
      {adding && data.canWrite && (
        <NewDocumentForm
          busy={busy}
          onCancel={() => setAdding(false)}
          onSubmit={async (file, values) => {
            if (await run(() => upload(file, null, values))) setAdding(false);
          }}
        />
      )}
      {shown.length === 0 && <p className="text-sm text-slate-500">{data.documents.length === 0 ? 'No documents yet.' : 'No documents in this category.'}</p>}
      <ul className="space-y-2">
        {shown.map((d) => (
          <DocumentRow
            key={d.id}
            doc={d}
            data={data}
            busy={busy}
            onDownload={download}
            onNewVersion={(file) => run(() => upload(file, d.id, { title: d.title, category: d.category, description: d.description ?? '' }))}
            onRelease={(release) => run(() => setDonorReleaseAction(projectId, d.id, release))}
            onRemove={() => run(() => removeDocumentAction(projectId, d.id))}
            onSaveDetails={(v) => run(() => updateDocumentAction(projectId, d.id, v))}
          />
        ))}
      </ul>
      <p className="text-xs text-slate-500">
        Files are kept in private storage and opened through short-lived links. Very large files (over 25 MB), such as NID sheets, are not uploaded here: record them in the distribution records instead.
      </p>
    </div>
  );
}

function NewDocumentForm({ busy, onSubmit, onCancel }: { busy: boolean; onSubmit: (file: File, v: DocumentFormValues) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <form
      className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!file) return setProblem('Choose a file.');
        await onSubmit(file, { title, category, description });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="doc-title">Title</label>
          <input id="doc-title" className={inputCls} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="doc-category">Category</label>
          <select id="doc-category" className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor="doc-note">Note (optional)</label>
        <textarea id="doc-note" className={inputCls} rows={2} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <label className={labelCls} htmlFor="doc-file">File (PDF, Word, Excel, CSV, JPG, PNG, WEBP; up to 25 MB)</label>
        <input
          id="doc-file"
          type="file"
          className="text-sm"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            setProblem(f ? fileProblem(f) : null);
            if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ''));
          }}
        />
        {problem && <p className="mt-1 text-xs text-red-700">{problem}</p>}
      </div>
      <div className="flex gap-2">
        <button type="submit" className={btnCls} disabled={busy || !file || !!problem}>
          <Upload size={12} className="inline" /> {busy ? 'Uploading…' : 'Upload'}
        </button>
        <button type="button" className={ghostCls} onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function DocumentRow({
  doc,
  data,
  busy,
  onDownload,
  onNewVersion,
  onRelease,
  onRemove,
  onSaveDetails,
}: {
  doc: DocumentItem;
  data: DocumentsData;
  busy: boolean;
  onDownload: (versionId: string) => void;
  onNewVersion: (file: File) => Promise<boolean>;
  onRelease: (release: boolean) => Promise<boolean>;
  onRemove: () => Promise<boolean>;
  onSaveDetails: (v: DocumentFormValues) => Promise<boolean>;
}) {
  const [showVersions, setShowVersions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(doc.title);
  const [cat, setCat] = useState(doc.category);
  const [desc, setDesc] = useState(doc.description ?? '');
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cur = doc.current;
  const known = CATEGORIES.some((c) => c.id === cat);

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <FileText size={14} className="shrink-0 text-slate-500" /> <span className="truncate">{doc.title}</span>
          </p>
          <p className="text-xs text-slate-500">
            {categoryLabel(doc.category)}
            {cur ? ` · v${cur.versionNo} · ${cur.originalName ?? 'file'} · ${formatSize(cur.size)} · ${cur.uploadedByName ?? 'Unknown'}, ${fmtDate(cur.uploadedAt)}` : ' · no file yet'}
          </p>
          {doc.description && <p className="mt-1 text-xs text-slate-600">{doc.description}</p>}
          {doc.releasedToDonor && (
            <p className="mt-1 text-xs font-bold text-emerald-700">
              Released to the donor{doc.releasedByName ? ` by ${doc.releasedByName}` : ''}
              {doc.releasedAt ? ` on ${fmtDate(doc.releasedAt)}` : ''}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {cur && (
            <button type="button" className={ghostCls} onClick={() => onDownload(cur.id)}>
              <Download size={12} className="inline" /> Open
            </button>
          )}
          {doc.versions.length > 1 && (
            <button type="button" className={ghostCls} onClick={() => setShowVersions((v) => !v)}>
              <History size={12} className="inline" /> {doc.versions.length} versions
            </button>
          )}
          {data.canWrite && (
            <>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                aria-label={`New version of ${doc.title}`}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  const p = fileProblem(f);
                  setFileError(p);
                  if (!p) await onNewVersion(f);
                }}
              />
              <button type="button" className={ghostCls} disabled={busy} onClick={() => fileRef.current?.click()}>
                <Upload size={12} className="inline" /> New version
              </button>
              <button type="button" className={ghostCls} disabled={busy} onClick={() => setEditing((v) => !v)} aria-label="Edit details">
                <Pencil size={12} className="inline" />
              </button>
              <button
                type="button"
                className={ghostCls}
                disabled={busy}
                aria-label={`Remove ${doc.title}`}
                onClick={() => {
                  if (window.confirm('Remove this document? It is hidden from everyone, and withdrawn from the donor. The file and its history are kept.')) void onRemove();
                }}
              >
                <Trash2 size={12} className="inline" />
              </button>
            </>
          )}
          {data.canRelease && cur && (
            <button type="button" className={ghostCls} disabled={busy} onClick={() => onRelease(!doc.releasedToDonor)}>
              {doc.releasedToDonor ? (
                <>
                  <EyeOff size={12} className="inline" /> Withdraw from donor
                </>
              ) : (
                <>
                  <Eye size={12} className="inline" /> Release to donor
                </>
              )}
            </button>
          )}
        </div>
      </div>
      {fileError && <p className="mt-1 text-xs text-red-700">{fileError}</p>}
      {showVersions && (
        <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2">
          {doc.versions.map((v) => (
            <li key={v.id} className="flex items-center justify-between text-xs text-slate-600">
              <span>
                v{v.versionNo} · {v.originalName ?? 'file'} · {formatSize(v.size)} · {v.uploadedByName ?? 'Unknown'}, {fmtDate(v.uploadedAt)}
              </span>
              <button type="button" className="font-bold text-slate-800 underline" onClick={() => onDownload(v.id)}>
                Open
              </button>
            </li>
          ))}
        </ul>
      )}
      {editing && data.canWrite && (
        <form
          className="mt-2 space-y-2 border-t border-slate-100 pt-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await onSaveDetails({ title, category: cat, description: desc })) setEditing(false);
          }}
        >
          <input aria-label="Title" className={inputCls} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
          <select aria-label="Category" className={inputCls} value={cat} onChange={(e) => setCat(e.target.value)}>
            {!known && <option value={cat}>{categoryLabel(cat)}</option>}
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <textarea aria-label="Note" className={inputCls} rows={2} maxLength={1000} value={desc} onChange={(e) => setDesc(e.target.value)} />
          <div className="flex gap-2">
            <button type="submit" className={btnCls} disabled={busy}>
              Save
            </button>
            <button type="button" className={ghostCls} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
