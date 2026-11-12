'use client';

import { useCallback, useEffect, useState } from 'react';
import { History, ShieldCheck } from 'lucide-react';
import { getAuditLogAction } from '@/server/actions/auditLog';
import { TABLE_LABELS, TABLE_OPTIONS, type AuditFilter, type AuditPage } from '@/lib/auditLog';

/*
 * Audit log: who changed what, and when. The database writes it automatically; nobody in the portal can
 * edit or delete it. Personal values are hidden: for personal tables only the field names are shown.
 */

const ACTION_TONE: Record<string, string> = {
  INSERT: 'bg-emerald-100 text-emerald-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
};
const ACTION_WORD: Record<string, string> = { INSERT: 'Added', UPDATE: 'Changed', DELETE: 'Deleted' };

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

type FilterState = { table: string; action: string; from: string; to: string; actorId: string };
const EMPTY: FilterState = { table: '', action: '', from: '', to: '', actorId: '' };

export default function AuditLogPage() {
  const [f, setF] = useState<FilterState>(EMPTY);
  const [applied, setApplied] = useState<FilterState>(EMPTY);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AuditPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (flt: FilterState, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const r = await getAuditLogAction({
        table: flt.table || undefined,
        action: (flt.action || undefined) as AuditFilter['action'],
        actorId: flt.actorId || undefined,
        from: flt.from || undefined,
        to: flt.to || undefined,
        page: p,
      });
      if (r.ok) setData(r.data);
      else setError(r.error);
    } catch {
      setError('Could not reach the server. Reload the page (Ctrl+F5) and try again.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load(applied, page);
  }, [load, applied, page]);

  const apply = (next: FilterState) => {
    setOpen(null);
    setPage(1);
    setApplied(next);
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const input = 'px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          Audit Log
        </h1>
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          Who changed what, and when (Bangladesh time). The database records this automatically; it cannot be edited from the portal. Personal details are hidden.
        </p>
      </div>

      <form
        className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm flex flex-wrap gap-3 items-end"
        onSubmit={(e) => {
          e.preventDefault();
          apply(f);
        }}
      >
        <label className="text-xs font-semibold text-slate-700">
          What
          <select className={`${input} block mt-1`} value={f.table} onChange={(e) => setF({ ...f, table: e.target.value })}>
            <option value="">Everything</option>
            {TABLE_OPTIONS.map((t) => (<option key={t} value={t}>{TABLE_LABELS[t]}</option>))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Kind of change
          <select className={`${input} block mt-1`} value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })}>
            <option value="">Any</option>
            <option value="INSERT">Added</option>
            <option value="UPDATE">Changed</option>
            <option value="DELETE">Deleted</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700">
          From
          <input type="date" className={`${input} block mt-1`} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          To
          <input type="date" className={`${input} block mt-1`} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
        </label>
        <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl">Show</button>
        <button type="button" className="px-3 py-2 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl" onClick={() => { setF(EMPTY); apply(EMPTY); }}>Clear</button>
        {applied.actorId && (
          <span className="text-xs text-slate-600">
            Showing one person only.{' '}
            <button type="button" className="text-blue-700 underline" onClick={() => { const n = { ...f, actorId: '' }; setF(n); apply({ ...applied, actorId: '' }); }}>Show everyone</button>
          </span>
        )}
      </form>

      {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs">{error}</div>}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100">
        {!data && !error && <p className="p-6 text-xs text-slate-500">Loading…</p>}
        {data && data.entries.length === 0 && (
          <p className="p-8 text-center text-xs text-slate-500">Nothing recorded for this filter.</p>
        )}
        {data?.entries.map((e) => (
          <div key={e.id} className="p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ACTION_TONE[e.action] ?? 'bg-slate-100 text-slate-700'}`}>{ACTION_WORD[e.action] ?? e.action}</span>
              <span className="text-[11px] text-slate-500">{fmt(e.occurredAt)}</span>
              <span className="text-[11px] text-slate-400">· {e.tableLabel}</span>
              {e.actorId && (
                <button type="button" className="text-[11px] text-blue-700 underline" onClick={() => { const n = { ...applied, actorId: e.actorId! }; setF(n); apply(n); }}>
                  only {e.actorName ?? 'this person'}
                </button>
              )}
            </div>
            <p className="text-sm text-slate-900">{e.headline}</p>
            {e.fields.length > 0 && (
              <button type="button" className="text-[11px] text-slate-500 underline" onClick={() => setOpen(open === e.id ? null : e.id)}>
                {open === e.id ? 'Hide details' : `Details (${e.fields.length} field${e.fields.length === 1 ? '' : 's'})`}
              </button>
            )}
            {open === e.id && (
              <ul className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 font-mono">
                {e.fields.map((x) => (
                  <li key={x.name}>
                    <strong>{x.name}</strong>:{' '}
                    {x.hidden ? <em>changed (value hidden)</em> : <>{x.from !== null && <span>{x.from}</span>}{x.from !== null && x.to !== null && ' → '}{x.to !== null && <span>{x.to}</span>}</>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>{data.total.toLocaleString('en-US')} entries · page {page} of {pages}</span>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Newer</button>
            <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50" disabled={page >= pages || loading} onClick={() => setPage(page + 1)}>Older</button>
          </div>
        </div>
      )}
    </div>
  );
}
