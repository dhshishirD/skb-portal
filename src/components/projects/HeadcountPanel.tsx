'use client';

import { useCallback, useEffect, useState } from 'react';
import { headcountTotal, type HeadcountData } from '@/lib/headcounts';
import { getHeadcountAction, saveHeadcountAction } from '@/server/actions/headcounts';

type Note = { kind: 'ok' | 'error'; text: string } | null;
const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white disabled:bg-slate-50';
const btnCls = 'px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';
const FIELDS = [
  ['women', 'Women'],
  ['men', 'Men'],
  ['girls', 'Girls'],
  ['boys', 'Boys'],
] as const;
type Key = (typeof FIELDS)[number][0];

/** Numbers-only head count for Form-7, used when nobody is registered one by one. */
export function HeadcountPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<HeadcountData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [vals, setVals] = useState<Record<Key, string>>({ women: '', men: '', girls: '', boys: '' });
  const [memo, setMemo] = useState('');
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await getHeadcountAction(projectId);
      if (r.ok) {
        setData(r.data);
        const h = r.data.headcount;
        setVals({ women: String(h?.women ?? ''), men: String(h?.men ?? ''), girls: String(h?.girls ?? ''), boys: String(h?.boys ?? '') });
        setMemo(h?.note ?? '');
        setLoadError(null);
      } else setLoadError(r.error);
    } catch {
      setLoadError('Could not load the head count. Please refresh the page.');
    }
  }, [projectId]);
  useEffect(() => {
    void load();
  }, [load]);

  if (loadError && !data) return <p role="alert" className="text-sm text-red-700">{loadError}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading the head count…</p>;

  const total = headcountTotal({ women: Number(vals.women) || 0, men: Number(vals.men) || 0, girls: Number(vals.girls) || 0, boys: Number(vals.boys) || 0 });

  async function save() {
    setBusy(true);
    setNote(null);
    try {
      const r = await saveHeadcountAction(projectId, { ...vals, note: memo });
      setNote(r.ok ? { kind: 'ok', text: r.message ?? 'Saved.' } : { kind: 'error', text: r.error });
      if (r.ok) await load();
    } catch {
      setNote({ kind: 'error', text: 'Could not reach the server. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3" aria-labelledby="headcount-title">
      <div>
        <h2 id="headcount-title" className="text-sm font-bold">Head count (numbers only)</h2>
        <p className="text-xs text-slate-500">
          For projects whose signed lists are kept on paper or in the project folder. No names or ID numbers are stored.
          Form-7 uses these numbers when no one is registered above{data.registeredTotal > 0 ? ` (${data.registeredTotal} registered now, so the registered people are used instead)` : ''}.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {FIELDS.map(([key, label]) => (
          <label key={key} className="text-xs font-semibold space-y-1">
            {label}
            <input
              className={inputCls}
              inputMode="numeric"
              disabled={!data.canWrite || busy}
              value={vals[key]}
              onChange={(e) => setVals((v) => ({ ...v, [key]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      <label className="block text-xs font-semibold space-y-1">
        Note (where the signed list is kept)
        <input className={inputCls} maxLength={300} disabled={!data.canWrite || busy} value={memo} onChange={(e) => setMemo(e.target.value)} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        {data.canWrite && <button className={btnCls} disabled={busy} onClick={save}>Save head count</button>}
        <span className="text-xs text-slate-600">Total people: <strong>{total}</strong></span>
        {data.headcount?.updatedAt && (
          <span className="text-xs text-slate-400">
            Last saved {new Date(data.headcount.updatedAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric' })}
            {data.headcount.updatedByName ? ` by ${data.headcount.updatedByName}` : ''}
          </span>
        )}
      </div>
      {note && <p role={note.kind === 'error' ? 'alert' : 'status'} className={`text-xs ${note.kind === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>{note.text}</p>}
    </section>
  );
}
