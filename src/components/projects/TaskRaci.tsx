'use client';

import { useState } from 'react';
import { RACI_LABEL, raciGaps, raciMatrix, type TaskRaci } from '@/lib/taskRaci';
import type { Task, TeamMember } from '@/lib/tasks';

const labelCls = 'block text-xs font-bold text-slate-600 mb-1';
const btnCls = 'px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';
const ghostCls = 'px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 disabled:opacity-50';

/** One short line: who is Responsible, Accountable, Consulted and Informed on a task. */
export function RaciLine({ task, names }: { task: Task; names: Record<string, string> }) {
  const n = (id: string) => names[id] ?? 'Unknown';
  const parts: string[] = [];
  if (task.raci.accountableId) parts.push(`Accountable: ${n(task.raci.accountableId)}`);
  if (task.raci.consultedIds.length) parts.push(`Consulted: ${task.raci.consultedIds.map(n).join(', ')}`);
  if (task.raci.informedIds.length) parts.push(`Informed: ${task.raci.informedIds.map(n).join(', ')}`);
  if (parts.length === 0) return null;
  return <p className="text-[11px] text-slate-600 mt-0.5">{parts.join(' · ')}</p>;
}

/** Managers choose Accountable, Consulted and Informed. Responsible is the person the task is assigned to. */
export function RaciEditor({
  task,
  team,
  busy,
  onSave,
  onCancel,
}: {
  task: Task;
  team: TeamMember[];
  busy: boolean;
  onSave: (v: TaskRaci) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [a, setA] = useState(task.raci.accountableId ?? '');
  const [c, setC] = useState<string[]>(task.raci.consultedIds);
  const [i, setI] = useState<string[]>(task.raci.informedIds);
  const toggle = (list: string[], set: (v: string[]) => void, id: string) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  // one letter per person: picking someone for one list takes them out of the others
  const pickC = (id: string) => {
    if (a === id) setA('');
    setI(i.filter((x) => x !== id));
    toggle(c, setC, id);
  };
  const pickI = (id: string) => {
    if (a === id) setA('');
    setC(c.filter((x) => x !== id));
    toggle(i, setI, id);
  };
  const pickA = (id: string) => {
    setA(id);
    setC(c.filter((x) => x !== id));
    setI(i.filter((x) => x !== id));
  };
  return (
    <form
      className="mt-2 space-y-3 rounded-lg border border-slate-200 p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave({ accountableId: a || null, consultedIds: c, informedIds: i });
      }}
    >
      <p className="text-xs text-slate-600">
        <b>Responsible</b> is the person the task is assigned to{task.assigneeName ? ` (${task.assigneeName})` : ' (nobody yet; choose one under Edit)'}. Set the other three here.
      </p>
      <label className="block">
        <span className={labelCls}>{RACI_LABEL.accountable}: one person</span>
        <select className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white" value={a} onChange={(e) => pickA(e.target.value)}>
          <option value="">Nobody yet</option>
          {team.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <fieldset>
          <legend className={labelCls}>{RACI_LABEL.consulted}</legend>
          {team.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm py-0.5">
              <input type="checkbox" checked={c.includes(m.id)} onChange={() => pickC(m.id)} /> {m.name}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend className={labelCls}>{RACI_LABEL.informed}</legend>
          {team.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm py-0.5">
              <input type="checkbox" checked={i.includes(m.id)} onChange={() => pickI(m.id)} /> {m.name}
            </label>
          ))}
        </fieldset>
      </div>
      <div className="flex gap-2">
        <button className={btnCls} disabled={busy}>Save roles</button>
        <button type="button" className={ghostCls} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/** Tasks down the side, people across the top, R / A / C / I in the cells. */
export function RaciMatrixView({ tasks, names }: { tasks: Task[]; names: Record<string, string> }) {
  const m = raciMatrix(tasks, new Map(Object.entries(names)));
  const gaps = raciGaps(tasks);
  if (tasks.length === 0) return <p className="text-sm text-slate-500">No tasks yet.</p>;
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600">
        <b>R</b> Responsible (assigned) · <b>A</b> Accountable · <b>C</b> Consulted · <b>I</b> Informed.
        {gaps.noResponsible > 0 && <span className="text-amber-800"> {gaps.noResponsible} open task{gaps.noResponsible === 1 ? ' has' : 's have'} nobody responsible.</span>}
        {gaps.noAccountable > 0 && <span className="text-amber-800"> {gaps.noAccountable} open task{gaps.noAccountable === 1 ? ' has' : 's have'} nobody accountable.</span>}
      </p>
      {m.people.length === 0 ? (
        <p className="text-sm text-slate-500">No roles set yet. Open a task and choose Roles.</p>
      ) : (
        <>
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-xs font-bold text-slate-600 p-2 border border-slate-200 bg-slate-50">Task</th>
                  {m.people.map((p) => (
                    <th key={p.id} className="text-left text-xs font-bold text-slate-600 p-2 border border-slate-200 bg-slate-50">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {m.rows.map((r) => (
                  <tr key={r.taskId}>
                    <th scope="row" className="text-left font-medium text-slate-900 p-2 border border-slate-200">{r.title}</th>
                    {m.people.map((p) => (
                      <td key={p.id} className={`p-2 border border-slate-200 text-center font-bold ${r.cells[p.id] ? 'bg-sky-50 text-sky-900' : 'text-slate-300'}`}>{r.cells[p.id] ?? '·'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="lg:hidden space-y-2">
            {m.rows.map((r) => (
              <li key={r.taskId} className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-bold text-slate-900">{r.title}</p>
                <p className="text-xs text-slate-600 mt-1">
                  {m.people.filter((p) => r.cells[p.id]).map((p) => `${p.name}: ${r.cells[p.id]}`).join(' · ') || 'No roles set'}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
