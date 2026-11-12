'use client';

import { useCallback, useEffect, useState } from 'react';
import { History, ShieldCheck } from 'lucide-react';
import { getAuditLogAction } from '@/server/actions/auditLog';
import { TABLE_LABELS, TABLE_OPTIONS, type AuditEntry, type AuditFilter } from '@/lib/auditLog';

/*
 * Audit log: who changed what, and when. The database writes it automatically; nobody in the portal can
 * edit or delete it. Personal values are hidden: for personal tables only the field names are shown.
 * Rows are one line each; "See more" loads the next 20.
 */

const ACTION_TONE: Record<string, string> = {
  INSERT: 'bg-emerald-100 text-emerald-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
};
const ACTION_WORD: Record<string, string> = { INSERT: 'Added', UPDATE: 'Changed', DELETE: 'Deleted' };

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
const fmtFull = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

type FilterState = { table: string; action: string; from: string; to: string; actorId: string; includeSystem: boolean };
const EMPTY: FilterState = { table: '', action: '', from: '', to: '', actorId: '', includeSystem: false };

export default function AuditLogPage() {
  const [f, setF] = useState<FilterState>(EMPTY);
  const [applied, setApplied] = useState<FilterState>(EMPTY);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [open, setOpen] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        includeSystem: flt.includeSystem,
        page: p,
      });
      if (r.ok) {
        setEntries((prev) => (p === 1 ? r.data.entries : [...prev, ...r.data.entries.filter((e) => !prev.some((x) => x.id === e.id))]));
        setTotal(r.data.total);
        setPageSize(r.data.pageSize);
      } else setError(r.error);
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
    setEntries([]);
    setTotal(null);
    setPage(1);
    setApplied(next);
  };

  const hasMore = total !== null && entries.length < total;
  const input = 'px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          Audit Log
        </h1>
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          Who changed what, and when (Bangladesh time). Recorded automatically; it cannot be edited from the portal. Personal details are hidden.
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
        <label className="text-xs text-slate-700 flex items-center gap-1.5 pb-2">
          <input type="checkbox" checked={f.includeSystem} onChange={(e) => setF({ ...f, includeSystem: e.target.checked })} />
          Include automatic system notifications
        </label>
        <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl">Show</button>
        <button type="button" className="px-3 py-2 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl" onClick={() => { setF(EMPTY); apply(EMPTY); }}>Clear</button>
        {applied.actorId && (
          <span className="text-xs text-slate-600">
            One person only.{' '}
            <button type="button" className="text-blue-700 underline" onClick={() => { setF({ ...f, actorId: '' }); apply({ ...applied, actorId: '' }); }}>Show everyone</button>
          </span>
        )}
      </form>

      {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs">{error}</div>}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100">
        {total === null && !error && <p className="p-6 text-xs text-slate-500">Loading…</p>}
        {total === 0 && <p className="p-8 text-center text-xs text-slate-500">Nothing recorded for this filter.</p>}
        {entries.map((e) => (
          <div key={e.id}>
            <button
              type="button"
              className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-slate-50"
              onClick={() => setOpen(open === e.id ? null : e.id)}
              aria-expanded={open === e.id}
            >
              <span className={`shrink-0 w-16 text-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${ACTION_TONE[e.action] ?? 'bg-slate-100 text-slate-700'}`}>{ACTION_WORD[e.action] ?? e.action}</span>
              <span className="shrink-0 w-28 text-[11px] text-slate-500">{fmt(e.occurredAt)}</span>
              <span className="flex-1 min-w-0 truncate text-xs text-slate-900" title={e.headline}>{e.headline}</span>
              <span className="shrink-0 text-[11px] text-slate-400">{open === e.id ? '▲' : '▼'}</span>
            </button>
            {open === e.id && (
              <div className="px-4 pb-3 space-y-2">
                <p className="text-xs text-slate-900">{e.headline}</p>
                <p className="text-[11px] text-slate-500">
                  {fmtFull(e.occurredAt)} · {e.tableLabel}
                  {e.actorId && (
                    <>
                      {' · '}
                      <button type="button" className="text-blue-700 underline" onClick={() => { const n = { ...applied, actorId: e.actorId! }; setF(n); apply(n); }}>
                        only {e.actorName ?? 'this person'}
                      </button>
                    </>
                  )}
                </p>
                {e.fields.length > 0 ? (
                  <ul className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 font-mono max-h-56 overflow-auto">
                    {e.fields.map((x) => (
                      <li key={x.name} className="break-words">
                        <strong>{x.name}</strong>:{' '}
                        {x.hidden ? <em>changed (value hidden)</em> : <>{x.from !== null && <span>{x.from}</span>}{x.from !== null && x.to !== null && ' → '}{x.to !== null && <span>{x.to}</span>}</>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-slate-400">No field details.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {total !== null && total > 0 && (
        <div className="flex flex-col items-center gap-2 text-xs text-slate-600">
          <span>Showing {entries.length.toLocaleString('en-US')} of {total.toLocaleString('en-US')}</span>
          {hasMore && (
            <button className="px-5 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold disabled:opacity-50" disabled={loading} onClick={() => setPage(page + 1)}>
              {loading ? 'Loading…' : `See more (${Math.min(pageSize, total - entries.length)} more)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
