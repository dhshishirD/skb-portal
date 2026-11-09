'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Trash2 } from 'lucide-react';
import { KINDS, STATUSES, kindLabel, statusLabel, type FileRecordsData, type FileKind } from '@/lib/fileRecords';
import { addFileRecordAction, deleteFileRecordAction, getFileRecordsAction, setFileRecordStatusAction } from '@/server/actions/fileRecords';

type Note = { kind: 'ok' | 'error'; text: string } | null;
const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white';
const btnCls = 'px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';
const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric' });

/** Distribution lists and NID sheets: the portal tracks each file's state and link, it does not store the file. */
export function FileRecordsPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<FileRecordsData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<FileKind>('distribution_list');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('prepared');
  const [link, setLink] = useState('');
  const [memo, setMemo] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await getFileRecordsAction(projectId);
      if (r.ok) {
        setData(r.data);
        setLoadError(null);
      } else setLoadError(r.error);
    } catch {
      setLoadError('Could not load the file records. Please refresh the page.');
    }
  }, [projectId]);
  useEffect(() => {
    void load();
  }, [load]);

  async function run(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>): Promise<boolean> {
    setBusy(true);
    setNote(null);
    try {
      const r = await fn();
      setNote(r.ok ? { kind: 'ok', text: r.message ?? 'Done.' } : { kind: 'error', text: r.error ?? 'Something went wrong.' });
      if (r.ok) await load();
      return r.ok;
    } catch {
      setNote({ kind: 'error', text: 'Could not reach the server. Please try again.' });
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (loadError && !data) return <p role="alert" className="text-sm text-red-700">{loadError}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading file records…</p>;

  return (
    <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4" aria-labelledby="file-records-title">
      <div>
        <h2 id="file-records-title" className="text-sm font-bold">Distribution lists and NID sheets</h2>
        <p className="text-xs text-slate-500">
          Keep track of each signed list or sheet: its state and, if it is kept online, a link. The portal does not store the files, and no names or ID numbers go here.
        </p>
      </div>
      {note && <p role={note.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${note.kind === 'error' ? 'text-red-700' : 'text-green-700'}`}>{note.text}</p>}
      {data.closed && <p className="text-sm bg-slate-100 border border-slate-200 rounded-xl p-3">This project is closed. File records can no longer be changed.</p>}

      {data.records.length === 0 ? (
        <p className="text-sm text-slate-500">No records yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.records.map((r) => (
            <li key={r.id} className="py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold break-words">{r.name}</p>
                <p className="text-xs text-slate-500">
                  {kindLabel(r.kind)} · added {fmt(r.createdAt)}{r.createdByName ? ` by ${r.createdByName}` : ''}
                  {r.note ? ` · ${r.note}` : ''}
                </p>
              </div>
              {r.link && (
                <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-700 inline-flex items-center gap-1">
                  Open link <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              )}
              {data.canWrite ? (
                <select
                  aria-label={`Status of ${r.name}`}
                  className="px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white"
                  value={r.status}
                  disabled={busy}
                  onChange={(e) => run(() => setFileRecordStatusAction(projectId, r.id, e.target.value))}
                >
                  {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              ) : (
                <span className="text-xs font-bold">{statusLabel(r.status)}</span>
              )}
              {data.canDelete && (
                <button
                  className="text-slate-500 hover:text-red-700 disabled:opacity-50"
                  aria-label={`Delete ${r.name}`}
                  disabled={busy}
                  onClick={() => { if (window.confirm(`Delete the record "${r.name}"? The file itself is not touched.`)) void run(() => deleteFileRecordAction(projectId, r.id)); }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {data.canWrite && (
        <form
          className="grid gap-2 sm:grid-cols-2 border-t border-slate-100 pt-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run(() => addFileRecordAction(projectId, { kind, name, status, link, note: memo }));
            if (ok) { setName(''); setLink(''); setMemo(''); setStatus('prepared'); }
          }}
        >
          <select aria-label="Kind" className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as FileKind)}>
            {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
          <select aria-label="Status" className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <input aria-label="Name" className={`${inputCls} sm:col-span-2`} maxLength={200} placeholder="Name, for example: Distribution list, Golachipa, batch 1" value={name} onChange={(e) => setName(e.target.value)} />
          <input aria-label="Link" className={inputCls} maxLength={500} placeholder="https:// link (optional)" value={link} onChange={(e) => setLink(e.target.value)} />
          <input aria-label="Note" className={inputCls} maxLength={300} placeholder="Note (optional)" value={memo} onChange={(e) => setMemo(e.target.value)} />
          <div className="sm:col-span-2"><button className={btnCls} disabled={busy} type="submit">Add record</button></div>
        </form>
      )}
    </section>
  );
}
