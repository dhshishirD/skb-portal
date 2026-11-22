'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { timeProgress, type DonorHome } from '@/lib/donorPortal';
import { formatDate } from '@/lib/fundReceipts';
import { getDonorHomeAction } from '@/server/actions/donorPortal';

function Home() {
  const org = useSearchParams().get('org');
  const [data, setData] = useState<DonorHome | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getDonorHomeAction(org)
      .then((r) => {
        if (!live) return;
        if (r.ok) setData(r.data);
        else setError(r.error);
      })
      .catch(() => live && setError('Could not load your projects. Please refresh the page.'));
    return () => {
      live = false;
    };
  }, [org]);

  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading your projects…</p>;
  const q = org ? `?org=${org}` : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{data.orgName}</h1>
        <p className="text-sm text-slate-600">Your projects with Small Kindness Bangladesh, and the reports released to you.</p>
      </div>
      {data.projects.length === 0 ? (
        <section className="bg-white p-6 rounded-2xl border border-dashed border-slate-300 text-center space-y-1">
          <p className="text-sm font-semibold text-slate-800">No project is linked to your organisation yet.</p>
          <p className="text-xs text-slate-500">When Small Kindness Bangladesh links a project to you, it will appear here.</p>
        </section>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-4">
          {data.projects.map((p) => {
            const progress = timeProgress(p.startDate, p.endDate);
            return (
              <li key={p.id}>
                <Link href={`/donor-dashboard/projects/${p.id}${q}`} className="block h-full bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-400 transition space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900">{p.title}</p>
                      <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{p.stageLabel}</span>
                    </div>
                    <p className="text-xs text-slate-500">{p.code}{p.location ? ` · ${p.location}` : ''}</p>
                  </div>
                  {progress !== null && (
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                        <span>{formatDate(p.startDate as string)}</span>
                        <span>Time passed: {progress}%</span>
                        <span>{formatDate(p.endDate as string)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100" role="progressbar" aria-label="Share of the planned time that has passed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                        <div className="h-1.5 rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                    {p.families ? <span><b className="font-semibold text-slate-900">{p.families.toLocaleString('en-US')}</b> families</span> : null}
                    <span><b className="font-semibold text-slate-900">{p.documentCount}</b> {p.documentCount === 1 ? 'report' : 'reports'}</span>
                    {p.budgetText ? <span className="font-semibold text-slate-900">{p.budgetText}</span> : null}
                  </div>
                  {progress === null && (p.startDate || p.endDate) && (
                    <p className="text-[11px] text-slate-500">{p.startDate ? formatDate(p.startDate) : '-'} to {p.endDate ? formatDate(p.endDate) : '-'}</p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function DonorDashboardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
      <Home />
    </Suspense>
  );
}
