'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, FileDown, Info } from 'lucide-react';
import type { Form7Check } from '@/lib/form7Checks';
import {
  REPORT_FIELDS,
  allChecked,
  countChecked,
  type ClosingData,
  type ReportText,
} from '@/lib/closing';
import {
  generateForm7Action,
  getClosingAction,
  getForm7ChecksAction,
  saveClosingReportAction,
  setClosingCheckAction,
  setClosingSignOffAction,
} from '@/server/actions/closing';

type Note = { kind: 'ok' | 'error'; text: string } | null;

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white disabled:bg-slate-50';
const btnCls = 'px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';
const btn2Cls = 'px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 bg-white disabled:opacity-50';

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

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric' });

/** Closing & Form-7 tab: write the Form-7 sections, tick the closing checklist, sign off, make the PDF. */
export function ClosingPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<ClosingData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState<ReportText | null>(null);
  const [families, setFamilies] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState<Form7Check[] | null>(null);

  const load = useCallback(
    async (resetForm: boolean) => {
      try {
        const r = await getClosingAction(projectId);
        if (r.ok) {
          setData(r.data);
          setLoadError(null);
          if (r.data.canExport) {
            const c = await getForm7ChecksAction(projectId);
            setChecks(c.ok ? c.data : null);
          }
          if (resetForm) {
            setText(r.data.report);
            setFamilies(r.data.familiesCount === null ? '' : String(r.data.familiesCount));
          }
        } else setLoadError(r.error);
      } catch {
        setLoadError('Could not reach the server. Reload the page (Ctrl+F5) and try again.');
      }
    },
    [projectId],
  );

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function run(action: () => Promise<{ ok: boolean; error?: string; message?: string }>, resetForm = false) {
    setBusy(true);
    setNote(null);
    try {
      const r = await action();
      if (r.ok) {
        setNote({ kind: 'ok', text: r.message ?? 'Done.' });
        await load(resetForm);
      } else setNote({ kind: 'error', text: r.error ?? 'Something went wrong.' });
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
        <button className={btnCls} onClick={() => { setLoadError(null); load(true); }}>Try again</button>
      </section>
    );
  }
  if (!data || !text) return <p className="text-sm text-slate-500">Loading the closing page…</p>;

  const signedOff = !!data.signedOffAt;
  const done = countChecked(data.items);
  const changed =
    REPORT_FIELDS.some((f) => text[f.key].trim() !== data.report[f.key].trim()) ||
    families.trim() !== (data.familiesCount === null ? '' : String(data.familiesCount));

  const makePdf = async () => {
    setBusy(true);
    setNote(null);
    try {
      const r = await generateForm7Action(projectId);
      if (r.ok) {
        downloadPdf(r.data.filename, r.data.base64);
        setNote({ kind: 'ok', text: 'Form-7 downloaded. Print it, sign it, scan it and upload the scan in Documents.' });
      } else setNote({ kind: 'error', text: r.error });
    } catch {
      setNote({ kind: 'error', text: 'Could not make Form-7. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {data.closed && <p className="text-sm bg-slate-100 border border-slate-200 rounded-xl p-3">This project is closed. The closing report can no longer be changed.</p>}
      {signedOff && !data.closed && (
        <p className="text-sm bg-green-50 border border-green-200 rounded-xl p-3">
          Signed off{data.signedOffByName ? ` by ${data.signedOffByName}` : ''} on {fmt(data.signedOffAt!)}. The text and the checklist are locked until the Executive Director reopens the report.
        </p>
      )}
      {note && (
        <p role={note.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${note.kind === 'error' ? 'text-red-700' : 'text-green-700'}`}>{note.text}</p>
      )}

      <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
        <div>
          <h2 className="text-sm font-bold">Form-7 text</h2>
          <p className="text-xs text-slate-500">
            The numbers in Form-7 (families, women, men, girls, boys, budget, fund received) are taken from the Beneficiaries, Budget and Fund receipts tabs when you make the PDF.
            Do not write names or ID numbers here.
          </p>
        </div>
        {REPORT_FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={`cl-${f.key}`} className="block text-xs font-bold text-slate-600 mb-1">{f.label}</label>
            <textarea
              id={`cl-${f.key}`}
              rows={f.max <= 2000 ? 3 : 5}
              maxLength={f.max}
              disabled={!data.canWrite || busy}
              className={inputCls}
              value={text[f.key]}
              onChange={(e) => setText({ ...text, [f.key]: e.target.value })}
            />
            <p className="text-[11px] text-slate-500">{f.hint} ({text[f.key].length}/{f.max})</p>
          </div>
        ))}
        <div>
          <label htmlFor="cl-families" className="block text-xs font-bold text-slate-600 mb-1">Number of families (optional)</label>
          <input id="cl-families" inputMode="numeric" disabled={!data.canWrite || busy} className={`${inputCls} sm:w-48`} value={families} onChange={(e) => setFamilies(e.target.value.replace(/[^0-9]/g, ''))} />
          <p className="text-[11px] text-slate-500">Leave empty to use the project&apos;s beneficiary target. The people counts (women, men, girls, boys) come from the Beneficiaries tab.</p>
        </div>
        {data.canWrite && (
          <div className="flex items-center gap-3">
            <button className={btnCls} disabled={busy || !changed} onClick={() => run(() => saveClosingReportAction(projectId, { ...text, familiesCount: families }), true)}>Save text</button>
            {changed && <span className="text-xs text-amber-700">Unsaved changes</span>}
            {data.updatedAt && !changed && (
              <span className="text-xs text-slate-500">Last saved {fmt(data.updatedAt)}{data.updatedByName ? ` by ${data.updatedByName}` : ''}</span>
            )}
          </div>
        )}
      </section>

      <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
        <div>
          <h2 className="text-sm font-bold">Closing checklist ({done} of {data.items.length} done)</h2>
          <p className="text-xs text-slate-500">Tick an item when it is really finished. You can add a short note and link the document that proves it.</p>
        </div>
        <ul className="divide-y divide-slate-100">
          {data.items.map((i) => (
            <li key={i.key} className="py-2.5 space-y-1.5">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id={`ck-${i.key}`}
                  className="mt-0.5"
                  checked={!!i.checked}
                  disabled={!data.canWrite || busy}
                  onChange={(e) =>
                    run(() => setClosingCheckAction(projectId, i.key, e.target.checked, notes[i.key], docs[i.key] || null))
                  }
                />
                <label htmlFor={`ck-${i.key}`} className="text-sm">{i.label}</label>
              </div>
              {i.checked ? (
                <p className="ml-6 text-xs text-slate-500">
                  Ticked{i.checked.byName ? ` by ${i.checked.byName}` : ''} on {fmt(i.checked.at)}
                  {i.checked.note ? ` — ${i.checked.note}` : ''}
                  {i.checked.documentTitle ? ` — document: ${i.checked.documentTitle}` : ''}
                </p>
              ) : (
                data.canWrite && (
                  <div className="ml-6 flex flex-wrap gap-2">
                    <input
                      aria-label={`Note for ${i.label}`}
                      className={`${inputCls} sm:w-64`}
                      maxLength={300}
                      placeholder="Note (optional)"
                      value={notes[i.key] ?? ''}
                      onChange={(e) => setNotes({ ...notes, [i.key]: e.target.value })}
                    />
                    <select
                      aria-label={`Document for ${i.label}`}
                      className={`${inputCls} sm:w-64`}
                      value={docs[i.key] ?? ''}
                      onChange={(e) => setDocs({ ...docs, [i.key]: e.target.value })}
                    >
                      <option value="">No linked document</option>
                      {data.documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                    </select>
                  </div>
                )
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
        <h2 className="text-sm font-bold">Sign-off and Form-7 PDF</h2>
        {checks && checks.length === 0 && <p className="text-xs text-emerald-700">Form-7 check: nothing to fix. The numbers are ready.</p>}
        {checks && checks.length > 0 && (
          <div className="rounded-xl border border-slate-200 p-3 space-y-1.5" aria-label="Form-7 check">
            <p className="text-xs font-bold">Form-7 check</p>
            <ul className="space-y-1">
              {checks.map((c) => (
                <li key={c.code} className={`flex gap-2 text-xs ${c.level === 'stop' ? 'text-red-700' : 'text-amber-700'}`}>
                  {c.level === 'stop' ? <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden /> : <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />}
                  <span><strong>{c.level === 'stop' ? 'Fix first: ' : 'Check: '}</strong>{c.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {data.canExport && (
            <button className={btn2Cls} disabled={busy} onClick={makePdf}>
              <FileDown className="inline h-3.5 w-3.5 mr-1" aria-hidden />Make Form-7 PDF
            </button>
          )}
          {data.canSignOff && !signedOff && (
            <button className={btnCls} disabled={busy || !allChecked(data.items) || changed} onClick={() => run(() => setClosingSignOffAction(projectId, true))}>
              Sign off (Executive Director)
            </button>
          )}
          {data.canSignOff && signedOff && (
            <button className={btn2Cls} disabled={busy} onClick={() => run(() => setClosingSignOffAction(projectId, false))}>Reopen for changes</button>
          )}
        </div>
        {data.canSignOff && !signedOff && !allChecked(data.items) && <p className="text-xs text-slate-500">Sign-off is available when every checklist item is ticked.</p>}
        {!data.canSignOff && !signedOff && <p className="text-xs text-slate-500">Only the Executive Director signs off the closing report.</p>}
      </section>
    </div>
  );
}
