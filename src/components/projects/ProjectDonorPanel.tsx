'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ProjectDonor } from '@/lib/donors';
import { getProjectDonorAction, setProjectDonorAction } from '@/server/actions/donors';

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white';
const btnCls = 'px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';

/** The one donor of this project. The donor and its people see this project (and only the projects of their own organisation). */
export function ProjectDonorPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<ProjectDonor | null>(null);
  const [choice, setChoice] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [note, setNote] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await getProjectDonorAction(projectId);
      if (r.ok) {
        setData(r.data);
        setChoice(r.data.donorOrgId ?? '');
        setLoadError(null);
      } else setLoadError(r.error);
    } catch {
      setLoadError('Could not load the donor. Please refresh the page.');
    }
  }, [projectId]);
  useEffect(() => {
    void load();
  }, [load]);

  if (loadError && !data) return <p role="alert" className="text-sm text-red-700">{loadError}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading the donor…</p>;

  const save = async () => {
    setBusy(true);
    setNote(null);
    try {
      const r = await setProjectDonorAction(projectId, choice === '' ? null : choice);
      if (r.ok) {
        setNote({ kind: 'ok', text: r.message });
        await load();
      } else setNote({ kind: 'error', text: r.error });
    } catch {
      setNote({ kind: 'error', text: 'Could not save. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3" aria-labelledby="project-donor-title">
      <div>
        <h2 id="project-donor-title" className="text-sm font-bold">Donor</h2>
        <p className="text-xs text-slate-500">
          A project has one donor. People from that donor can sign in and see this project and what you release to them. Nobody from another donor can.
        </p>
      </div>
      <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="project-donor">Donor of this project</label>
          <select id="project-donor" className={inputCls} value={choice} onChange={(e) => setChoice(e.target.value)} disabled={!data.canSet}>
            <option value="">No donor linked</option>
            {data.options.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        {data.canSet && (
          <button type="button" className={btnCls} onClick={save} disabled={busy || choice === (data.donorOrgId ?? '')}>
            {busy ? 'Saving…' : 'Save donor'}
          </button>
        )}
      </div>
      {!data.donorOrgId && <p className="text-xs text-amber-700">No donor is linked yet, so no donor can see this project.</p>}
      {data.closed && <p className="text-xs text-slate-500">This project is closed, so the donor cannot be changed.</p>}
      {note && <p role={note.kind === 'error' ? 'alert' : 'status'} className={`text-xs ${note.kind === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>{note.text}</p>}
    </section>
  );
}
