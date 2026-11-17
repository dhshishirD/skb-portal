'use client';

import { useRef, useState } from 'react';
import { parseCosting, type CostingParsed } from '@/lib/costingImport';
import { MAX_XLSX_BYTES, readXlsxSheets, type SheetGrid } from '@/lib/xlsxGrid';
import { addBudgetItemAction, getBudgetAction } from '@/server/actions/budget';

const btnCls = 'px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';
const ghostCls = 'px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 disabled:opacity-50';
const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white';
const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 3 });

/** Add budget lines from one of SKB's costing sheets (.xlsx). Shows the lines first; nothing is saved until Import. */
export function BudgetExcelImport({ projectId }: { projectId: string }) {
  const [canEdit, setCanEdit] = useState<boolean | null>(null);
  const [sheets, setSheets] = useState<SheetGrid[] | null>(null);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [kind, setKind] = useState<'per_package' | 'one_off'>('per_package');
  const [group, setGroup] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parsed: CostingParsed | null = sheets ? parseCosting(sheets[sheetIdx].rows) : null;

  const start = async () => {
    setOpen(true);
    if (canEdit === null) {
      const r = await getBudgetAction(projectId);
      setCanEdit(r.ok && r.data.canEdit);
    }
  };

  const onFile = async (file: File | undefined) => {
    setError(null);
    setResult(null);
    setSheets(null);
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) {
      setError('Please choose an Excel file that ends in .xlsx. (An old .xls file: open it in Excel and use Save As .xlsx.)');
      return;
    }
    if (file.size > MAX_XLSX_BYTES) {
      setError('This file is too big (5 MB at most).');
      return;
    }
    try {
      const grids = await readXlsxSheets(await file.arrayBuffer());
      const first = Math.max(0, grids.findIndex((g) => parseCosting(g.rows).lines.length > 0));
      setSheets(grids);
      setSheetIdx(first);
      setGroup((parseCosting(grids[first].rows).title ?? '').slice(0, 120));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'This file could not be read.');
    }
  };

  const changeSheet = (i: number) => {
    setSheetIdx(i);
    if (sheets) setGroup((parseCosting(sheets[i].rows).title ?? '').slice(0, 120));
  };

  const run = async () => {
    if (!parsed) return;
    setBusy(true);
    setError(null);
    let ok = 0;
    try {
      for (const l of parsed.lines) {
        const r = await addBudgetItemAction(projectId, {
          kind,
          groupName: kind === 'per_package' ? [group.trim(), l.section].filter(Boolean).join(' · ').slice(0, 120) : '',
          name: l.name,
          measure: l.measure.slice(0, 30),
          quantity: String(l.quantity),
          unitPriceBdt: String(l.unitPriceBdt),
        });
        if (!r.ok) {
          setError(`Stopped after ${ok} of ${parsed.lines.length} lines. ${r.error} The lines already added stay; reload the page to see them.`);
          return;
        }
        ok += 1;
      }
      setResult(`${ok} lines added. Reload the page to see them in the budget.`);
      setSheets(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch {
      setError(`Something went wrong after ${ok} lines. Reload the page and check the budget before trying again.`);
    } finally {
      setBusy(false);
    }
  };

  if (canEdit === false) return null;

  return (
    <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Import budget lines from Excel</h2>
          <p className="text-sm text-slate-600">
            Use a costing sheet (food packet, iftar packet ...) or the template. The file is read in your browser and is not uploaded.{' '}
            <a href="/templates/SKB-budget-template.xlsx" download className="font-semibold text-slate-900 underline">Download the Excel template</a>
          </p>
        </div>
        {!open && (
          <button type="button" className={btnCls} onClick={() => void start()}>
            Choose Excel file
          </button>
        )}
      </div>
      {open && canEdit && (
        <div className="space-y-3">
          <input ref={inputRef} type="file" accept=".xlsx" aria-label="Costing sheet Excel file" className="text-sm" onChange={(e) => void onFile(e.target.files?.[0])} />
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {result && (
            <div role="status" className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-x-3">
              <span>{result}</span>
              <button type="button" className={ghostCls} onClick={() => window.location.reload()}>Reload</button>
            </div>
          )}
          {sheets && parsed && (
            <div className="space-y-3">
              {sheets.length > 1 && (
                <label className="block text-sm">
                  <span className="text-xs font-semibold text-slate-600">Sheet</span>
                  <select className={inputCls} value={sheetIdx} onChange={(e) => changeSheet(Number(e.target.value))}>
                    {sheets.map((s, i) => (
                      <option key={s.name} value={i}>{s.name}</option>
                    ))}
                  </select>
                </label>
              )}
              {parsed.warnings.length > 0 && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 space-y-1">
                  <p className="font-bold">Please check:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {parsed.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
              {parsed.lines.length > 0 && (
                <>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">How the lines count</span>
                      <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as 'per_package' | 'one_off')}>
                        <option value="per_package">Per package (cost of one packet, times the number of packages)</option>
                        <option value="one_off">One-off (counted once)</option>
                      </select>
                    </label>
                    {kind === 'per_package' && (
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-600">Group name</span>
                        <input className={inputCls} maxLength={120} value={group} onChange={(e) => setGroup(e.target.value)} />
                      </label>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs border border-slate-200 rounded-lg">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          {['Item', 'Measure', 'Quantity', 'Unit cost (BDT)', 'Total (BDT)'].map((h) => (
                            <th key={h} className="text-left px-2 py-1.5 font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.lines.map((l, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-2 py-1.5">{l.section ? `${l.section}: ` : ''}{l.name}</td>
                            <td className="px-2 py-1.5">{l.measure}</td>
                            <td className="px-2 py-1.5">{fmt(l.quantity)}</td>
                            <td className="px-2 py-1.5">{fmt(l.unitPriceBdt)}</td>
                            <td className="px-2 py-1.5">{fmt(Math.round(l.quantity * l.unitPriceBdt * 100) / 100)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {(parsed.adminPercent !== null || parsed.exchangeRate !== null) && (
                    <p className="text-xs text-slate-600">
                      The sheet also says: {parsed.adminPercent !== null && `administration cost ${parsed.adminPercent}%`}
                      {parsed.adminPercent !== null && parsed.exchangeRate !== null && ', '}
                      {parsed.exchangeRate !== null && `1 Euro = BDT ${parsed.exchangeRate}`}. These are not changed here; set them in the settings below.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button type="button" className={btnCls} disabled={busy} onClick={() => void run()}>
                      {busy ? 'Importing…' : `Add ${parsed.lines.length} lines`}
                    </button>
                    <button type="button" className={ghostCls} disabled={busy} onClick={() => { setSheets(null); if (inputRef.current) inputRef.current.value = ''; }}>
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
