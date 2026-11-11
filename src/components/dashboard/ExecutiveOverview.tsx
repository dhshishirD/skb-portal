import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDot, Clock, FolderKanban, Gavel, Users, Wallet } from 'lucide-react';
import type { ExecutiveOverviewData } from '@/server/services/executiveOverviewData';

/*
 * Executive Director overview. Server-rendered from the database: no browser storage, no sample data.
 * Every status is written in words as well as shown with an icon or colour.
 */

const dateText = (iso: string | null) =>
  iso ? new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const whenText = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' });
const nf = (n: number) => n.toLocaleString('en-US');

function Kpi({ icon, label, children, note }: { icon: React.ReactNode; label: string; children: React.ReactNode; note: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span className="text-slate-400" aria-hidden="true">{icon}</span>
        {label}
      </div>
      <div className="text-slate-900 tabular-nums">{children}</div>
      <div className="text-xs text-slate-600 leading-snug">{note}</div>
    </div>
  );
}

const HEALTH_STYLE = {
  needs_action: 'bg-amber-50 text-amber-900 border-amber-300',
  ok: 'bg-emerald-50 text-emerald-900 border-emerald-300',
  closed: 'bg-slate-100 text-slate-700 border-slate-300',
} as const;

export function ExecutiveOverview({ data, name }: { data: ExecutiveOverviewData; name: string }) {
  const o = data.overview;
  const maxStage = Math.max(1, ...o.stageCounts.map((s) => s.count));
  const decisions = o.attention.filter((a) => a.level === 'decision');
  const shown = o.attention.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">Executive overview</p>
          <h1 className="text-2xl sm:text-3xl font-black">{name ? `Welcome, ${name}` : 'Welcome'}</h1>
          <p className="text-sm text-slate-300">Every project, from the portal database. Nothing on this page is typed in by hand.</p>
        </div>
        <p className="text-xs text-slate-300">As of {whenText(data.asOf)} (Dhaka)</p>
      </header>

      {/* Vital numbers */}
      <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi icon={<FolderKanban className="w-4 h-4" />} label="Projects" note={`${o.closed} closed of ${o.total} in total`}>
          <span className="text-3xl font-black">{o.active}</span> <span className="text-sm font-semibold text-slate-600">active</span>
        </Kpi>
        <Kpi icon={<Wallet className="w-4 h-4" />} label="Funds agreed" note="Donor amounts, kept apart by currency">
          {o.agreed.length === 0 ? (
            <span className="text-xl font-bold text-slate-500">Not set</span>
          ) : (
            <ul className="space-y-0.5">
              {o.agreed.map((m) => (
                <li key={m.currency} className="text-xl font-black">{m.text}</li>
              ))}
            </ul>
          )}
        </Kpi>
        <Kpi
          icon={<Wallet className="w-4 h-4" />}
          label="Funds received"
          note={o.receivedPct !== null ? `${o.receivedPct}% of the agreed amount` : o.received.length > 1 ? 'More than one currency, so no single percentage' : 'Fund receipts recorded on the projects'}
        >
          {o.received.length === 0 ? (
            <span className="text-xl font-bold text-slate-500">None recorded</span>
          ) : (
            <ul className="space-y-0.5">
              {o.received.map((m) => (
                <li key={m.currency} className="text-xl font-black">{m.text}</li>
              ))}
            </ul>
          )}
        </Kpi>
        <Kpi
          icon={<Users className="w-4 h-4" />}
          label="People reached"
          note={o.people.total === 0 ? 'No beneficiaries or head counts yet' : `${nf(o.people.registered)} registered, ${nf(o.people.headcountOnly)} from head counts`}
        >
          <span className="text-3xl font-black">{nf(o.people.total)}</span>
        </Kpi>
        <Kpi icon={<Clock className="w-4 h-4" />} label="Tasks" note={`${nf(o.openTasks)} open in total`}>
          <span className="text-3xl font-black">{nf(o.overdueTasks)}</span>{' '}
          <span className="text-sm font-semibold text-slate-600">overdue</span>
        </Kpi>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Needs attention */}
        <section aria-labelledby="attention-title" className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="attention-title" className="text-base font-black text-slate-900">Needs your attention</h2>
            <p className="text-xs text-slate-600">
              {o.attention.length === 0 ? 'Nothing is waiting.' : `${decisions.length} decision${decisions.length === 1 ? '' : 's'} · ${o.attention.length - decisions.length} warning${o.attention.length - decisions.length === 1 ? '' : 's'}`}
            </p>
          </div>
          {o.total === 0 ? (
            <p className="text-sm text-slate-600">There are no projects yet. Create one under Projects.</p>
          ) : shown.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-emerald-800">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> All active projects are up to date.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {shown.map((a, i) => (
                <li key={`${a.projectId}-${i}`}>
                  <Link href={`/projects/${a.projectId}/${a.tab}`} className="flex items-start gap-3 py-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg">
                    <span className={`mt-0.5 shrink-0 ${a.level === 'decision' ? 'text-blue-700' : 'text-amber-700'}`} aria-hidden="true">
                      {a.level === 'decision' ? <Gavel className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    </span>
                    <span className="flex-1 text-sm text-slate-800">
                      <span className="font-semibold">{a.level === 'decision' ? 'Decision: ' : 'Warning: '}</span>
                      <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded mr-1.5">{a.code}</span>
                      {a.text}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 mt-0.5 shrink-0" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {o.attention.length > shown.length && <p className="text-xs text-slate-500">And {o.attention.length - shown.length} more. Open the project to see them.</p>}
        </section>

        {/* Pipeline */}
        <section aria-labelledby="pipeline-title" className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-sm">
          <h2 id="pipeline-title" className="text-base font-black text-slate-900">Projects by stage</h2>
          <ol className="space-y-3">
            {o.stageCounts.map((s) => (
              <li key={s.stage} className="space-y-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-slate-800">{s.label}</span>
                  <span className="font-bold tabular-nums text-slate-900">{s.count}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100" role="presentation">
                  <div className="h-2 rounded-full bg-slate-700" style={{ width: `${(s.count / maxStage) * 100}%` }} />
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Portfolio */}
      <section aria-labelledby="portfolio-title" className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="portfolio-title" className="text-base font-black text-slate-900">All projects</h2>
          <Link href="/projects" className="text-xs font-semibold text-blue-700 hover:underline">Open the projects list</Link>
        </div>
        {o.rows.length === 0 ? (
          <p className="text-sm text-slate-600">No projects yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <caption className="sr-only">All projects with stage, funds, tasks, people and status</caption>
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                  <th scope="col" className="py-2 pr-4 font-semibold">Project</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Stage</th>
                  <th scope="col" className="py-2 pr-4 font-semibold text-right">Agreed</th>
                  <th scope="col" className="py-2 pr-4 font-semibold text-right">Received</th>
                  <th scope="col" className="py-2 pr-4 font-semibold text-right">Tasks (overdue)</th>
                  <th scope="col" className="py-2 pr-4 font-semibold text-right">People</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Ends</th>
                  <th scope="col" className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {o.rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="py-3 pr-4 min-w-[14rem]">
                      <Link href={`/projects/${r.id}/overview`} className="font-semibold text-slate-900 hover:underline">{r.title}</Link>
                      <div className="text-xs text-slate-500"><span className="font-mono">{r.code}</span> · {r.donor}</div>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">{r.stageLabel}</td>
                    <td className="py-3 pr-4 text-right tabular-nums whitespace-nowrap">{r.agreedText}</td>
                    <td className="py-3 pr-4 text-right tabular-nums whitespace-nowrap">
                      {r.receivedText}
                      {r.receivedPct !== null && <div className="text-xs text-slate-500">{r.receivedPct}%</div>}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums whitespace-nowrap">{r.openTasks} ({r.overdueTasks})</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{nf(r.people)}</td>
                    <td className="py-3 pr-4 whitespace-nowrap">{dateText(r.endDate)}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${HEALTH_STYLE[r.health]}`}>
                        {r.health === 'needs_action' ? <AlertTriangle className="w-3 h-3" aria-hidden="true" /> : r.health === 'ok' ? <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> : <CircleDot className="w-3 h-3" aria-hidden="true" />}
                        {r.healthLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Activity */}
      <section aria-labelledby="activity-title" className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="activity-title" className="text-base font-black text-slate-900">Recent activity</h2>
          <Link href="/admin/audit-log" className="text-xs font-semibold text-blue-700 hover:underline">Full audit log</Link>
        </div>
        {data.activity.length === 0 ? (
          <p className="text-sm text-slate-600">No recent activity to show.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {data.activity.map((a) => (
              <li key={a.id} className="py-2 flex flex-wrap justify-between gap-2">
                <span className="text-slate-800"><span className="font-semibold">{a.who}</span> {a.text}</span>
                <span className="text-xs text-slate-500">{whenText(a.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
