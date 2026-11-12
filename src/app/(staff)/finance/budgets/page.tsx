'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import { Empty, Notice, formatBdt } from '@/components/finance/shared';
import { listExpensesAction } from '@/server/actions/expenses';
import { listProjectsAction } from '@/server/actions/projects';
import { formatMoney, type ProjectRow } from '@/lib/projects';
import type { ExpenseRow } from '@/lib/finance';

/*
 * Grant budgets and spending, from real data only. Expense amounts are in BDT; the donor budget may be
 * in another currency, so a percentage is shown only when both are BDT.
 */
export default function GrantBudgetsPage() {
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [claims, setClaims] = useState<ExpenseRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, c] = await Promise.all([listProjectsAction(), listExpensesAction()]);
        if (p.ok) setProjects(p.data.projects);
        else setError(p.error);
        if (c.ok) setClaims(c.data);
      } catch {
        setError('Could not reach the server. Reload the page (Ctrl+F5) and try again.');
      }
    })();
  }, []);

  const totals = useMemo(() => {
    const map = new Map<string, { paid: number; inFlow: number }>();
    for (const c of claims) {
      const t = map.get(c.projectId) ?? { paid: 0, inFlow: 0 };
      if (c.status === 'paid') t.paid += c.amountBdt;
      else if (['submitted', 'pm_approved', 'finance_verified', 'director_approved'].includes(c.status)) t.inFlow += c.amountBdt;
      map.set(c.projectId, t);
    }
    return map;
  }, [claims]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <Link href="/dashboard" className="hover:underline">Finance</Link> &rsaquo;
          <span className="font-semibold text-slate-800">Grant Budgets</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-500" />
          Grant Budgets and Spending
        </h1>
        <p className="text-xs text-slate-500">Donor budget per project, with expense claims paid and still in approval (BDT).</p>
      </div>

      {error && <Notice kind="error">{error}</Notice>}

      {projects === null ? (
        <p className="text-xs text-slate-500">Loading…</p>
      ) : projects.length === 0 ? (
        <Empty title="No projects yet">Projects you can access appear here with their budgets.</Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {projects.map((p) => {
            const t = totals.get(p.id) ?? { paid: 0, inFlow: 0 };
            const budget = p.budget_amount === null || p.budget_amount === '' ? null : Number(p.budget_amount);
            const percent = budget && p.budget_currency === 'BDT' ? Math.min(100, Math.round((t.paid / budget) * 100)) : null;
            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-blue-600">{p.code}</span>
                  <span className="text-xs font-semibold text-slate-500">{p.budget_currency}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">{p.title}</h3>
                {percent !== null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-500">Paid so far</span>
                      <span className="text-amber-600 font-bold">{percent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <p className="text-[10px] text-slate-400">Donor budget</p>
                    <p className="font-bold text-slate-900">{formatMoney(budget, p.budget_currency)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Paid</p>
                    <p className="font-bold text-emerald-600">{formatBdt(t.paid)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">In approval</p>
                    <p className="font-bold text-amber-600">{formatBdt(t.inFlow)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
