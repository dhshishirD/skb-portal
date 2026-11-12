'use client';

import { useCallback, useEffect, useState } from 'react';
import { areaTotals, peopleFromFamilies, type AreaFormValues, type ProjectArea, type ProjectAreasData } from '@/lib/projectAreas';
import {
  addProjectAreaAction,
  deleteProjectAreaAction,
  getProjectAreasAction,
  updateProjectAreaAction,
} from '@/server/actions/projectAreas';

type Note = { kind: 'ok' | 'error'; text: string } | null;
type Draft = { region: string; cities: string; villages: string; itemQuantity: string; itemUnit: string; families: string };
const EMPTY: Draft = { region: '', cities: '', villages: '', itemQuantity: '', itemUnit: '', families: '' };
const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white';
const btnCls = 'px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';
const ghostCls = 'px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 disabled:opacity-50';

const toDraft = (a: ProjectArea): Draft => ({
  region: a.region,
  cities: a.cities ?? '',
  villages: a.villages ?? '',
  itemQuantity: a.itemQuantity === null ? '' : String(a.itemQuantity),
  itemUnit: a.itemUnit ?? '',
  families: a.families === null ? '' : String(a.families),
});

/** Where the project runs: the table that Form 3 and Form 7 ask for in section 2.3. */
export function ProjectAreasPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<ProjectAreasData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await getProjectAreasAction(projectId);
      if (r.ok) {
        setData(r.data);
        setLoadError(null);
      } else setLoadError(r.error);
    } catch {
      setLoadError('Could not load the areas. Please refresh the page.');
    }
  }, [projectId]);
  useEffect(() => {
    void load();
  }, [load]);

  if (loadError && !data) return <p role="alert" className="text-sm text-red-700">{loadError}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading the areas…</p>;

  const totals = areaTotals(data.areas);
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  async function run(fn: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>) {
    setBusy(true);
    setNote(null);
    try {
      const r = await fn();
      setNote(r.ok ? { kind: 'ok', text: r.message ?? 'Saved.' } : { kind: 'error', text: r.error });
      if (r.ok) {
        setEditing(null);
        await load();
      }
    } catch {
      setNote({ kind: 'error', text: 'Could not reach the server. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    run(() => (editing === 'new' ? addProjectAreaAction(projectId, draft as AreaFormValues) : updateProjectAreaAction(projectId, editing as string, draft as AreaFormValues)));

  const form = (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <label className="text-xs font-semibold space-y-1">Region
        <input className={inputCls} maxLength={120} value={draft.region} onChange={set('region')} />
      </label>
      <label className="text-xs font-semibold space-y-1">Cities
        <input className={inputCls} maxLength={500} value={draft.cities} onChange={set('cities')} />
      </label>
      <label className="text-xs font-semibold space-y-1">Villages
        <input className={inputCls} maxLength={500} value={draft.villages} onChange={set('villages')} />
      </label>
      <label className="text-xs font-semibold space-y-1">Quantity of items
        <input className={inputCls} inputMode="decimal" value={draft.itemQuantity} onChange={set('itemQuantity')} />
      </label>
      <label className="text-xs font-semibold space-y-1">Unit (for example cows, packages)
        <input className={inputCls} maxLength={40} value={draft.itemUnit} onChange={set('itemUnit')} />
      </label>
      <label className="text-xs font-semibold space-y-1">Families
        <input className={inputCls} inputMode="numeric" value={draft.families} onChange={set('families')} />
      </label>
      <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
        <button className={btnCls} disabled={busy} onClick={save}>{editing === 'new' ? 'Add area' : 'Save area'}</button>
        <button className={ghostCls} disabled={busy} onClick={() => setEditing(null)}>Cancel</button>
      </div>
    </div>
  );

  return (
    <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3" aria-labelledby="areas-title">
      <div>
        <h2 id="areas-title" className="text-sm font-bold">Where the project runs</h2>
        <p className="text-xs text-slate-500">
          One row for each region. The donor forms ask for this table, and the people are counted as five to a family.
        </p>
      </div>
      {data.areas.length === 0 && editing !== 'new' && <p className="text-sm text-slate-500">No area added yet.</p>}
      <ul className="space-y-2">
        {data.areas.map((a) =>
          editing === a.id ? (
            <li key={a.id}>{form}</li>
          ) : (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-sm">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{a.region}</p>
                <p className="text-xs text-slate-600">
                  {[a.cities && `Cities: ${a.cities}`, a.villages && `Villages: ${a.villages}`].filter(Boolean).join(' · ') || 'No places listed'}
                </p>
                <p className="text-xs text-slate-600">
                  {a.itemQuantity !== null ? `${a.itemQuantity.toLocaleString('en-US')} ${a.itemUnit ?? 'items'}` : 'No quantity'} ·{' '}
                  {a.families !== null ? `${a.families.toLocaleString('en-US')} families (${peopleFromFamilies(a.families).toLocaleString('en-US')} people)` : 'No family count'}
                </p>
              </div>
              {data.canWrite && (
                <div className="flex gap-2">
                  <button className={ghostCls} disabled={busy} onClick={() => { setDraft(toDraft(a)); setEditing(a.id); setNote(null); }}>Edit</button>
                  <button className={ghostCls} disabled={busy} onClick={() => { if (window.confirm(`Remove ${a.region}?`)) void run(() => deleteProjectAreaAction(projectId, a.id)); }}>Remove</button>
                </div>
              )}
            </li>
          ),
        )}
      </ul>
      {editing === 'new' && form}
      <div className="flex flex-wrap items-center gap-3">
        {data.canWrite && editing === null && (
          <button className={btnCls} onClick={() => { setDraft(EMPTY); setEditing('new'); setNote(null); }}>Add area</button>
        )}
        {data.areas.length > 0 && (
          <span className="text-xs text-slate-600">
            Total: <strong>{totals.families.toLocaleString('en-US')}</strong> families, <strong>{totals.people.toLocaleString('en-US')}</strong> people
          </span>
        )}
      </div>
      {note && <p role={note.kind === 'error' ? 'alert' : 'status'} className={`text-xs ${note.kind === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>{note.text}</p>}
    </section>
  );
}
