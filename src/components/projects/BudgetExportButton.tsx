'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { getBudgetAction } from '@/server/actions/budget';
import { getBudgetVsActualAction } from '@/server/actions/budgetVsActual';
import { todayInDhaka } from '@/lib/workStatement';

/** Downloads the project budget as an Excel file (with a Budget vs Actual sheet for roles that may see it). */
export function BudgetExportButton({ projectId, title, code }: { projectId: string; title: string; code: string | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const [budget, actual] = await Promise.all([getBudgetAction(projectId), getBudgetVsActualAction(projectId)]);
      if (!budget.ok) {
        setError(budget.error);
        return;
      }
      const { buildBudgetXlsx, budgetFileName } = await import('@/lib/budgetXlsx');
      const preparedOn = todayInDhaka();
      const blob = await buildBudgetXlsx({ projectTitle: title, projectCode: code, data: budget.data, actual: actual.ok ? actual.data : null, preparedOn });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = budgetFileName(title, code, preparedOn);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Could not make the Excel file. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={busy} onClick={() => void run()} className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 disabled:opacity-50">
        <Download size={12} className="inline" /> {busy ? 'Making the file…' : 'Download budget as Excel'}
      </button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
