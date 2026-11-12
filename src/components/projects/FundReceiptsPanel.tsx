'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Pencil, Trash2 } from 'lucide-react';
import {
  ACK_LABELS,
  ACK_STATUSES,
  emptyReceiptForm,
  formatDate,
  formatMoney,
  totalReceipts,
  type FundReceiptData,
  type FundReceiptFormValues,
} from '@/lib/fundReceipts';
import {
  addFundReceiptAction,
  deleteFundReceiptAction,
  generateReceiptLetterAction,
  getFundReceiptsAction,
  setAckStatusAction,
  updateFundReceiptAction,
} from '@/server/actions/fundReceipts';

type Note = { kind: 'ok' | 'error'; text: string } | null;

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white';
const labelCls = 'block text-xs font-bold text-slate-600 mb-1';
const btnCls = 'px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';

function downloadPdf(filename: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Fund receipts tab: each transfer from the donor, the total received, and the acknowledgement letter. */
export function FundReceiptsPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<FundReceiptData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<FundReceiptFormValues | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await getFundReceiptsAction(projectId);
      if (r.ok) {
        setData(r.data);
        setLoadError(null);
        setForm((f) => f ?? emptyReceiptForm(r.data.currency, r.data.donorName));
      } else {
        setLoadError(r.error);
      }
    } catch {
      setLoadError('Could not reach the server. Reload the page (Ctrl+F5) and try again.');
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(
    () => (data ? totalReceipts(data.receipts, data.currency, data.donorAmount) : null),
    [data],
  );

  async function run(action: () => Promise<{ ok: boolean; error?: string; message?: string }>, after?: () => void) {
    setBusy(true);
    setNote(null);
    try {
      const r = await action();
      if (r.ok) {
        if (r.message) setNote({ kind: 'ok', text: r.message });
        after?.();
        await load();
      } else {
        setNote({ kind: 'error', text: r.error ?? 'Something went wrong.' });
      }
    } catch {
      setNote({ kind: 'error', text: 'Could not reach the server. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  if (loadError && !data) {
    return (
      <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
        <p role="alert" className="text-sm text-red-700">{loadError}</p>
        <button className={btnCls} onClick={() => { setLoadError(null); load(); }}>Try again</button>
      </section>
    );
  }
  if (!data || !totals || !form) return <p className="text-sm text-slate-500">Loading the fund receipts…</p>;

  const reset = () => {
    setEditingId(null);
    setForm(emptyReceiptForm(data.currency, data.donorName));
  };

  const makeLetter = async (id: string) => {
    setBusy(true);
    setNote(null);
    try {
      const r = await generateReceiptLetterAction(projectId, id);
      if (r.ok) downloadPdf(r.data.filename, r.data.base64);
      else setNote({ kind: 'error', text: r.error });
    } catch {
      setNote({ kind: 'error', text: 'Could not make the letter. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {data.closed && (
        <p className="text-sm bg-slate-100 border border-slate-200 rounded-xl p-3">This project is closed. Its fund receipts can no longer be changed.</p>
      )}
      {note && (
        <p role={note.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${note.kind === 'error' ? 'text-red-700' : 'text-green-700'}`}>
          {note.text}
        </p>
      )}

      <section className="bg-white p-5 rounded-2xl border border-slate-200">
        <h2 className="text-sm font-bold mb-3">Received so far</h2>
        <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-sm max-w-md">
          <dt>Donor amount</dt>
          <dd className="text-right">{data.donorAmount === null ? '—' : `${data.currency} ${formatMoney(Math.round(data.donorAmount * 100))}`}</dd>
          <dt className="font-bold">Received ({data.currency})</dt>
          <dd className="text-right font-bold">{data.currency} {formatMoney(totals.receivedCents)}</dd>
          <dt>Still to receive</dt>
          <dd className="text-right">{totals.remainingCents === null ? '—' : `${data.currency} ${formatMoney(totals.remainingCents)}`}</dd>
        </dl>
        {totals.remainingCents !== null && totals.remainingCents < 0 && (
          <p className="mt-3 text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3">
            More has been recorded than the donor amount on the project. Please check the receipts.
          </p>
        )}
        {totals.otherCurrencies.length > 0 && (
          <p className="mt-3 text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3">
            Some receipts are in another currency ({totals.otherCurrencies.join(', ')}); they are not counted in the total above.
          </p>
        )}
      </section>

      <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 overflow-x-auto">
        <h2 className="text-sm font-bold">Transfers</h2>
        {data.receipts.length === 0 ? (
          <p className="text-sm text-slate-500">No transfer recorded yet.</p>
        ) : (
          <table className="w-full text-sm block lg:table">
            <thead className="hidden lg:table-header-group">
              <tr className="text-left text-[11px] uppercase text-slate-500">
                <th className="pb-1 pr-2">Date</th>
                <th className="pb-1 pr-2 text-right">Amount</th>
                <th className="pb-1 pr-2">Bank reference</th>
                <th className="pb-1 pr-2">Acknowledgement letter</th>
                <th className="pb-1" />
              </tr>
            </thead>
            <tbody className="block lg:table-row-group">
              {data.receipts.map((r) => (
                <tr key={r.id} className="block lg:table-row border-t border-slate-100 align-top py-2 lg:py-0">
                  <td data-label="Date" className="block lg:table-cell py-1 lg:py-2 pr-2 whitespace-nowrap before:content-[attr(data-label)] before:block before:text-[10px] before:font-bold before:uppercase before:text-slate-400 before:mb-0.5 lg:before:hidden">{formatDate(r.receivedOn)}</td>
                  <td data-label="Amount" className="block lg:table-cell py-1 lg:py-2 pr-2 lg:text-right whitespace-nowrap before:content-[attr(data-label)] before:block before:text-[10px] before:font-bold before:uppercase before:text-slate-400 before:mb-0.5 lg:before:hidden">{r.currency} {formatMoney(Math.round(r.amount * 100))}</td>
                  <td data-label="Bank reference" className="block lg:table-cell py-1 lg:py-2 pr-2 break-words before:content-[attr(data-label)] before:block before:text-[10px] before:font-bold before:uppercase before:text-slate-400 before:mb-0.5 lg:before:hidden">
                    {r.reference ?? '—'}
                    {r.note && <div className="text-xs text-slate-500">{r.note}</div>}
                  </td>
                  <td data-label="Acknowledgement letter" className="block lg:table-cell py-1 lg:py-2 pr-2 before:content-[attr(data-label)] before:block before:text-[10px] before:font-bold before:uppercase before:text-slate-400 before:mb-0.5 lg:before:hidden">
                    {data.canRecord ? (
                      <select
                        aria-label={`Letter status for ${formatDate(r.receivedOn)}`}
                        className="px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white"
                        value={r.ackStatus}
                        disabled={busy}
                        onChange={(e) => run(() => setAckStatusAction(projectId, r.id, e.target.value))}
                      >
                        {ACK_STATUSES.map((s) => <option key={s} value={s}>{ACK_LABELS[s]}</option>)}
                      </select>
                    ) : (
                      ACK_LABELS[r.ackStatus]
                    )}
                  </td>
                  <td className="block lg:table-cell py-1 lg:py-2 lg:text-right whitespace-nowrap">
                    {data.canRecord && (
                      <>
                        <button aria-label="Make acknowledgement letter (PDF)" title="Make acknowledgement letter (PDF)" className="p-1.5 text-slate-500 hover:text-slate-900" disabled={busy} onClick={() => makeLetter(r.id)}>
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          aria-label="Edit receipt"
                          className="p-1.5 text-slate-500 hover:text-slate-900"
                          onClick={() => {
                            setEditingId(r.id);
                            setForm({
                              receivedOn: r.receivedOn,
                              amount: String(r.amount),
                              currency: r.currency,
                              reference: r.reference ?? '',
                              fromName: r.fromName ?? '',
                              note: r.note ?? '',
                            });
                            setNote(null);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    {data.canDelete && (
                      <button
                        aria-label="Remove receipt"
                        className="p-1.5 text-slate-500 hover:text-red-700"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm(`Remove the receipt of ${r.currency} ${formatMoney(Math.round(r.amount * 100))} on ${formatDate(r.receivedOn)}?`)) {
                            run(() => deleteFundReceiptAction(projectId, r.id));
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-xs text-slate-500">
          The letter is made as a PDF to print, sign by hand and scan. Update its status here as it goes out and comes back.
        </p>
      </section>

      {data.canRecord && (
        <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
          <h2 className="text-sm font-bold">{editingId ? 'Edit transfer' : 'Record a transfer'}</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls} htmlFor="f-date">Date received</label>
              <input id="f-date" type="date" className={inputCls} value={form.receivedOn} onChange={(e) => setForm({ ...form, receivedOn: e.target.value })} />
            </div>
            <div>
              <label className={labelCls} htmlFor="f-amount">Amount</label>
              <input id="f-amount" className={inputCls} inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className={labelCls} htmlFor="f-cur">Currency</label>
              <input id="f-cur" className={inputCls} maxLength={3} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <label className={labelCls} htmlFor="f-ref">Bank reference (optional)</label>
              <input id="f-ref" className={inputCls} value={form.reference ?? ''} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </div>
            <div>
              <label className={labelCls} htmlFor="f-from">Received from</label>
              <input id="f-from" className={inputCls} value={form.fromName ?? ''} onChange={(e) => setForm({ ...form, fromName: e.target.value })} />
            </div>
            <div>
              <label className={labelCls} htmlFor="f-note">Note (optional)</label>
              <input id="f-note" className={inputCls} value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className={btnCls}
              disabled={busy}
              onClick={() =>
                run(() => (editingId ? updateFundReceiptAction(projectId, editingId, form) : addFundReceiptAction(projectId, form)), reset)
              }
            >
              {editingId ? 'Save' : 'Record transfer'}
            </button>
            {editingId && (
              <button className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300" onClick={reset}>
                Cancel
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
