'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, Plus, Stamp } from 'lucide-react';
import { LETTER_STATUS_LABELS, padDate, type LetterStatus } from '@/lib/letters';
import { createLetterAction, getLettersAction, removeStampAction, saveStampAction, setNumberingAction, type LetterRegister } from '@/server/actions/letters';

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white';
const labelCls = 'block text-xs font-bold text-slate-600 mb-1';
const btnCls = 'px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';
const ghostCls = 'px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 disabled:opacity-50';
type Note = { kind: 'ok' | 'error'; text: string } | null;

const STATUS_CHIP: Record<LetterStatus, string> = {
  draft: 'bg-amber-50 text-amber-800 border-amber-200',
  issued: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  void: 'bg-slate-100 text-slate-500 border-slate-200',
};

/** The letter register: write a new letter, find an old one, keep the stamp, and (Executive Director) set the numbering. */
export function LettersPanel() {
  const router = useRouter();
  const [data, setData] = useState<LetterRegister | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | LetterStatus>('all');
  const [last, setLast] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await getLettersAction();
      if (r.ok) {
        setData(r.data);
        setLoadError(null);
      } else setLoadError(r.error);
    } catch {
      setLoadError('Could not load the letters. Please refresh the page.');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.letters.filter((l) => (filter === 'all' || l.status === filter) && (!q || [l.refNo ?? '', l.subject, l.toLines].some((x) => x.toLowerCase().includes(q))));
  }, [data, query, filter]);

  const run = async (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) => {
    setBusy(true);
    setNote(null);
    try {
      const r = await fn();
      setNote({ kind: r.ok ? 'ok' : 'error', text: (r.ok ? r.message : r.error) ?? (r.ok ? 'Done.' : 'Something went wrong.') });
      if (r.ok) await load();
    } catch {
      setNote({ kind: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    setBusy(true);
    setNote(null);
    try {
      const r = await createLetterAction();
      if (r.ok) router.push(`/workspace/letters/${r.data.id}`);
      else setNote({ kind: 'error', text: r.error });
    } catch {
      setNote({ kind: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  if (loadError) return <p className="text-sm text-red-700">{loadError}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <section className="space-y-5" aria-label="Letters">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {data.nextNumber !== null && (
            <>
              The next letter issued this year gets number <b>{data.nextNumber}</b>.
            </>
          )}
        </p>
        <button type="button" className={btnCls} disabled={busy} onClick={() => void create()}>
          <Plus size={12} className="inline" /> New letter
        </button>
      </div>

      {note && (
        <p role="status" className={`text-sm ${note.kind === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>
          {note.text}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[12rem]">
          <label htmlFor="letter-search" className="sr-only">Search letters</label>
          <input id="letter-search" className={inputCls} placeholder="Search by Ref, subject or who it is to" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div>
          <label htmlFor="letter-filter" className="sr-only">Show</label>
          <select id="letter-filter" className={inputCls} value={filter} onChange={(e) => setFilter(e.target.value as 'all' | LetterStatus)}>
            <option value="all">All letters</option>
            <option value="draft">Drafts</option>
            <option value="issued">Issued</option>
            <option value="void">Cancelled</option>
          </select>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-slate-500">{data.letters.length === 0 ? 'No letters yet. Start with "New letter".' : 'No letter matches.'}</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((l) => (
            <li key={l.id}>
              <Link href={`/workspace/letters/${l.id}`} className="block rounded-xl border border-slate-200 bg-white p-3 hover:border-slate-400">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 break-words flex items-center gap-2">
                    <FileText size={14} /> {l.refNo ?? 'No Ref yet'}
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_CHIP[l.status]}`}>{LETTER_STATUS_LABELS[l.status]}</span>
                  </p>
                  <p className="text-xs text-slate-500">{l.letterDate ? padDate(l.letterDate) : 'Not issued'}</p>
                </div>
                <p className="text-sm text-slate-800 mt-1 break-words">{l.subject || <span className="text-slate-400">No subject yet</span>}</p>
                <p className="text-xs text-slate-500 break-words">
                  {l.toLines.split('\n')[0] || 'No recipient yet'} · written by {data.people[l.createdBy] ?? 'staff'}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Stamp size={14} /> Stamp of the organisation</h3>
        <p className="text-xs text-slate-600">{data.hasStamp ? 'A stamp is saved. A letter can carry it when you tick "Add the stamp".' : 'No stamp is saved yet. Upload a clear PNG or JPG picture of the stamp (1 MB at most).'}</p>
        <div className="flex flex-wrap items-center gap-2">
          <label className={`${ghostCls} cursor-pointer`}>
            {data.hasStamp ? 'Replace the stamp' : 'Upload the stamp'}
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                const fd = new FormData();
                fd.set('file', file);
                void run(() => saveStampAction(fd));
              }}
            />
          </label>
          {data.hasStamp && (
            <button type="button" className={ghostCls} disabled={busy} onClick={() => void run(() => removeStampAction())}>
              Remove the stamp
            </button>
          )}
        </div>
      </div>

      {data.canSetNumbering && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
          <h3 className="text-sm font-bold text-slate-900">Numbering for {data.year}</h3>
          <p className="text-xs text-slate-600">To continue from your paper register, write the last number already used this year. The next letter gets the number after it. It cannot go below a number already issued here.</p>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className={labelCls} htmlFor="last-number">Last number used</label>
              <input id="last-number" inputMode="numeric" className={`${inputCls} w-32`} value={last} onChange={(e) => setLast(e.target.value.replace(/\D/g, '').slice(0, 5))} />
            </div>
            <button type="button" className={btnCls} disabled={busy || last === ''} onClick={() => void run(() => setNumberingAction(data.year, Number(last)))}>
              Set
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
