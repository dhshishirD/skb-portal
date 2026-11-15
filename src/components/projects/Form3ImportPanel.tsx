'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_DOCX_BYTES, readDocxTables } from '@/lib/docxTables';
import { parseForm3, type Form3Parsed } from '@/lib/form3Import';
import { emptyCharterText, textOf, type CharterFieldKey } from '@/lib/charter';
import { addBudgetItemAction, getBudgetAction } from '@/server/actions/budget';
import { getCharterAction, saveCharterVersionAction } from '@/server/actions/charter';
import { addProjectAreaAction, getProjectAreasAction } from '@/server/actions/projectAreas';

const btnCls = 'px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';
const ghostCls = 'px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 disabled:opacity-50';

type Existing = { areas: number; budgetItems: number; charter: Record<CharterFieldKey, string> | null; canWriteCharter: boolean; canEditBudget: boolean; canWriteAreas: boolean; closed: boolean };

const CHARTER_LABEL: Record<string, string> = {
  background: 'Background and need',
  objectives: 'Objectives',
  scopeIn: 'In scope',
  risks: 'Risks and assumptions',
  team: 'Team and roles',
};

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

/** Import the written parts of a donor Form 3 (.docx). Shows what was found first; nothing is saved until "Import selected". */
export function Form3ImportPanel({ projectId }: { projectId: string }) {
  const [existing, setExisting] = useState<Existing | null>(null);
  const [parsed, setParsed] = useState<Form3Parsed | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState({ areas: true, charter: true, budget: true });
  const inputRef = useRef<HTMLInputElement>(null);

  const loadExisting = useCallback(async () => {
    const [a, b, c] = await Promise.all([getProjectAreasAction(projectId), getBudgetAction(projectId), getCharterAction(projectId)]);
    const latest = c.ok ? c.data.versions[0] : undefined;
    setExisting({
      areas: a.ok ? a.data.areas.length : 0,
      budgetItems: b.ok ? b.data.items.length : 0,
      charter: latest ? (textOf(latest) as Record<CharterFieldKey, string>) : c.ok ? (emptyCharterText() as Record<CharterFieldKey, string>) : null,
      canWriteCharter: c.ok && c.data.canWrite,
      canEditBudget: b.ok && b.data.canEdit,
      canWriteAreas: a.ok && a.data.canWrite,
      closed: (a.ok && a.data.closed) || (c.ok && c.data.closed),
    });
  }, [projectId]);

  useEffect(() => {
    void loadExisting();
  }, [loadExisting]);

  if (!existing) return null;
  if (existing.closed || !(existing.canWriteAreas || existing.canWriteCharter || existing.canEditBudget)) return null;

  const onFile = async (file: File | undefined) => {
    setError(null);
    setResults([]);
    setParsed(null);
    if (!file) return;
    if (!/\.docx$/i.test(file.name)) {
      setError('Please choose a Word file that ends in .docx. (An old .doc file: open it in Word and use Save As .docx.)');
      return;
    }
    if (file.size > MAX_DOCX_BYTES) {
      setError('This file is too big (5 MB at most).');
      return;
    }
    try {
      const tables = await readDocxTables(await file.arrayBuffer());
      const p = parseForm3(tables);
      if (!p.areas.length && !Object.keys(p.charter).length && !p.budget.lines.length) {
        setError('Nothing could be read from this file. It may be an empty form, or not a Form 3.');
        return;
      }
      setFileName(file.name);
      setParsed(p);
      setPick({ areas: existing.areas === 0 && p.areas.length > 0, charter: Object.keys(p.charter).length > 0, budget: existing.budgetItems === 0 && p.budget.lines.length > 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'This file could not be read.');
    }
  };

  /** Fields that will be filled: only those that are still empty in the current charter. */
  const charterPlan = parsed
    ? (Object.entries(parsed.charter) as Array<[CharterFieldKey, string]>).map(([key, text]) => ({
        key,
        text,
        fill: !existing.charter || !existing.charter[key]?.trim(),
      }))
    : [];

  const run = async () => {
    if (!parsed) return;
    setBusy(true);
    const out: string[] = [];
    try {
      if (pick.areas && existing.areas === 0 && existing.canWriteAreas) {
        let ok = 0;
        for (const a of parsed.areas) {
          const r = await addProjectAreaAction(projectId, {
            region: a.region,
            cities: a.cities ?? '',
            villages: a.villages ?? '',
            itemQuantity: a.itemQuantity === null ? '' : String(a.itemQuantity),
            itemUnit: '',
            families: a.families === null ? '' : String(a.families),
          });
          if (!r.ok) {
            out.push(`Areas: stopped after ${ok} of ${parsed.areas.length}. ${r.error}`);
            break;
          }
          ok += 1;
        }
        if (ok === parsed.areas.length) out.push(`Areas: ${ok} added.`);
      }
      if (pick.charter && existing.canWriteCharter) {
        const base = existing.charter ?? (emptyCharterText() as Record<CharterFieldKey, string>);
        const next = { ...base };
        let filled = 0;
        for (const f of charterPlan) {
          if (f.fill) {
            next[f.key] = f.text;
            filled += 1;
          }
        }
        if (filled === 0) out.push('Charter: nothing to add, the parts are already written.');
        else {
          const r = await saveCharterVersionAction(projectId, { ...next, changeNote: `Imported from Form 3 (${fileName})`.slice(0, 500) });
          out.push(r.ok ? `Charter: ${filled} part(s) saved as a new draft version. Please read it and ask the Executive Director to approve.` : `Charter: ${r.error}`);
        }
      }
      if (pick.budget && existing.budgetItems === 0 && existing.canEditBudget) {
        let ok = 0;
        for (const l of parsed.budget.lines) {
          const r = await addBudgetItemAction(projectId, {
            kind: 'one_off',
            groupName: '',
            name: l.name.slice(0, 200),
            measure: 'Pcs',
            quantity: String(l.quantity),
            unitPriceBdt: String(l.unitPriceLocal),
          });
          if (!r.ok) {
            out.push(`Budget: stopped after ${ok} of ${parsed.budget.lines.length}. ${r.error}`);
            break;
          }
          ok += 1;
        }
        if (ok === parsed.budget.lines.length) out.push(`Budget: ${ok} lines added (one-off).`);
      }
      if (out.length === 0) out.push('Nothing was selected to import.');
      setResults(out);
      setParsed(null);
      if (inputRef.current) inputRef.current.value = '';
      await loadExisting();
    } catch {
      setResults([...out, 'Something went wrong. Please check the project pages and try again.']);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900">Import from a donor Form 3</h2>
        <p className="text-sm text-slate-600">
          Choose the filled-in Form 3 (Word, .docx). You will see what was found first; nothing is saved until you press Import. The file is read in your browser and is not uploaded.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input ref={inputRef} type="file" accept=".docx" onChange={(e) => void onFile(e.target.files?.[0])} className="text-sm" aria-label="Form 3 Word file" />
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {results.length > 0 && (
        <div role="status" className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1">
          {results.map((r) => (
            <p key={r}>{r}</p>
          ))}
          <button type="button" className={ghostCls} onClick={() => window.location.reload()}>Reload to see the changes</button>
        </div>
      )}

      {parsed && (
        <div className="space-y-4">
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {[
              ['Project name in the form', parsed.title],
              ['Total cost', parsed.totalCost],
              ['Amount requested', parsed.requested],
              ['Duration', parsed.duration],
              ['Project manager', parsed.manager],
            ].map(([k, v]) => (
              <div key={k as string}>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{k}</dt>
                <dd className="text-slate-900">{v || '—'}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-slate-500">These facts are only shown for checking. They are not changed on the project. Use Edit on this page to change them.</p>

          {parsed.warnings.length > 0 && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 space-y-1">
              <p className="font-bold">Please check these before you import:</p>
              <ul className="list-disc pl-5 space-y-1">
                {parsed.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={pick.areas} disabled={existing.areas > 0 || parsed.areas.length === 0 || !existing.canWriteAreas} onChange={(e) => setPick({ ...pick, areas: e.target.checked })} />
            <span>
              <span className="font-semibold">Areas</span>: {parsed.areas.length} row(s) found
              {existing.areas > 0 && <span className="text-slate-500"> (this project already has {existing.areas}; not changed)</span>}
            </span>
          </label>
          {parsed.areas.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border border-slate-200 rounded-lg">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    {['Region', 'City', 'Village', 'Items', 'Families'].map((h) => (
                      <th key={h} className="text-left px-2 py-1.5 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.areas.map((a, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">{a.region}</td>
                      <td className="px-2 py-1.5">{a.cities ?? '—'}</td>
                      <td className="px-2 py-1.5">{a.villages ?? '—'}</td>
                      <td className="px-2 py-1.5">{a.itemQuantity === null ? '—' : fmt(a.itemQuantity)}</td>
                      <td className="px-2 py-1.5">{a.families === null ? '—' : fmt(a.families)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={pick.charter} disabled={charterPlan.length === 0 || !existing.canWriteCharter} onChange={(e) => setPick({ ...pick, charter: e.target.checked })} />
            <span>
              <span className="font-semibold">Charter</span>: saved as a new draft version. Only parts that are still empty are filled.
            </span>
          </label>
          <ul className="text-xs text-slate-700 space-y-1 pl-6">
            {charterPlan.map((f) => (
              <li key={f.key}>
                <span className="font-semibold">{CHARTER_LABEL[f.key] ?? f.key}</span>
                {f.fill ? ' will be filled: ' : ' already has text, kept as it is: '}
                <span className="text-slate-500">{f.text.replace(/\s+/g, ' ').slice(0, 110)}{f.text.length > 110 ? '…' : ''}</span>
              </li>
            ))}
          </ul>

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={pick.budget} disabled={existing.budgetItems > 0 || parsed.budget.lines.length === 0 || !existing.canEditBudget} onChange={(e) => setPick({ ...pick, budget: e.target.checked })} />
            <span>
              <span className="font-semibold">Budget lines</span>: {parsed.budget.lines.length} found, prices in BDT, added as one-off lines. The administration cost is worked out by the Budget tab.
              {existing.budgetItems > 0 && <span className="text-slate-500"> (this project already has {existing.budgetItems} lines; not changed)</span>}
            </span>
          </label>
          {parsed.budget.lines.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border border-slate-200 rounded-lg">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    {['Item', 'Quantity', 'Unit price (BDT)', 'Total (BDT)'].map((h) => (
                      <th key={h} className="text-left px-2 py-1.5 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.budget.lines.map((l, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">{l.name}</td>
                      <td className="px-2 py-1.5">{fmt(l.quantity)}</td>
                      <td className="px-2 py-1.5">{fmt(l.unitPriceLocal)}</td>
                      <td className="px-2 py-1.5">{fmt(l.totalLocal ?? l.quantity * l.unitPriceLocal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnCls} disabled={busy || !(pick.areas || pick.charter || pick.budget)} onClick={() => void run()}>
              {busy ? 'Importing…' : 'Import selected'}
            </button>
            <button type="button" className={ghostCls} disabled={busy} onClick={() => { setParsed(null); if (inputRef.current) inputRef.current.value = ''; }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
