'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { PLAN_STATUS_LABELS, summarizePlan } from '@/lib/workPlan';
import { PLACE_SUGGESTIONS, shortDate, todayInDhaka, weekdayName } from '@/lib/workStatement';
import { assignTaskAction, getTeamPlanAction, removePlanItemAction, type PlanActionResult, type TeamPlanData } from '@/server/actions/workPlan';
import { STATUS_CHIP } from './DailyPlanPanel';

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white';
const labelCls = 'block text-xs font-bold text-slate-600 mb-1';
const btnCls = 'px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';
const ghostCls = 'px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 disabled:opacity-50';
type Note = { kind: 'ok' | 'error'; text: string } | null;

const shiftDate = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Everyone's plan for one day, for the Executive Director and the Super Admin, who may also give a task. */
export function TeamPlanPanel() {
  const [date, setDate] = useState(() => todayInDhaka());
  const [data, setData] = useState<TeamPlanData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [giveTo, setGiveTo] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await getTeamPlanAction(date);
      if (r.ok) {
        setData(r.data);
        setLoadError(null);
      } else setLoadError(r.error);
    } catch {
      setLoadError('Could not load the team plan. Please refresh the page.');
    }
  }, [date]);
  useEffect(() => {
    setData(null);
    void load();
  }, [load]);

  const run = async (fn: () => Promise<PlanActionResult>): Promise<boolean> => {
    setBusy(true);
    setNote(null);
    try {
      const r = await fn();
      if (r.ok) {
        setNote({ kind: 'ok', text: r.message ?? 'Done.' });
        await load();
        return true;
      }
      setNote({ kind: 'error', text: r.error });
      return false;
    } catch {
      setNote({ kind: 'error', text: 'Something went wrong. Please try again.' });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const noPlan = useMemo(() => (data ? data.people.filter((p) => p.items.length === 0) : []), [data]);

  if (loadError) return <p className="text-sm text-red-700">{loadError}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading…</p>;
  const shown = onlyMissing ? noPlan : data.people;

  return (
    <section className="space-y-4" aria-label="Team plan">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" className={ghostCls} aria-label="Previous day" onClick={() => setDate(shiftDate(date, -1))}>
            <ChevronLeft size={14} />
          </button>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 min-w-[12rem] justify-center">
            <Users size={16} /> {shortDate(date)} <span className="text-xs font-normal text-slate-500">{weekdayName(date)}</span>
          </h2>
          <button type="button" className={ghostCls} aria-label="Next day" onClick={() => setDate(shiftDate(date, 1))}>
            <ChevronRight size={14} />
          </button>
        </div>
        {date !== data.today && (
          <button type="button" className={ghostCls} onClick={() => setDate(data.today)}>
            Go to today
          </button>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
        Show only people with no plan for this day ({noPlan.length})
      </label>

      {note && (
        <p role="status" className={`text-sm ${note.kind === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>
          {note.text}
        </p>
      )}

      <datalist id="team-places">
        {PLACE_SUGGESTIONS.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>

      {shown.length === 0 && <p className="text-sm text-slate-500">{onlyMissing ? 'Everyone has a plan for this day.' : 'No staff found.'}</p>}
      <ul className="space-y-3">
        {shown.map((p) => {
          const sum = summarizePlan(p.items);
          return (
            <li key={p.id} className={`rounded-xl border bg-white p-3 space-y-2 ${p.items.length === 0 ? 'border-amber-300' : 'border-slate-200'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{p.fullName}</p>
                  <p className="text-xs text-slate-500">
                    {p.designation ? `${p.designation} · ` : ''}
                    {p.items.length === 0 ? 'No plan for this day' : `${sum.done} of ${sum.total} done${sum.notDone ? `, ${sum.notDone} not done` : ''}`}
                  </p>
                </div>
                <button type="button" className={ghostCls} aria-expanded={giveTo === p.id} onClick={() => setGiveTo(giveTo === p.id ? null : p.id)}>
                  Give a task
                </button>
              </div>
              {p.items.length > 0 && (
                <ul className="space-y-1">
                  {p.items.map((i) => {
                    const project = data.projects.find((x) => x.id === i.projectId);
                    return (
                      <li key={i.id} className="flex flex-wrap items-start justify-between gap-2 text-sm text-slate-800">
                        <div className="min-w-0">
                          <span className="break-words">{i.title}</span>{' '}
                          <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_CHIP[i.status]}`}>{PLAN_STATUS_LABELS[i.status]}</span>
                          {i.assigned && <span className="ml-1 inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200">Given by {data.givers[i.assignedBy ?? ''] ?? 'management'}</span>}
                          <span className="block text-xs text-slate-500 break-words">
                            {[i.place, project ? `${project.code} · ${project.title}` : ''].filter(Boolean).join(' · ')}
                            {i.status === 'not_done' && i.reason ? ` · Reason: ${i.reason}` : ''}
                          </span>
                        </div>
                        {i.assigned && i.assignedBy && (
                          <button type="button" className="text-xs text-red-700 underline disabled:opacity-50" disabled={busy} aria-label={`Remove ${i.title}`} onClick={() => void run(() => removePlanItemAction(i.id))}>
                            Remove
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {giveTo === p.id && <GiveTask personId={p.id} date={date} data={data} busy={busy} run={run} onDone={() => setGiveTo(null)} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function GiveTask({ personId, date, data, busy, run, onDone }: { personId: string; date: string; data: TeamPlanData; busy: boolean; run: (fn: () => Promise<PlanActionResult>) => Promise<boolean>; onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [projectId, setProjectId] = useState('');
  const [when, setWhen] = useState(date);
  const give = async () => {
    if (await run(() => assignTaskAction(personId, { date: when, title, place, note, projectId: projectId || null }))) onDone();
  };
  return (
    <div className="grid sm:grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
      <div className="sm:col-span-2">
        <label className={labelCls} htmlFor={`give-title-${personId}`}>Task</label>
        <input id={`give-title-${personId}`} className={inputCls} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className={labelCls} htmlFor={`give-date-${personId}`}>Day</label>
        <input id={`give-date-${personId}`} type="date" className={inputCls} value={when} onChange={(e) => setWhen(e.target.value)} />
      </div>
      <div>
        <label className={labelCls} htmlFor={`give-place-${personId}`}>Place (optional)</label>
        <input id={`give-place-${personId}`} className={inputCls} list="team-places" maxLength={120} value={place} onChange={(e) => setPlace(e.target.value)} />
      </div>
      {data.projects.length > 0 && (
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor={`give-project-${personId}`}>Project (optional)</label>
          <select id={`give-project-${personId}`} className={inputCls} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">No particular project</option>
            {data.projects.map((p) => (
              <option key={p.id} value={p.id}>{p.code} · {p.title}</option>
            ))}
          </select>
        </div>
      )}
      <div className="sm:col-span-2">
        <label className={labelCls} htmlFor={`give-note-${personId}`}>Note (optional)</label>
        <input id={`give-note-${personId}`} className={inputCls} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <button type="button" className={btnCls} disabled={busy || !title.trim() || !when} onClick={() => void give()}>Give task</button>
      </div>
    </div>
  );
}
