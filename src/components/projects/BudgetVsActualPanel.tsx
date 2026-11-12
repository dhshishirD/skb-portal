import type { BudgetVsActual } from '@/lib/budgetVsActual';

const bdt = (cents: number) => `BDT ${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const dateFmt = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' });
const label = 'text-[11px] font-semibold uppercase tracking-wide text-slate-500';

/** Budget on one side, claims and purchases on the other, for the whole project. */
export function BudgetVsActualPanel({ data }: { data: BudgetVsActual }) {
  const pct = data.percentCommitted;
  const tone = data.overBudget ? 'bg-red-500' : (pct ?? 0) >= 90 ? 'bg-amber-500' : 'bg-emerald-500';
  const shown = data.lines.filter((l) => l.counted !== 'none').slice(0, 15);

  return (
    <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4" aria-labelledby="bva-title">
      <div>
        <h2 id="bva-title" className="text-sm font-bold text-slate-900">Planned against actual</h2>
        <p className="text-xs text-slate-500">
          Expense claims and purchase requests of this project, set against the budget below. They are not tied to single budget lines yet, so this is for the whole project.
        </p>
      </div>

      {pct === null ? (
        <p className="text-sm text-slate-600">Add budget lines first; then the comparison appears here.</p>
      ) : (
        <>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-2xl font-bold text-slate-900">{pct}% <span className="text-sm font-medium text-slate-600">spent or promised</span></p>
              <p className={`text-sm font-semibold ${data.overBudget ? 'text-red-700' : 'text-slate-700'}`}>
                {data.overBudget ? `${bdt(-data.remainingBdtCents)} over the plan` : `${bdt(data.remainingBdtCents)} left`}
              </p>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-100" role="img" aria-label={`${pct} percent of the planned budget`}>
              <div className={`h-2.5 rounded-full ${tone}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
            </div>
            <p className="text-xs text-slate-600">{bdt(data.committedBdtCents)} of {bdt(data.plannedBdtCents)} planned</p>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 p-3">
              <dt className={label}>Claims approved or paid</dt>
              <dd className="text-sm font-bold text-slate-900">{bdt(data.claimsSpentBdtCents)}</dd>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <dt className={label}>Purchases ordered or approved</dt>
              <dd className="text-sm font-bold text-slate-900">{bdt(data.purchasesOrderedBdtCents + data.purchasesApprovedBdtCents)}</dd>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <dt className={label}>Claims waiting</dt>
              <dd className="text-sm font-bold text-slate-900">{bdt(data.claimsWaitingBdtCents)}</dd>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <dt className={label}>Purchases waiting</dt>
              <dd className="text-sm font-bold text-slate-900">{bdt(data.purchasesWaitingBdtCents)}</dd>
            </div>
          </dl>
          <p className="text-xs text-slate-500">
            If one thing was bought through a purchase order and also claimed as an expense, it is counted twice here. Check any pair that looks the same.
          </p>
        </>
      )}

      {shown.length > 0 && (
        <div>
          <p className={label}>Latest claims and purchases</p>
          <ul className="mt-1 divide-y divide-slate-100 text-sm">
            {shown.map((l) => (
              <li key={`${l.kind}-${l.id}`} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-0.5 py-1.5">
                <span className="min-w-0">
                  <span className="mr-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">{l.kind === 'claim' ? 'Claim' : 'Purchase'}</span>
                  <span className="text-slate-900 break-words">{l.description}</span>
                </span>
                <span className="text-xs text-slate-600">
                  {bdt(l.bdtCents)} · {l.statusLabel} · {dateFmt(l.date)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
