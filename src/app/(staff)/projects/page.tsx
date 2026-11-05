'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, FolderKanban, MapPin, Plus, Search, Users } from 'lucide-react';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { createProjectAction, listProjectsAction, type PortfolioData } from '@/server/actions/projects';
import { STAGE_LABELS, canCreateProjects, formatMoney } from '@/lib/projects';

/*
 * Projects portfolio. Every project here comes from the shared database, filtered by the
 * signed-in person's own access (Row Level Security). Nothing is kept in the browser.
 */
export default function ProjectsPortfolioPage() {
  const router = useRouter();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await listProjectsAction();
      if (r.ok) {
        setData(r.data);
      } else {
        setError(r.error);
      }
    } catch {
      // Network failure, or this tab was opened before a new version was published.
      setError('Could not reach the server. Reload the page (Ctrl+F5) and try again.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const canCreate = data ? canCreateProjects(data.roles) : false;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!data) return [];
    if (!q) return data.projects;
    return data.projects.filter((p) =>
      [p.code, p.title, p.location, p.donor_name].some((v) => (v ?? '').toLowerCase().includes(q))
    );
  }, [data, query]);

  return (
    <div className="space-y-6 font-sans">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FolderKanban className="w-6 h-6 text-blue-600" aria-hidden="true" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Projects</h1>
            <p className="text-sm text-slate-600">Shared list from the portal database.</p>
          </div>
        </div>
        {canCreate && !creating && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" aria-hidden="true" /> New project
          </button>
        )}
      </header>

      {creating && (
        <section aria-labelledby="new-project-title" className="bg-white p-5 rounded-2xl border border-slate-200">
          <h2 id="new-project-title" className="text-sm font-bold text-slate-900 mb-3">
            New project
          </h2>
          <ProjectForm
            submitLabel="Create project"
            onCancel={() => setCreating(false)}
            onSubmit={async (values) => {
              const r = await createProjectAction(values);
              if (r.ok) router.push(`/projects/${r.data.id}/overview`);
              return r;
            }}
          />
        </section>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}{' '}
          <button type="button" onClick={load} className="underline font-semibold">
            Try again
          </button>
        </p>
      )}

      {!data && !error && <p className="text-sm text-slate-500">Loading projects…</p>}

      {data && data.projects.length === 0 && !creating && (
        <section className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center space-y-2">
          <h2 className="text-base font-bold text-slate-900">No projects yet</h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            {canCreate
              ? 'Create the first project with the "New project" button.'
              : 'You see the projects you are assigned to. Ask the Executive Director or a Programme Manager to assign you to a project.'}
          </p>
        </section>
      )}

      {data && data.projects.length > 0 && (
        <>
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by code, title, location or donor"
              aria-label="Search projects"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          {visible.length === 0 ? (
            <p className="text-sm text-slate-600">No project matches your search.</p>
          ) : (
            <ul className="grid gap-3">
              {visible.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}/overview`}
                    className="block bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-slate-500">{p.code}</p>
                        <h2 className="text-base font-bold text-slate-900">{p.title}</h2>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                          {p.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> {p.location}
                            </span>
                          )}
                          {p.donor_name && <span>Donor: {p.donor_name}</span>}
                          {p.beneficiary_target !== null && (
                            <span className="inline-flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" aria-hidden="true" /> Target {p.beneficiary_target.toLocaleString('en-US')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">{formatMoney(p.budget_amount, p.budget_currency)}</p>
                          <span className="inline-block mt-1 text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-0.5">
                            {STAGE_LABELS[p.stage]}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
