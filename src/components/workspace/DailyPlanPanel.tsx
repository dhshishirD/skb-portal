'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ListChecks, PenLine, Plus, Trash2 } from 'lucide-react';
import { PLAN_STATUSES, PLAN_STATUS_LABELS, summarizePlan, type PlanItem, type PlanStatus } from '@/lib/workPlan';
import { PLACE_SUGGESTIONS, shortDate, todayInDhaka, weekdayName } from '@/lib/workStatement';
import {
  addPlanItemAction,
  getMyPlanAction,
  moveTasksAction,
  removePlanItemAction,
  setPlanStatusAction,
  updatePlanItemAction,
  type MyPlanData,
  type PlanActionResult,
  type ProjectRef,
} from '@/server/actions/workPlan';

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white';
const labelCls = 'block text-xs font-bold text-slate-600 mb-1';
const btnCls = 'px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';
const ghostCls = 'px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 disabled:opacity-50';
type Note = { kind: 'ok' | 'error'; text: string } | null;

export const STATUS_CHIP: Record<PlanStatus, string> = {
  planned: 'bg-slate-100 text-slate-700 border-slate-200',
  doing: 'bg-sky-50 text-sky-700 border-sky-200',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  not_done: 'bg-amber-50 text-amber-800 border-amber-200',
};

