'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckSquare, FolderKanban } from 'lucide-react';
import type { DashboardData } from '@/lib/dashboard';
import { getDashboardAction } from '@/server/actions/dashboard';

const STAGE_STYLE: Record<string, string> = {
  closed: 'bg-slate-100 text-slate-600 border-slate-300',
  implementation: 'bg-blue-100 text-blue-800 border-blue-300',
  monitoring_evaluation: 'bg-indigo-100 text-indigo-800 border-indigo-300',
};

const TABS: Array<[string, string]> = [
  ['Budget', 'budget'],
  ['Tasks', 'tasks'],
  ['Logframe', 'logframe'],
  ['Beneficiaries', 'beneficiaries'],
  ['Documents', 'documents'],
  ['Closing & Form-7', 'closing-report'],
];

const fmtDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/** Real projects from the database: the ones this user can see, open tasks, next steps. */
export function MyProjectsPanel() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getDashboardAction()
      .then((r) => {
        if (!alive) return;
        if (r.ok) setData(r.data);
        else setError(r.error);
      })
      .catch(() => {
        if (alive) setError('Could not reach the server. Refresh the page and try again.');
      });
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <p role="alert" className="text-sm text-red-700 bg-white p-5 rounded-2xl border border-slate-200">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500 bg-white p-5 rounded-2xl border border-slate-200">Loading your projects…</p>;

  return (
    <div className="space-y-6">
      <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-blue-600" aria-hidden />
              <span>My projects</span>
              <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full">{data.projects.length}</span>
            </h2>
            <p className="text-xs text-slate-500">The projects you can open, from the portal database. Access is set on each project’s Overview tab.</p>
          </div>
          <Link href="/projects" className="text-xs font-bold text-blue-600 hover:underline">Open all projects →</Link>
        </div>

        {data.projects.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center space-y-2">
            <p className="text-sm font-bold text-slate-900">No projects yet</p>
            <p className="text-xs text-slate-500">You can open only the projects you were added to. Ask the Executive Director or a Programme Manager to add you, or create a project.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.projects.map((p) => (
              <div key={p.id} className={`rounded-2xl border p-5 space-y-3 flex flex-col justify-between ${p.stage === 'closed' ? 'bg-slate-50 border-slate-200 opacity-80' : 'bg-white border-slate-200'}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">{p.code}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${STAGE_STYLE[p.stage] ?? 'bg-slate-100 text-slate-700 border-slate-300'}`}>{p.stageLabel}</span>
                  </div>
                  <Link href={`/projects/${p.id}/overview`} className="block text-sm font-bold text-slate-900 hover:underline">{p.title}</Link>
                  <p className="text-xs text-slate-500">
                    {p.donorName ? `${p.donorName} · ` : ''}{p.budgetText}{p.endDate ? ` · ends ${fmtDate(p.endDate)}` : ''}
                  </p>
                  <p className="text-xs text-slate-600">
                    Open tasks: <strong>{p.openTasks}</strong>
                    {p.overdueTasks > 0 && <span className="text-red-700 font-bold"> ({p.overdueTasks} overdue)</span>}
                  </p>
                  {p.nextSteps.length > 0 && (
                    <ul className="text-xs text-amber-800 space-y-0.5">
                      {p.nextSteps.map((s) => (
                        <li key={s} className="flex gap-1.5"><AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />{s}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 text-[11px] font-bold">
                  {TABS.map(([label, slug]) => (
                    <Link key={slug} href={`/projects/${p.id}/${slug}`} className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700">{label}</Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-emerald-600" aria-hidden />
          <span>My open tasks</span>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">{data.myOpenTaskCount}</span>
        </h2>
        {data.myTasks.length === 0 ? (
          <p className="text-xs text-slate-500">No open tasks are assigned to you.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.myTasks.map((t) => (
              <li key={t.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <Link href={`/projects/${t.projectId}/tasks`} className="font-bold text-slate-900 hover:underline">{t.title}</Link>
                <span className="text-slate-500">
                  {t.projectCode} · {t.priority}
                  {t.dueDate ? <span className={t.overdue ? 'text-red-700 font-bold' : ''}> · due {fmtDate(t.dueDate)}</span> : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
