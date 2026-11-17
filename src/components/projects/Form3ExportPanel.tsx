'use client';

import { useState } from 'react';
import { textOf, type CharterText } from '@/lib/charter';
import { buildForm3Data, EMPTY_APPLICANT, type Form3Applicant, type Form3Data } from '@/lib/form3Export';
import { getBudgetAction } from '@/server/actions/budget';
import { getCharterAction } from '@/server/actions/charter';
import { getProjectAreasAction } from '@/server/actions/projectAreas';

const btnCls = 'px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';
const ghostCls = 'px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 disabled:opacity-50';
const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white';
const STORE_KEY = 'skb-form3-applicant';

const FIELDS: Array<{ key: keyof Form3Applicant; label: string; wide?: boolean }> = [
  { key: 'officialName', label: 'Official name of your organization' },
  { key: 'workName', label: 'Short name' },
  { key: 'address', label: 'Official address', wide: true },
  { key: 'phone', label: 'Phone' },
  { key: 'fax', label: 'Fax' },
  { key: 'email', label: 'E-mail' },
  { key: 'website', label: 'Website' },
  { key: 'managerName', label: 'Project manager' },
  { key: 'managerPhone', label: 'Project manager phone' },
  { key: 'managerEmail', label: 'Project manager e-mail' },
  { key: 'managerMobile', label: 'Project manager mobile' },
  { key: 'chairmanTitle', label: 'First signatory (title)' },
  { key: 'generalManagerName', label: 'General Manager / Secretary full name' },
];

const loadApplicant = (): Form3Applicant => {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) return { ...EMPTY_APPLICANT, ...(JSON.parse(raw) as Partial<Form3Applicant>) };
  } catch {
    /* storage can be unavailable; the form just starts with the defaults */
  }
  return EMPTY_APPLICANT;
};

type Loaded = { facts: NonNullable<Parameters<typeof buildForm3Data>[0]['facts']>; charter: CharterText | null; areas: Parameters<typeof buildForm3Data>[0]['areas']; items: Parameters<typeof buildForm3Data>[0]['items']; settings: Parameters<typeof buildForm3Data>[0]['settings'] };

/** Makes the donor's Form 3 (Word) from the project's areas, charter and budget. Section 1 and the signatories are typed here. */
export function Form3ExportPanel({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [applicant, setApplicant] = useState<Form3Applicant>(EMPTY_APPLICANT);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setOpen(true);
    setError(null);
    setApplicant(loadApplicant());
    const [c, b, a] = await Promise.all([getCharterAction(projectId), getBudgetAction(projectId), getProjectAreasAction(projectId)]);
    if (!c.ok || !b.ok || !a.ok) {
      setError('Could not load the project. Please refresh the page and try again.');
      return;
    }
    const latest = c.data.versions[0];
    setLoaded({ facts: c.data.facts, charter: latest ? (textOf(latest) as CharterText) : null, areas: a.data.areas, items: b.data.items, settings: b.data.settings });
  };

  const data: Form3Data | null = loaded ? buildForm3Data({ applicant, ...loaded }) : null;

  const gaps: string[] = [];
  if (loaded && data) {
    if (!loaded.charter) gaps.push('The charter is empty, so the description, objectives and risks boxes will be blank.');
    if (loaded.areas.length === 0) gaps.push('No areas are entered, so the area table will be empty.');
    gaps.push(...data.cost.notes);
    if (!loaded.facts.donorName) gaps.push('The project has no donor name; the form will say "the donor".');
    if (!loaded.facts.startDate || !loaded.facts.endDate) gaps.push('The project has no start or end date, so the duration will be blank.');
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
      const { buildForm3Docx } = await import('@/lib/form3Docx');
      const blob = await buildForm3Docx(data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Form-3-${loaded?.facts.code ?? 'project'}.docx`;
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

  return (
    <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Make the donor Form 3 (Word)</h2>
          <p className="text-sm text-slate-600">Fills the Form 3 from this project&apos;s areas, charter and budget. You can edit the Word file afterwards.</p>
        </div>
        {!open && (
          <button type="button" className={btnCls} onClick={() => void start()}>
            Prepare Form 3
          </button>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {open && loaded && data && (
        <div className="space-y-4">
          {gaps.length > 0 && (
            <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-1">
              <p className="font-bold">Not complete yet (you can still download; these parts will be blank):</p>
              <ul className="list-disc pl-5 space-y-1">
                {gaps.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-sm text-slate-700">
            Project: <span className="font-semibold">{loaded.facts.title}</span>. Total cost {data.project.totalCostText || '—'}, requested {data.project.requestedText || '—'}, {data.areas.length} area(s), {data.cost.rows.length} cost line(s).
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <label key={f.key} className={`block text-sm ${f.wide ? 'sm:col-span-2' : ''}`}>
                <span className="text-xs font-semibold text-slate-600">{f.label}</span>
                <input className={inputCls} maxLength={300} value={applicant[f.key]} onChange={(e) => setApplicant({ ...applicant, [f.key]: e.target.value })} />
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500">These details are remembered on this computer only, for next time.</p>
          <div className="flex gap-2">
            <button type="button" className={btnCls} disabled={busy} onClick={() => void download()}>
              {busy ? 'Making the file…' : 'Download Form 3 (.docx)'}
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
