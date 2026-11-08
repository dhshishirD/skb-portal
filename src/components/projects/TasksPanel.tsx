'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import {
  PRIORITIES,
  PRIORITY_LABELS,
  STATUSES,
  STATUS_LABELS,
  canChangeStatus,
  countTasks,
  isOverdue,
  sortTasks,
  type Task,
  type TaskFormValues,
  type TaskPriority,
  type TaskStatus,
  type TasksData,
} from '@/lib/tasks';
import {
  addTaskAction,
  addTaskCommentAction,
  deleteTaskAction,
  getTasksAction,
  setTaskStatusAction,
  updateTaskAction,
  type TaskActionResult,
} from '@/server/actions/tasks';

type Note = { kind: 'ok' | 'error'; text: string } | null;
type Run = (fn: () => Promise<TaskActionResult>) => Promise<boolean>;

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white';
const labelCls = 'block text-xs font-bold text-slate-600 mb-1';
const btnCls = 'px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';
const ghostCls = 'px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 disabled:opacity-50';
const statusCls: Record<TaskStatus, string> = {
  todo: 'bg-slate-100 text-slate-700',
  doing: 'bg-blue-100 text-blue-800',
  blocked: 'bg-red-100 text-red-800',
  done: 'bg-emerald-100 text-emerald-800',
};
const todayIso = () => new Date().toISOString().slice(0, 10);