const shiftDate = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** My plan for one day: add tasks, change them during the day, report on each at the end of the day. */
export function DailyPlanPanel() {
  const [date, setDate] = useState(() => todayInDhaka());
  const [data, setData] = useState<MyPlanData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await getMyPlanAction(date);
      if (r.ok) {
        setData(r.data);
        setLoadError(null);
      } else setLoadError(r.error);
    } catch {
      setLoadError('Could not load your plan. Please refresh the page.');
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

  if (loadError) return <p className="text-sm text-red-700">{loadError}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading…</p>;

  const sum = summarizePlan(data.items);
  const isToday = date === data.today;

  return (
    <section className="space-y-4" aria-label="My daily plan">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" className={ghostCls} aria-label="Previous day" onClick={() => setDate(shiftDate(date, -1))}>
            <ChevronLeft size={14} />
          </button>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 min-w-[12rem] justify-center">
            <ListChecks size={16} /> {shortDate(date)} <span className="text-xs font-normal text-slate-500">{weekdayName(date)}</span>
          </h2>
          <button type="button" className={ghostCls} aria-label="Next day" onClick={() => setDate(shiftDate(date, 1))}>
            <ChevronRight size={14} />
          </button>
        </div>
        {!isToday && (
          <button type="button" className={ghostCls} onClick={() => setDate(data.today)}>
            Go to today
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        {([['Tasks', sum.total], ['In progress', sum.planned + sum.doing], ['Done', sum.done], ['Not done', sum.notDone]] as const).map(([label, n]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-2">
            <p className="text-lg font-bold text-slate-900">{n}</p>
            <p className="text-[11px] text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {note && (
        <p role="status" className={`text-sm ${note.kind === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>
          {note.text}
        </p>
      )}

      <datalist id="plan-places">
        {PLACE_SUGGESTIONS.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>

      <AddTask date={date} projects={data.projects} busy={busy} run={run} />

      {data.carry.length > 0 && <CarryOver data={data} date={date} busy={busy} run={run} />}

      {data.items.length === 0 ? (
        <p className="text-sm text-slate-500">No tasks for this day yet. Add what you plan to do.</p>
      ) : (
        <ul className="space-y-2">
          {data.items.map((item) => (
            <TaskRow key={item.id} item={item} data={data} busy={busy} run={run} />
          ))}
        </ul>
      )}
      <p className="text-[11px] text-slate-500">
        The tasks you mark &ldquo;Done&rdquo; can fill the &ldquo;what you did&rdquo; line of your Work Log for the day. Tasks given to you by the Executive Director cannot be removed; mark them &ldquo;Not done&rdquo; with a reason if they could not be done.
      </p>
    </section>
  );
}

function AddTask({ date, projects, busy, run }: { date: string; projects: ProjectRef[]; busy: boolean; run: (fn: () => Promise<PlanActionResult>) => Promise<boolean> }) {
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [projectId, setProjectId] = useState('');
  const [more, setMore] = useState(false);
  const add = async () => {
    if (await run(() => addPlanItemAction({ date, title, place, projectId: projectId || null }))) {
      setTitle('');
      setPlace('');
      setProjectId('');
    }
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
      <div className="flex gap-2">
        <label htmlFor="new-task" className="sr-only">New task</label>
        <input
          id="new-task"
          className={inputCls}
          maxLength={200}
          placeholder="What will you do?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && title.trim() && !busy) void add();
          }}
        />
        <button type="button" className={btnCls} disabled={busy || !title.trim()} onClick={() => void add()}>
          <Plus size={12} className="inline" /> Add
        </button>
      </div>
      <button type="button" className="text-xs text-slate-600 underline" aria-expanded={more} onClick={() => setMore((v) => !v)}>
        {more ? 'Hide details' : 'Place and project (optional)'}
      </button>
      {more && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="new-place">Place</label>
            <input id="new-place" className={inputCls} list="plan-places" maxLength={120} value={place} onChange={(e) => setPlace(e.target.value)} />
          </div>
          {projects.length > 0 && (
            <div>
              <label className={labelCls} htmlFor="new-project">Project</label>
              <select id="new-project" className={inputCls} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">No particular project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} · {p.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CarryOver({ data, date, busy, run }: { data: MyPlanData; date: string; busy: boolean; run: (fn: () => Promise<PlanActionResult>) => Promise<boolean> }) {
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return (
    <details className="rounded-xl border border-amber-200 bg-amber-50 p-3" open>
      <summary className="text-sm font-bold text-amber-900 cursor-pointer">{data.carry.length} unfinished {data.carry.length === 1 ? 'task' : 'tasks'} from earlier days</summary>
      <ul className="mt-2 space-y-1">
        {data.carry.map((c) => (
          <li key={c.id} className="flex items-start gap-2 text-sm text-slate-800">
            <input id={`carry-${c.id}`} type="checkbox" className="mt-1" checked={picked.includes(c.id)} onChange={() => toggle(c.id)} />
            <label htmlFor={`carry-${c.id}`}>
              {c.title} <span className="text-xs text-slate-500">({shortDate(c.date)})</span>
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={`${btnCls} mt-3`}
        disabled={busy || picked.length === 0}
        onClick={async () => {
          if (await run(() => moveTasksAction(picked, date))) setPicked([]);
        }}
      >
        Move selected to {shortDate(date)}
      </button>
    </details>
  );
}

function TaskRow({ item, data, busy, run }: { item: PlanItem; data: MyPlanData; busy: boolean; run: (fn: () => Promise<PlanActionResult>) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [place, setPlace] = useState(item.place);
  const [note, setNote] = useState(item.note);
  const [projectId, setProjectId] = useState(item.projectId ?? '');
  const [reason, setReason] = useState(item.reason);
  const [asking, setAsking] = useState(false);
  const project = data.projects.find((p) => p.id === item.projectId);

  const setStatus = async (status: PlanStatus) => {
    if (status === 'not_done') {
      setAsking(true);
      return;
    }
    setAsking(false);
    await run(() => setPlanStatusAction(item.id, status, ''));
  };
  const saveReason = async () => {
    if (await run(() => setPlanStatusAction(item.id, 'not_done', reason))) setAsking(false);
  };
  const save = async () => {
    if (await run(() => updatePlanItemAction(item.id, { date: item.date, title, place, note, projectId: projectId || null }))) setEditing(false);
  };

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 break-words">{item.title}</p>
          <p className="text-xs text-slate-600 break-words">
            <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border mr-2 ${STATUS_CHIP[item.status]}`}>{PLAN_STATUS_LABELS[item.status]}</span>
            {item.assigned && <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border mr-2 bg-violet-50 text-violet-700 border-violet-200">Given by {data.givers[item.assignedBy ?? ''] ?? 'management'}</span>}
            {[item.place, project ? `${project.code} · ${project.title}` : ''].filter(Boolean).join(' · ')}
          </p>
          {item.note && <p className="text-xs text-slate-600 mt-1 break-words">{item.note}</p>}
          {item.status === 'not_done' && item.reason && <p className="text-xs text-amber-800 mt-1 break-words">Reason: {item.reason}</p>}
        </div>
        {!item.assigned && (
          <div className="flex gap-1">
            <button type="button" className={ghostCls} aria-expanded={editing} aria-label={`Edit ${item.title}`} onClick={() => setEditing((v) => !v)}>
              <PenLine size={12} />
            </button>
            <button type="button" className={ghostCls} disabled={busy} aria-label={`Remove ${item.title}`} onClick={() => void run(() => removePlanItemAction(item.id))}>
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Status of ${item.title}`}>
        {PLAN_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            aria-pressed={item.status === s}
            onClick={() => void setStatus(s)}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border disabled:opacity-50 ${item.status === s ? STATUS_CHIP[s] : 'border-slate-200 text-slate-600 bg-white'}`}
          >
            {PLAN_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {asking && (
        <div className="flex gap-2">
          <label htmlFor={`reason-${item.id}`} className="sr-only">Reason</label>
          <input id={`reason-${item.id}`} className={inputCls} maxLength={300} placeholder="Why could it not be done? (short)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button type="button" className={btnCls} disabled={busy} onClick={() => void saveReason()}>Save</button>
        </div>
      )}

      {editing && !item.assigned && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor={`title-${item.id}`}>Task</label>
            <input id={`title-${item.id}`} className={inputCls} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor={`place-${item.id}`}>Place</label>
            <input id={`place-${item.id}`} className={inputCls} list="plan-places" maxLength={120} value={place} onChange={(e) => setPlace(e.target.value)} />
          </div>
          {data.projects.length > 0 && (
            <div>
              <label className={labelCls} htmlFor={`project-${item.id}`}>Project</label>
              <select id={`project-${item.id}`} className={inputCls} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">No particular project</option>
                {data.projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} · {p.title}</option>
                ))}
              </select>
            </div>
          )}
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor={`note-${item.id}`}>Note (optional)</label>
            <input id={`note-${item.id}`} className={inputCls} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <button type="button" className={btnCls} disabled={busy || !title.trim()} onClick={() => void save()}>Save task</button>
          </div>
        </div>
      )}
    </li>
  );
}
