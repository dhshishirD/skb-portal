'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart2, CheckCircle2, ClipboardList, Hourglass, Target, Users } from 'lucide-react';
import { getMeOverviewAction } from '@/server/actions/meOverview';
import type { MeOverview, OverviewIndicator } from '@/lib/meOverview';

/*
 * M&E Overview: a read-only roll-up of what each project already records.
 * Progress counts only VALIDATED indicator values. Values are entered and validated in the
 * project's Logframe tab. A district map comes later, when district data and field reports exist.
 */

const STATE_LABEL: Record<OverviewIndicator['state'], string> = {
  reached: 'Target reached',
  on_the_way: 'On the way',
  no_validated_value: 'No validated value yet',
};
const STATE_TONE: Record<OverviewIndicator['state'], string> = {
  reached: 'bg-emerald-100 text-emerald-800',
  on_the_way: 'bg-blue-100 text-blue-800',
  no_validated_value: 'bg-slate-100 text-slate-600',
};

function Card({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note?: string }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
      <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">{icon}{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {note && <p className="text-[11px] text-slate-400">{note}</p>}
    </div>
  );
}

export default function MeOverviewPage() {
  const [data, setData] = useState<MeOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await getMeOverviewAction();
        if (r.ok) setData(r.data);
        else setError(r.error);
      } catch {
        setError('Could not reach the server. Reload the page (Ctrl+F5) and try again.');
      }
    })();
  }, []);

  const t = data?.totals;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <Link href="/dashboard" className="hover:underline">Staff</Link> &rsaquo;
          <span className="font-semibold text-slate-800">M&amp;E Overview</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-blue-600" />
          M&amp;E Overview
        </h1>
        <p className="text-xs text-slate-500">
          Progress of every project you can access. Only validated values count. Enter and validate values in each project&apos;s Logframe tab.
        </p>
      </div>

      {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs">{error}</div>}
      {!data && !error && <p className="text-xs text-slate-500">Loading…</p>}

      {data && t && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card icon={<Target className="w-3.5 h-3.5" />} label="Indicators" value={String(t.indicators)} note={`${t.projects} project${t.projects === 1 ? '' : 's'}`} />
            <Card icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Targets reached" value={`${t.reached} / ${t.indicators}`} note={`${t.onTheWay} on the way`} />
            <Card icon={<Hourglass className="w-3.5 h-3.5" />} label="Waiting for validation" value={String(t.pendingValues)} note={`${t.noValidatedValue} indicator${t.noValidatedValue === 1 ? '' : 's'} with no validated value`} />
            <Card icon={<ClipboardList className="w-3.5 h-3.5" />} label="Overdue tasks" value={String(t.overdueTasks)} />
          </div>

          {data.projects.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm text-xs text-slate-500">
              No projects to show. Projects you can access appear here.
            </div>
          )}

          {data.projects.map((p) => (
            <section key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link href={`/projects/${p.id}`} className="text-sm font-bold text-slate-900 hover:underline">{p.code} · {p.title}</Link>
                  <p className="text-[11px] text-slate-500">
                    Tasks {p.tasks.done}/{p.tasks.total} done
                    {p.headcountTotal !== null ? ` · ${p.headcountTotal.toLocaleString('en-US')} people (head count)` : ''}
                  </p>
                </div>
                <Link href={`/projects/${p.id}/logframe`} className="text-xs font-medium text-blue-700 hover:underline flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Open Logframe
                </Link>
              </div>

              {p.hints.length > 0 && (
                <ul className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-0.5">
                  {p.hints.map((h) => (<li key={h}>{h}</li>))}
                </ul>
              )}

              {p.indicators.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 pr-3">Item</th>
                        <th className="py-2 pr-3">Indicator</th>
                        <th className="py-2 pr-3 text-right">Achieved / target</th>
                        <th className="py-2 pr-3 w-40">Progress</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {p.indicators.map((i) => (
                        <tr key={i.id}>
                          <td className="py-2 pr-3 font-mono text-[11px] text-blue-700 whitespace-nowrap">{i.code}</td>
                          <td className="py-2 pr-3 text-slate-800">{i.name}</td>
                          <td className="py-2 pr-3 text-right whitespace-nowrap">
                            {i.achieved} / {i.target.toLocaleString('en-US')} {i.unit}
                          </td>
                          <td className="py-2 pr-3">
                            {i.percent === null ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden" role="img" aria-label={`${i.percent}% of target`}>
                                  <div className="bg-blue-500 h-2" style={{ width: `${Math.max(0, Math.min(100, i.percent))}%` }} />
                                </div>
                                <span className="font-semibold w-12 text-right">{i.percent}%</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATE_TONE[i.state]}`}>{STATE_LABEL[i.state]}</span>
                            {i.pendingCount > 0 && <span className="ml-1 text-[10px] text-amber-700">+{i.pendingCount} to validate</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