/** Tasks tab: the project workplan. Managers add and assign; assignees update their own status. */
export function TasksPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<TasksData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<'all' | 'mine' | TaskStatus>('all');

  const load = useCallback(async () => {
    try {
      const r = await getTasksAction(projectId);
      if (r.ok) {
        setData(r.data);
        setLoadError(null);
      } else setLoadError(r.error);
    } catch {
      setLoadError('Could not load the tasks. Please refresh the page.');
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run: Run = async (fn) => {
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

  const today = todayIso();
  const counts = countTasks(data.tasks, today);
  const shown = sortTasks(data.tasks).filter((t) => (filter === 'all' ? true : filter === 'mine' ? t.assigneeId === data.userId : t.status === filter));

  return (
    <div className="space-y-4">
      {data.closed && <p className="text-sm text-slate-600">This project is closed, so the tasks are read-only.</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-700">
          <b>{counts.done}</b> of <b>{counts.total}</b> done ({counts.percentDone}%)
          {counts.overdue > 0 && <span className="text-red-700"> · {counts.overdue} overdue</span>}
        </p>
        <div className="flex items-center gap-2">
          <select aria-label="Filter tasks" className="px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="all">All tasks</option>
            <option value="mine">Assigned to me</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {data.canManage && (
            <button type="button" className={btnCls} onClick={() => setAdding((v) => !v)}>
              <Plus size={12} className="inline" /> Add task
            </button>
          )}
        </div>
      </div>
      {note && (
        <p role="status" className={`text-sm ${note.kind === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>
          {note.text}
        </p>
      )}
      {adding && data.canManage && (
        <TaskForm
          data={data}
          busy={busy}
          submitLabel="Add task"
          onCancel={() => setAdding(false)}
          onSubmit={async (v) => {
            if (await run(() => addTaskAction(projectId, v))) setAdding(false);
          }}
        />
      )}
      {shown.length === 0 && <p className="text-sm text-slate-500">{data.tasks.length === 0 ? 'No tasks yet.' : 'No tasks match this filter.'}</p>}
      <ul className="space-y-2">
        {shown.map((t) => (
          <TaskRowView key={t.id} task={t} data={data} busy={busy} run={run} projectId={projectId} today={today} />
        ))}
      </ul>
    </div>
  );
}

function TaskRowView({ task, data, busy, run, projectId, today }: { task: Task; data: TasksData; busy: boolean; run: Run; projectId: string; today: string }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState('');
  const overdue = isOverdue(task, today);
  const mayStatus = !data.closed && canChangeStatus(task, data.userId, data.canManage);

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-sm font-bold ${task.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{task.title}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {task.assigneeName ? `Assigned to ${task.assigneeName}` : 'Not assigned'} · {PRIORITY_LABELS[task.priority]} priority
            {task.dueDate && <span className={overdue ? 'text-red-700 font-bold' : ''}> · due {task.dueDate}{overdue ? ' (overdue)' : ''}</span>}
            {task.nodeLabel && ` · ${task.nodeLabel}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mayStatus ? (
            <select
              aria-label={`Status of ${task.title}`}
              className={`px-2 py-1 text-xs font-bold rounded-lg border-0 ${statusCls[task.status]}`}
              value={task.status}
              disabled={busy}
              onChange={(e) => void run(() => setTaskStatusAction(projectId, task.id, e.target.value as TaskStatus))}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          ) : (
            <span className={`px-2 py-1 text-xs font-bold rounded-lg ${statusCls[task.status]}`}>{STATUS_LABELS[task.status]}</span>
          )}
          {data.canManage && (
            <>
              <button type="button" className={ghostCls} onClick={() => setEditing((v) => !v)}>
                Edit
              </button>
              <button
                type="button"
                aria-label={`Remove ${task.title}`}
                disabled={busy}
                className="text-slate-400 hover:text-red-600 disabled:opacity-50"
                onClick={() => {
                  if (window.confirm('Remove this task and its comments?')) void run(() => deleteTaskAction(projectId, task.id));
                }}
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
      {task.description && <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{task.description}</p>}

      {editing && data.canManage && (
        <TaskForm
          data={data}
          busy={busy}
          initial={task}
          submitLabel="Save"
          onCancel={() => setEditing(false)}
          onSubmit={async (v) => {
            if (await run(() => updateTaskAction(projectId, task.id, v))) setEditing(false);
          }}
        />
      )}

      <button type="button" className="text-[11px] font-bold text-slate-700 underline mt-2" onClick={() => setOpen((v) => !v)}>
        <MessageSquare size={11} className="inline" /> {open ? 'Hide comments' : `Comments (${task.comments.length})`}
      </button>
      {open && (
        <div className="mt-1.5 space-y-1.5">
          {task.comments.map((c) => (
            <p key={c.id} className="text-xs text-slate-700 bg-slate-50 rounded-lg p-2">
              <b>{c.authorName ?? 'Someone'}</b> <span className="text-slate-400">{c.createdAt.slice(0, 10)}</span>
              <br />
              <span className="whitespace-pre-wrap">{c.body}</span>
            </p>
          ))}
          {data.canComment && (
            <form
              className="flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await run(() => addTaskCommentAction(projectId, task.id, comment))) setComment('');
              }}
            >
              <input className={inputCls} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment" aria-label="Comment" />
              <button className={btnCls} disabled={busy}>
                Send
              </button>
            </form>
          )}
        </div>
      )}
    </li>
  );
}

function TaskForm({
  data,
  busy,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  data: TasksData;
  busy: boolean;
  initial?: Task;
  submitLabel: string;
  onSubmit: (v: TaskFormValues) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    assigneeId: initial?.assigneeId ?? '',
    nodeId: initial?.nodeId ?? '',
    dueDate: initial?.dueDate ?? '',
    priority: (initial?.priority ?? 'medium') as TaskPriority,
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  return (
    <form
      className="mt-2 grid gap-2 sm:grid-cols-2 rounded-lg border border-slate-200 p-2.5"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(f);
      }}
    >
      <label className="sm:col-span-2">
        <span className={labelCls}>Task</span>
        <input className={inputCls} value={f.title} onChange={set('title')} required />
      </label>
      <label className="sm:col-span-2">
        <span className={labelCls}>Details (optional)</span>
        <textarea className={inputCls} rows={2} value={f.description} onChange={set('description')} />
      </label>
      <label>
        <span className={labelCls}>Assigned to</span>
        <select className={inputCls} value={f.assigneeId} onChange={set('assigneeId')}>
          <option value="">Not assigned</option>
          {data.team.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={labelCls}>Due date (optional)</span>
        <input type="date" className={inputCls} value={f.dueDate} onChange={set('dueDate')} />
      </label>
      <label>
        <span className={labelCls}>Priority</span>
        <select className={inputCls} value={f.priority} onChange={set('priority')}>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={labelCls}>Linked logframe item (optional)</span>
        <select className={inputCls} value={f.nodeId} onChange={set('nodeId')}>
          <option value="">None</option>
          {data.nodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <button className={btnCls} disabled={busy}>
          {submitLabel}
        </button>
        <button type="button" className={ghostCls} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
