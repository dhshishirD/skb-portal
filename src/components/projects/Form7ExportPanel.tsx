'use client';

import { useState } from 'react';
import { textOf, type CharterText } from '@/lib/charter';
import { type Form3Applicant } from '@/lib/form3Export';
import { buildForm7Data, type Form7Data } from '@/lib/form7Export';
import { getBudgetAction } from '@/server/actions/budget';
import { getCharterAction } from '@/server/actions/charter';
import { getForm7ActualsAction } from '@/server/actions/form7Actuals';
import { getProjectAreasAction } from '@/server/actions/projectAreas';
import { FIELDS, loadApplicant, STORE_KEY } from './Form3ExportPanel';

const btnCls = 'px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';
const ghostCls = 'px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 disabled:opacity-50';
const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white';

type Input = Parameters<typeof buildForm7Data>[0];
type Loaded = Omit<Input, 'applicant'>;

/** Makes the donor's Form 7 (project feedback report, Word) from the project's budget and real spending. */
export function Form7ExportPanel({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [applicant, setApplicant] = useState<Form3Applicant>(loadApplicant());
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setOpen(true);
    setError(null);
    setApplicant(loadApplicant());
    const [c, b, a, x] = await Promise.all([getCharterAction(projectId), getBudgetAction(projectId), getProjectAreasAction(projectId), getForm7ActualsAction(projectId)]);
    if (!x.ok) {
      setError(x.error);
      return;
    }
    if (!c.ok || !b.ok || !a.ok) {
      setError('Could not load the project. Please refresh the page and try again.');
      return;
    }
    const latest = c.data.versions[0];
    setLoaded({
      facts: c.data.facts,
      charter: latest ? (textOf(latest) as CharterText) : null,
      areas: a.data.areas,
      items: b.data.items,
      settings: b.data.settings,
      claims: x.data.claims,
      orders: x.data.orders,
      receipts: x.data.receipts,
    });
  };

  const data: Form7Data | null = loaded ? buildForm7Data({ applicant, ...loaded }) : null;
  const gaps: string[] = [];
  if (loaded && data) {
    if (!loaded.charter) gaps.push('The charter is empty, so the description, objectives and risks boxes will be blank.');
    if (loaded.areas.length === 0) gaps.push('No areas are entered, so the area table will be empty.');
    if (!loaded.facts.startDate || !loaded.facts.endDate) gaps.push('The project has no start or end date.');
    gaps.push(...data.notes);
  }

  const download = async () => {
    if (!data) return;
    setBusy(true);
    setError(null);
    try {
      try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(applicant));
      } catch {
        /* optional convenience */
      }
      const { buildForm7Docx } = await import('@/lib/form7Docx');
      const blob = await buildForm7Docx(data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Form-7-${loaded?.facts.code ?? 'project'}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('The Word file could not be made. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (hidden) return null;
  return (
    <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Make the donor Form 7 report (Word)</h2>
          <p className="text-sm text-slate-600">Fills the feedback report from the budget, the approved expenses, purchase orders and the money received. Only for Executive Director, Programme Manager, Project Officer and Finance.</p>
        </div>
        {!open && (
          <button type="button" className={btnCls} onClick={() => void start()}>
            Prepare Form 7
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}{' '}
          <button type="button" className="underline font-semibold" onClick={() => setHidden(true)}>Hide</button>
        </p>
      )}
      {open && loaded && data && (
        <div className="space-y-4">
          {gaps.length > 0 && (
            <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-1">
              <p className="font-bold">Please read (you can still download):</p>
              <ul className="list-disc pl-5 space-y-1">
                {gaps.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-sm text-slate-700">
            Project: <span className="font-semibold">{loaded.facts.title}</span>. {data.invoices.length} expense line(s), total spent {data.totalExpenditureText || '—'}, received {data.fundsReceivedText || '—'}, unspent {data.unspentText || '—'}.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <label key={f.key} className={`block text-sm ${f.wide ? 'sm:col-span-2' : ''}`}>
                <span className="text-xs font-semibold text-slate-600">{f.label}</span>
                <input className={inputCls} maxLength={300} value={applicant[f.key]} onChange={(e) => setApplicant({ ...applicant, [f.key]: e.target.value })} />
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" className={btnCls} disabled={busy} onClick={() => void download()}>
              {busy ? 'Making the file…' : 'Download Form 7 (.docx)'}
            </button>
            <button type="button" className={ghostCls} onClick={() => { setOpen(false); setLoaded(null); }}>
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
