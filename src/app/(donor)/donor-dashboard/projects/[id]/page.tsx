'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { fileSizeText, type DonorBeneficiaries, type DonorProjectView } from '@/lib/donorPortal';
import { formatDate } from '@/lib/fundReceipts';
import { getDonorBeneficiariesAction, getDonorDownloadAction, getDonorProjectAction } from '@/server/actions/donorPortal';

function Project() {
  const { id } = useParams<{ id: string }>();
  const org = useSearchParams().get('org');
  const [data, setData] = useState<DonorProjectView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [people, setPeople] = useState<DonorBeneficiaries | null>(null);
  const [peopleError, setPeopleError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getDonorProjectAction(id, org)
      .then((r) => {
        if (!live) return;
        if (r.ok) setData(r.data);
        else setError(r.error);
      })
      .catch(() => live && setError('Could not load the project. Please refresh the page.'));
    return () => {
      live = false;
    };
  }, [id, org]);

  useEffect(() => {
    let live = true;
    getDonorBeneficiariesAction(id, org)
      .then((r) => {
        if (!live) return;
        if (r.ok) setPeople(r.data);
        else setPeopleError(r.error);
      })
      .catch(() => live && setPeopleError('Could not load the list of people. Please refresh the page.'));
    return () => {
      live = false;
    };
  }, [id, org]);

  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading the project…</p>;
  const { project: p } = data;
  const q = org ? `?org=${org}` : '';

  const download = async (versionId: string) => {
    setBusy(versionId);
    setNote(null);
    try {
      const r = await getDonorDownloadAction(versionId, org);
      if (r.ok) window.location.href = r.url;
      else setNote(r.error);
    } catch {
      setNote('Could not create the download link. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <Link href={`/donor-dashboard${q}`} className="text-xs font-semibold text-blue-700 hover:underline">← All projects</Link>
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">{p.title}</h1>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{p.stageLabel}</span>
        </div>
        <p className="text-xs text-slate-500">{p.code}{p.location ? ` · ${p.location}` : ''}</p>
      </div>
      <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3" aria-label="Summary">
        <dl className="grid sm:grid-cols-4 gap-4 text-sm">
          <div><dt className="text-xs text-slate-500">Start</dt><dd className="font-medium">{p.startDate ? formatDate(p.startDate) : '-'}</dd></div>
          <div><dt className="text-xs text-slate-500">End</dt><dd className="font-medium">{p.endDate ? formatDate(p.endDate) : '-'}</dd></div>
          <div><dt className="text-xs text-slate-500">Budget</dt><dd className="font-medium">{p.budgetText || '-'}</dd></div>
          <div><dt className="text-xs text-slate-500">Families</dt><dd className="font-medium">{p.families ? p.families.toLocaleString('en-US') : '-'}</dd></div>
        </dl>
        {data.description && <p className="text-sm text-slate-700 whitespace-pre-wrap">{data.description}</p>}
      </section>
      <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3" aria-labelledby="donor-people">
        <h2 id="donor-people" className="text-sm font-bold">People reached</h2>
        {peopleError && <p role="alert" className="text-sm text-red-700">{peopleError}</p>}
        {!people && !peopleError && <p className="text-sm text-slate-500">Loading…</p>}
        {people && (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
              {([['Women', people.counts.women], ['Men', people.counts.men], ['Girls', people.counts.girls], ['Boys', people.counts.boys], ['Not stated', people.counts.unspecified], ['Total', people.counts.total]] as const).map(([label, n]) => (
                <div key={label} className="rounded-xl border border-slate-200 p-2">
                  <p className="text-lg font-bold text-slate-900">{n.toLocaleString('en-US')}</p>
                  <p className="text-[11px] text-slate-500">{label}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">Girls and boys are under 18. National ID numbers and phone numbers are never shown here. Please keep this list confidential.</p>
            {people.people.length === 0 ? (
              <p className="text-sm text-slate-500">No one has been registered yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                      <th className="py-1.5 pr-3 font-semibold">#</th>
                      <th className="py-1.5 pr-3 font-semibold">Name</th>
                      <th className="py-1.5 pr-3 font-semibold">Sex</th>
                      <th className="py-1.5 pr-3 font-semibold">Birth year</th>
                      <th className="py-1.5 font-semibold">Group</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {people.people.map((x, i) => (
                      <tr key={i}>
                        <td className="py-1.5 pr-3 text-xs text-slate-500">{i + 1}</td>
                        <td className="py-1.5 pr-3 text-slate-900">{x.name}</td>
                        <td className="py-1.5 pr-3 capitalize">{x.sex ?? '-'}</td>
                        <td className="py-1.5 pr-3">{x.birthYear ?? '-'}</td>
                        <td className="py-1.5 capitalize">{x.group === 'unspecified' ? '-' : x.group}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {people.truncated && <p className="text-xs text-slate-500">Showing the first 1,000 names. The numbers above cover everyone.</p>}
          </>
        )}
      </section>
      <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3" aria-labelledby="donor-docs">
        <h2 id="donor-docs" className="text-sm font-bold">Reports and documents released to you</h2>
        {data.documents.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing has been released yet. Reports appear here when Small Kindness Bangladesh releases them.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.documents.map((d) => (
              <li key={d.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{d.title}</p>
                  <p className="text-xs text-slate-500">
                    {d.category}{d.releasedAt ? ` · released ${formatDate(d.releasedAt.slice(0, 10))}` : ''}{d.fileName ? ` · ${d.fileName}` : ''}{d.size ? ` (${fileSizeText(d.size)})` : ''}
                  </p>
                  {d.description && <p className="text-xs text-slate-600 mt-0.5">{d.description}</p>}
                </div>
                {d.versionId && (
                  <button type="button" disabled={busy === d.versionId} onClick={() => download(d.versionId as string)} className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50">
                    {busy === d.versionId ? 'Preparing…' : 'Download'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {note && <p role="alert" className="text-xs text-red-700">{note}</p>}
      </section>
    </div>
  );
}

export default function DonorProjectPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
      <Project />
    </Suspense>
  );
}
