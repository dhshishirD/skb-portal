'use client';

import { useRef, useState } from 'react';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { parseBeneficiaryRows, parseCsv, templateCsv, type ImportParsed } from '@/lib/beneficiaryImport';
import { MAX_XLSX_BYTES, readXlsxSheets } from '@/lib/xlsxGrid';
import { importBeneficiariesAction, type BeneficiaryActionResult } from '@/server/actions/beneficiaries';

const btnCls = 'px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';
const ghostCls = 'px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 disabled:opacity-50';
const MAX_CSV_BYTES = 2 * 1024 * 1024;

/** Upload many people at once from a CSV or Excel sheet. The sheet is read in the browser and checked before anything is saved. */
export function BeneficiaryImport({ projectId, onDone }: { projectId: string; onDone: (r: BeneficiaryActionResult) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ImportParsed | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([templateCsv()], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'beneficiaries-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (file: File | undefined) => {
    setParsed(null);
    setError(null);
    if (!file) return;
    const isXlsx = /\.xlsx$/i.test(file.name);
    const isCsv = /\.csv$/i.test(file.name);
    if (!isXlsx && !isCsv) {
      setError('Please choose a .csv or .xlsx file. (An old .xls file: open it in Excel and use Save As .xlsx.)');
      return;
    }
    if (file.size > (isXlsx ? MAX_XLSX_BYTES : MAX_CSV_BYTES)) {
      setError('This file is too big.');
      return;
    }
    try {
      const grid = isXlsx ? ((await readXlsxSheets(await file.arrayBuffer()))[0]?.rows ?? []) : parseCsv(await file.text());
      setFileName(file.name);
      setParsed(parseBeneficiaryRows(grid));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'This file could not be read.');
    }
  };

  const upload = async () => {
    if (!parsed || parsed.rows.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const r = await importBeneficiariesAction(projectId, parsed.rows.map((x) => x.values));
      onDone(r);
      if (r.ok) {
        setParsed(null);
        setFileName('');
        if (inputRef.current) inputRef.current.value = '';
      } else setError(r.error);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
      <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
        <FileSpreadsheet size={13} /> Upload a list (CSV or Excel)
      </p>
      <p className="text-[11px] text-slate-500">
        Download the template, fill in one person per row, and upload it. The first sheet is read. Required: full name and sex. National ID and phone are optional. If you type IDs in Excel, format that column as Text first.
        You will see what was understood before anything is saved.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={ghostCls} onClick={downloadTemplate}>
          Download template (CSV)
        </button>
        <input ref={inputRef} type="file" accept=".csv,.xlsx" aria-label="Beneficiary list file" className="text-xs" onChange={(e) => void onFile(e.target.files?.[0])} />
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {parsed?.fatal && <p role="alert" className="text-sm text-red-700">{parsed.fatal}</p>}
      {parsed && !parsed.fatal && (
        <div className="space-y-2">
          <p className="text-sm text-slate-800">
            <b>{fileName}</b>: {parsed.total} {parsed.total === 1 ? 'row' : 'rows'} read, <b className="text-emerald-700">{parsed.rows.length} ready</b>
            {parsed.problems.length > 0 && <>, <b className="text-red-700">{parsed.problems.length} with a problem</b> (these will be left out)</>}.
          </p>
          {parsed.problems.length > 0 && (
            <ul className="max-h-40 overflow-auto rounded-lg border border-red-200 bg-red-50 p-2 text-[11px] text-red-800 space-y-0.5">
              {parsed.problems.slice(0, 50).map((p) => (
                <li key={`${p.line}-${p.message}`}>Row {p.line}: {p.message}</li>
              ))}
              {parsed.problems.length > 50 && <li>…and {parsed.problems.length - 50} more</li>}
            </ul>
          )}
          <button type="button" className={btnCls} disabled={busy || parsed.rows.length === 0} onClick={() => void upload()}>
            <Upload size={12} className="inline" /> {busy ? 'Saving…' : `Register ${parsed.rows.length} ${parsed.rows.length === 1 ? 'person' : 'people'}`}
          </button>
          <p className="text-[11px] text-slate-500">A person whose national ID is already registered in this project is skipped.</p>
        </div>
      )}
    </div>
  );
}
