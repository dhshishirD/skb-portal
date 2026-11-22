'use client';

import { useCallback, useEffect, useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { listDeletedProjectsAction, purgeProjectAction, restoreProjectAction, type DeletedProject } from '@/server/actions/projects';

type Note = { kind: 'ok' | 'error'; text: string } | null;

/** Deleted projects: restore one, or remove it for good (only when it holds no money, people or file records). */
export function DeletedProjectsPanel({ onChanged }: { onChanged: () => void }) {
  const [rows, setRows] = useState<DeletedProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [purging, setPurging] = useState<string | null>(null);
  const [typed, setTyped] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await listDeletedProjectsAction();
      if (r.ok) {
        setRows(r.data);
        setError(null);
      } else setError(r.error);
    } catch {
      setError('Could not load the deleted projects. Please refresh the page.');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const run = async (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) => {
    setBusy(true);
    setNote(null);
    try {
      const r = await fn();
      setNote({ kind: r.ok ? 'ok' : 'error', text: (r.ok ? r.message : r.error) ?? (r.ok ? 'Done.' : 'Something went wrong.') });
      if (r.ok) {
        setPurging(null);
        setTyped('');
        await load();
        onChanged();
      }
    } catch {
      setNote({ kind: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!rows || rows.length === 0) return null;

  return (
    <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3" aria-label="Deleted projects">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="text-sm font-bold text-slate-900 flex items-center gap-2">
        <Trash2 size={14} /> Deleted projects ({rows.length})
      </button>
      {open && (
        <>
          <p className="text-xs text-slate-600">Deleted projects are hidden from every list. Restore one to bring it back. Removing one for good cannot be undone, and is allowed only when it has no expense claims, purchase requests, fund receipts, beneficiaries, documents, file records or field reports.</p>
          {note && (
            <p role="status" className={`text-sm ${note.kind === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>
              {note.text}
            </p>
          )}
          <ul className="space-y-2">
            {rows.map((p) => {
              const blocked = p.keepReasons.length > 0;
              return (
                <li key={p.id} className="rounded-xl border border-slate-200 p-3 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-slate-500">{p.code}</p>
                      <p className="text-sm font-semibold text-slate-900 break-words">{p.title}</p>
                      <p className="text-xs text-slate-500">Deleted {p.deletedAt.slice(0, 10)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={busy} onClick={() => void run(() => restoreProjectAction(p.id))} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 disabled:opacity-50">
                        <RotateCcw size={12} /> Restore
                      </button>
                      <button
                        type="button"
                        disabled={busy || blocked}
                        onClick={() => {
                          setPurging(purging === p.id ? null : p.id);
                          setTyped('');
                        }}
                        className="px-3 py-2 text-xs font-bold rounded-xl bg-red-50 text-red-700 disabled:opacity-50"
                      >
                        Delete permanently
                      </button>
                    </div>
                  </div>
                  {blocked && <p className="text-xs text-amber-800">Cannot be removed for good: it still has {p.keepReasons.join(', ')}. Keep it deleted (hidden).</p>}
                  {purging === p.id && !blocked && (
                    <div className="rounded-lg bg-red-50 p-3 space-y-2">
                      <p className="text-xs text-red-800">This removes the project and its tasks, logframe, charter, budget and areas for good. It cannot be undone. Type the project code <b>{p.code}</b> to confirm.</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <label htmlFor={`purge-${p.id}`} className="sr-only">Project code</label>
                        <input id={`purge-${p.id}`} className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
                        <button type="button" disabled={busy || typed.trim() !== p.code} onClick={() => void run(() => purgeProjectAction(p.id))} className="px-3 py-2 text-xs font-bold text-white bg-red-600 rounded-lg disabled:opacity-50">
                          {busy ? 'Removing…' : 'Remove for good'}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
