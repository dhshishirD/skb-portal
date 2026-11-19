'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { DAY_TYPE_LABELS, STATUS_LABELS, buildRows, monthTitle, shortDate, summarize } from '@/lib/workStatement';
import {
  getReviewQueueAction,
  getStatementAction,
  getStatementSignaturesAction,
  reviewStatementAction,
  type ReviewDetail,
  type ReviewItem,
} from '@/server/actions/workStatement';
import { downloadStatementDocx, toDocData } from './downloadStatement';

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white';
const btnCls = 'px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';
const ghostCls = 'px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 disabled:opacity-50';
type Note = { kind: 'ok' | 'error'; text: string } | null;

/** Statements waiting for me to verify or approve. Shows nothing when there are none. */
export function ReviewPanel() {
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);

  const load = useCallback(async () => {
    try {
      const r = await getReviewQueueAction();
      setItems(r.ok ? r.data : []);
    } catch {
      setItems([]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  if (!items || (items.length === 0 && !note)) return null;
  return (
    <section className="space-y-3" aria-label="Work statements waiting for you">
      <h2 className="text-lg font-bold text-slate-900">Waiting for your review ({items.length})</h2>
      {note && (
        <p role="status" className={`text-sm ${note.kind === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>
          {note.text}
        </p>
      )}
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-900">
                <b>{it.ownerName}</b> · {monthTitle(it.month)} · <span className="text-xs text-slate-600">{it.step === 'verify' ? 'to verify' : 'to approve'}</span>
              </p>
              <button type="button" className={ghostCls} onClick={() => setOpen(open === it.id ? null : it.id)} aria-expanded={open === it.id}>
                {open === it.id ? 'Close' : 'Open'}
              </button>
            </div>
            {open === it.id && (
              <StatementReview
                id={it.id}
                onDone={(n) => {
                  setNote(n);
                  setOpen(null);
                  void load();
                }}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatementReview({ id, onDone }: { id: string; onDone: (n: Note) => void }) {
  const [d, setD] = useState<ReviewDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sign, setSign] = useState(false);
  const [returning, setReturning] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    let live = true;
    getStatementAction(id)
      .then((r) => {
        if (!live) return;
        if (r.ok) setD(r.data);
        else setError(r.error);
      })
      .catch(() => live && setError('Could not open the statement.'));
    return () => {
      live = false;
    };
  }, [id]);

  if (error) return <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>;
  if (!d) return <p className="mt-2 text-sm text-slate-500">Loading…</p>;

  const rows = buildRows(d.month, d.days);
  const sum = summarize(rows);

  const act = async (decision: 'forward' | 'return') => {
    setBusy(true);
    setError(null);
    try {
      const r = await reviewStatementAction(d.id, decision, note, sign && d.hasSignature);
      if (r.ok) onDone({ kind: 'ok', text: r.message ?? 'Done.' });
      else setError(r.error);
    } catch {
      setError('Something went wrong. Nothing was changed.');
    } finally {
      setBusy(false);
    }
  };
  const download = async () => {
    setBusy(true);
    try {
      const s = await getStatementSignaturesAction(d.id);
      await downloadStatementDocx(
        toDocData({ owner: d.owner, month: d.month, days: d.days, statement: d.statement, verifier: d.verifier, approver: d.approver, verifiedBy: d.verifiedBy, approvedBy: d.approvedBy, signatures: s.ok ? s.data : null }),
      );
    } catch {
      setError('The Word file could not be made. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs text-slate-600">
        {d.owner.designation ?? 'Staff'} · {STATUS_LABELS[d.statement.status]} · {sum.office} office, {sum.field} field, {sum.tour} tour, {sum.leave} leave, {sum.off} off ({sum.total} days)
      </p>
      <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-lg border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 sticky top-0">
            <tr className="text-left text-slate-500">
              <th className="p-2 font-semibold">Date</th>
              <th className="p-2 font-semibold">Where</th>
              <th className="p-2 font-semibold">What was done</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.date} className={r.dayType === 'off' ? 'text-slate-400' : ''}>
                <td className="p-2 whitespace-nowrap">{shortDate(r.date).slice(0, 6)} {r.weekday}</td>
                <td className="p-2">{r.dayType === null ? '-' : `${DAY_TYPE_LABELS[r.dayType]}${r.place && r.place !== DAY_TYPE_LABELS[r.dayType] ? ` · ${r.place}` : ''}`}</td>
                <td className="p-2 whitespace-pre-wrap break-words">{r.tasks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={ghostCls} disabled={busy} onClick={() => void download()}>
          <Download size={12} className="inline" /> Word file
        </button>
      </div>
      {d.myStep && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={sign && d.hasSignature} disabled={!d.hasSignature} onChange={(e) => setSign(e.target.checked)} />
            Add my saved signature {!d.hasSignature && <span className="text-xs text-slate-500">(optional; save one on this page first)</span>}
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnCls} disabled={busy} onClick={() => void act('forward')}>
              {d.myStep === 'verify' ? 'Verify' : 'Approve'}
            </button>
            <button type="button" className={ghostCls} disabled={busy} onClick={() => setReturning((v) => !v)}>
              Return for changes
            </button>
          </div>
          {returning && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600" htmlFor={`note-${d.id}`}>What should be changed?</label>
              <textarea id={`note-${d.id}`} className={inputCls} rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
              <button type="button" className={btnCls} disabled={busy || !note.trim()} onClick={() => void act('return')}>
                Send back
              </button>
            </div>
          )}
          <p className="text-[11px] text-slate-500">A signature is never required to {d.myStep === 'verify' ? 'verify' : 'approve'}.</p>
        </div>
      )}
    </div>
  );
}
