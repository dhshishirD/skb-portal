import Link from 'next/link';
import { formatMoney } from '@/lib/fundReceipts';
import type { ProjectHealth } from '@/lib/projectHealth';

const card = 'rounded-xl border border-slate-200 p-4 space-y-1.5';
const label = 'text-[11px] font-semibold uppercase tracking-wide text-slate-500';
const dateFmt = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' });
const bdt = (cents: number) => `BDT ${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

function Bar({ percent, tone }: { percent: number; tone: 'ok' | 'warn' | 'bad' }) {
  const color = tone === 'bad' ? 'bg-red-500' : tone === 'warn' ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="h-2 w-full rounded-full bg-slate-100" role="img" aria-label={`${percent} percent`}>
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}

/** "Is this project healthy?" in one place. Numbers come from the Budget, Tasks, Logframe and Fund receipts tabs. */
export function ProjectHealthPanel({ projectId, health }: { projectId: string; health: ProjectHealth }) {
  const base = `/projects/${projectId}`;
  const { budget, funds, tasks, indicators, upcoming, attention } = health;
  const anything = budget || funds || tasks || indicators || upcoming.length > 0;
  if (!anything) return null;

  return (
    <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4" aria-labelledby="health-title">
      <div>
        <h2 id="health-title" className="text-sm font-bold text-slate-900">Project health</h2>
        <p className="text-xs text-slate-500">Taken from the other tabs as of {dateFmt(health.today)}. Nothing is entered here.</p>
      </div>

      {attention.length > 0 ? (
        <ul className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-1" aria-label="Needs attention">
          {attention.map((a) => (
            <li key={a}>• {a}</li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">Nothing needs attention right now.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {budget && (
          <div className={card}>
            <p className={label}>Budget spent</p>
            {budget.percentSpent === null ? (
              <p className="text-sm text-slate-600">No budget lines yet.</p>
            ) : (
              <>
                <p className="text-xl font-bold text-slate-900">{budget.percentSpent}%</p>
                <Bar percent={budget.percentSpent} tone={budget.overspent ? 'bad' : budget.percentSpent >= 90 ? 'warn' : 'ok'} />
                <p className="text-xs text-slate-600">{bdt(budget.spentBdtCents)} of {bdt(budget.plannedBdtCents)}</p>
                {budget.waitingBdtCents > 0 && <p className="text-xs text-slate-500">{bdt(budget.waitingBdtCents)} waiting for approval</p>}
              </>
            )}
            <Link href={`${base}/budget`} className="text-xs font-semibold text-blue-700 hover:underline">Open budget</Link>
          </div>
        )}

        {tasks && (
          <div className={card}>
            <p className={label}>Tasks</p>
            {tasks.total === 0 ? (
              <p className="text-sm text-slate-600">No tasks yet.</p>
            ) : (
              <>
                <p className="text-xl font-bold text-slate-900">{tasks.percentDone}% done</p>
                <Bar percent={tasks.percentDone} tone="ok" />
                <p className="text-xs text-slate-600">
                  {tasks.done} of {tasks.total} done ·{' '}
                  <span className={tasks.overdue > 0 ? 'font-bold text-red-700' : ''}>{tasks.overdue} late</span>
                  {tasks.blocked > 0 ? ` · ${tasks.blocked} blocked` : ''}
                </p>
              </>
            )}
            <Link href={`${base}/tasks`} className="text-xs font-semibold text-blue-700 hover:underline">Open tasks</Link>
          </div>
        )}

        {indicators && (
          <div className={card}>
            <p className={label}>Indicators</p>
            {indicators.averagePercent === null ? (
              <p className="text-sm text-slate-600">No validated values yet ({indicators.total} indicator{indicators.total === 1 ? '' : 's'}).</p>
            ) : (
              <>
                <p className="text-xl font-bold text-slate-900">{indicators.averagePercent}%</p>
                <Bar percent={indicators.averagePercent} tone="ok" />
                <p className="text-xs text-slate-600">{indicators.withValidatedData} of {indicators.total} have validated data</p>
              </>
            )}
            <Link href={`${base}/logframe`} className="text-xs font-semibold text-blue-700 hover:underline">Open logframe</Link>
          </div>
        )}

        {funds && (
          <div className={card}>
            <p className={label}>Last fund receipt</p>
            {funds.lastReceivedOn ? (
              <>
                <p className="text-xl font-bold text-slate-900">{dateFmt(funds.lastReceivedOn)}</p>
                <p className="text-xs text-slate-600">
                  {funds.lastCurrency} {funds.lastAmount?.toLocaleString('en-US')} · {funds.daysSinceLast === 0 ? 'today' : `${funds.daysSinceLast} days ago`}
                </p>
                {funds.totals.remainingCents !== null && (
                  <p className="text-xs text-slate-500">Still to receive: {formatMoney(funds.totals.remainingCents)}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-600">No fund received yet.</p>
            )}
            <Link href={`${base}/receipts`} className="text-xs font-semibold text-blue-700 hover:underline">Open fund receipts</Link>
          </div>
        )}
      </div>

      {tasks && tasks.overdueList.length > 0 && (
        <div>
          <p className={label}>Late tasks</p>
          <ul className="mt-1 divide-y divide-slate-100 text-sm">
            {tasks.overdueList.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                <span className="font-medium text-slate-900">{t.title}</span>
                <span className="text-xs text-red-700">
                  {t.daysLate} day{t.daysLate === 1 ? '' : 's'} late{t.assigneeName ? ` · ${t.assigneeName}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {indicators && indicators.slowest.length > 0 && (
        <div>
          <p className={label}>Slowest indicators</p>
          <ul className="mt-1 divide-y divide-slate-100 text-sm">
            {indicators.slowest.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="text-slate-900">{i.name}</span>
                <span className="text-xs text-slate-600">{i.percent}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <p className={label}>Coming up</p>
          <ul className="mt-1 divide-y divide-slate-100 text-sm">
            {upcoming.map((u) => (
              <li key={`${u.kind}-${u.label}-${u.date}`} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                <span className="text-slate-900">{u.label}</span>
                <span className="text-xs text-slate-600">
                  {dateFmt(u.date)} · {u.daysFromToday === 0 ? 'today' : `in ${u.daysFromToday} day${u.daysFromToday === 1 ? '' : 's'}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
