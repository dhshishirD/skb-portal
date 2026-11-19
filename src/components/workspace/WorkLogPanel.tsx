'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Download, PenLine } from 'lucide-react';
import {
  DAY_TYPES,
  DAY_TYPE_LABELS,
  PLACE_SUGGESTIONS,
  STATUS_LABELS,
  addMonths,
  buildRows,
  isMonth,
  lastDay,
  missingDays,
  monthOf,
  monthTitle,
  shortDate,
  summarize,
  todayInDhaka,
  type DayType,
  type StatementRow,
} from '@/lib/workStatement';
import {
  clearWorkDayAction,
  getMyMonthAction,
  getMySignatureAction,
  getStatementSignaturesAction,
  removeSignatureAction,
  saveSignatureAction,
  saveWorkDayAction,
  submitStatementAction,
  type MonthData,
  type WorkActionResult,
} from '@/server/actions/workStatement';
import { downloadStatementDocx, toDocData } from './downloadStatement';

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white';
const labelCls = 'block text-xs font-bold text-slate-600 mb-1';
const btnCls = 'px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';
const ghostCls = 'px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 disabled:opacity-50';
type Note = { kind: 'ok' | 'error'; text: string } | null;

const TYPE_CHIP: Record<DayType, string> = {
  office: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  field: 'bg-sky-50 text-sky-700 border-sky-200',
  tour: 'bg-violet-50 text-violet-700 border-violet-200',
  leave: 'bg-amber-50 text-amber-700 border-amber-200',
  off: 'bg-slate-100 text-slate-600 border-slate-200',
};

/** My daily work log for one month, and the button that turns the month into a Work Statement. */
export function WorkLogPanel() {
  const [month, setMonth] = useState(() => monthOf(todayInDhaka()));
  const [data, setData] = useState<MonthData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const [sign, setSign] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await getMyMonthAction(month);
      if (r.ok) {
        setData(r.data);
        setLoadError(null);
      } else setLoadError(r.error);
    } catch {
      setLoadError('Could not load your work log. Please refresh the page.');
    }
  }, [month]);
  useEffect(() => {
    setData(null);
    void load();
  }, [load]);

  const run = async (fn: () => Promise<WorkActionResult>): Promise<boolean> => {
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

  const rows = buildRows(month, data.days);
  const sum = summarize(rows);
  const st = data.statement;
  const status = st?.status ?? 'draft';
  const editable = status === 'draft' || status === 'returned';
  const monthEnded = data.today >= lastDay(month);
  const gaps = missingDays(rows);
  const nextOk = addMonths(month, 1) <= monthOf(data.today);

  const download = async () => {
    setBusy(true);
    try {
      let signatures = null;
      if (st) {
        const r = await getStatementSignaturesAction(st.id);
        if (r.ok) signatures = r.data;
      }
      await downloadStatementDocx(toDocData({ owner: data.me, month, days: data.days, statement: st, verifier: data.verifier, approver: data.approver, verifiedBy: data.verifiedBy, approvedBy: data.approvedBy, signatures }));
    } catch {
      setNote({ kind: 'error', text: 'The Word file could not be made. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  const fillEmpty = async () => {
    const todo = gaps.filter((d) => d <= data.today);
    await run(async () => {
      for (const date of todo) {
        const r = await saveWorkDayAction({ date, dayType: 'office', place: '', tasks: '' });
        if (!r.ok) return r;
      }
      return { ok: true, message: `${todo.length} days marked as office duty. Add a line about the work on each when you can.` };
    });
  };

  return (
    <section className="space-y-4" aria-label="My work log">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" className={ghostCls} aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>
            <ChevronLeft size={14} />
          </button>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 min-w-[11rem] justify-center">
            <CalendarDays size={16} /> {monthTitle(month)}
          </h2>
          <button type="button" className={ghostCls} aria-label="Next month" disabled={!nextOk} onClick={() => isMonth(addMonths(month, 1)) && setMonth(addMonths(month, 1))}>
            <ChevronRight size={14} />
          </button>
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : status === 'returned' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      {status === 'returned' && st?.returnNote && (
        <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <b>Returned for changes:</b> {st.returnNote}
        </p>
      )}
      <p className="text-xs text-slate-600">
        Verifier: <b>{data.verifier?.fullName ?? 'none (goes straight to the approver)'}</b> · Approver: <b>{data.approver?.fullName ?? 'not set yet'}</b>
        {!data.reviewersSet && <span className="text-red-700"> · Ask the administrator to set your approver before you submit.</span>}
      </p>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
        {([['Days', sum.total], ['Office', sum.office], ['Field', sum.field], ['Tour', sum.tour], ['Leave / off', sum.leave + sum.off], ['To fill in', sum.missing]] as const).map(([label, n]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-2">
            <p className={`text-lg font-bold ${label === 'To fill in' && n > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{n}</p>
            <p className="text-[11px] text-slate-500">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-500">Friday and Saturday are off days unless you add a working day on them.</p>

      {note && (
        <p role="status" className={`text-sm ${note.kind === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>
          {note.text}
        </p>
      )}

      {editable && gaps.some((d) => d <= data.today) && (
        <button type="button" className={ghostCls} disabled={busy} onClick={() => void fillEmpty()}>
          Mark my empty days up to today as office duty
        </button>
      )}

      <datalist id="work-places">
        {PLACE_SUGGESTIONS.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <ul className="space-y-2">
        {rows.map((r) => (
          <DayRowView key={r.date} row={r} data={data} editable={editable && r.date <= data.today} busy={busy} run={run} />
        ))}
      </ul>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <p className="text-sm font-bold text-slate-900">Work Statement for {monthTitle(month)}</p>
        {editable && !monthEnded && <p className="text-sm text-slate-600">You can submit this month from its last day ({shortDate(lastDay(month))}). Until then you can still download a draft.</p>}
        {editable && monthEnded && gaps.length > 0 && (
          <p className="text-sm text-amber-800">
            {gaps.length} working {gaps.length === 1 ? 'day is' : 'days are'} not filled in yet ({gaps.slice(0, 6).map((d) => d.slice(8)).join(', ')}
            {gaps.length > 6 ? '…' : ''}). Fill them in, or mark them as leave, then submit.
          </p>
        )}
        {editable && monthEnded && gaps.length === 0 && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={sign && data.hasSignature} disabled={!data.hasSignature} onChange={(e) => setSign(e.target.checked)} />
              Add my saved signature {!data.hasSignature && <span className="text-xs text-slate-500">(optional; you have not saved one yet, see below)</span>}
            </label>
            <button type="button" className={btnCls} disabled={busy || !data.reviewersSet} onClick={() => void run(() => submitStatementAction(month, sign && data.hasSignature))}>
              Submit {monthTitle(month)}
            </button>
            <p className="text-[11px] text-slate-500">After you submit, the days of this month are locked. A signature is never required.</p>
          </div>
        )}
        {!editable && <p className="text-sm text-slate-600">This statement is locked while it is being reviewed or after it is approved.</p>}
        <button type="button" className={ghostCls} disabled={busy} onClick={() => void download()}>
          <Download size={12} className="inline" /> Download Word file{status === 'approved' ? '' : ' (draft)'}
        </button>
      </div>

      <SignatureBox hasSignature={data.hasSignature} busy={busy} run={run} />
    </section>
  );
}

function DayRowView({ row, data, editable, busy, run }: { row: StatementRow; data: MonthData; editable: boolean; busy: boolean; run: (fn: () => Promise<WorkActionResult>) => Promise<boolean> }) {
  const entered = data.days.find((d) => d.date === row.date);
  const [open, setOpen] = useState(false);
  const [dayType, setDayType] = useState<DayType>(entered?.dayType ?? 'office');
  const [place, setPlace] = useState(entered?.place ?? '');
  const [tasks, setTasks] = useState(entered?.tasks ?? '');
  const [projectId, setProjectId] = useState(entered?.projectId ?? '');

  const save = async () => {
    if (await run(() => saveWorkDayAction({ date: row.date, dayType, place, tasks, projectId: projectId || null }))) setOpen(false);
  };
  const clear = async () => {
    if (await run(() => clearWorkDayAction(row.date))) {
      setOpen(false);
      setTasks('');
      setPlace('');
    }
  };

  return (
    <li className={`rounded-xl border bg-white p-3 ${row.dayType === null && row.date <= data.today ? 'border-amber-300' : 'border-slate-200'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            {shortDate(row.date)} <span className="text-xs font-normal text-slate-500">{row.weekday}</span>
          </p>
          {row.dayType === null ? (
            <p className="text-xs text-slate-500">{row.date > data.today ? 'Not yet' : 'Not filled in'}</p>
          ) : (
            <p className="text-xs text-slate-600 break-words">
              <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border mr-2 ${TYPE_CHIP[row.dayType]}`}>{DAY_TYPE_LABELS[row.dayType]}</span>
              {row.place}
              {row.tasks && row.tasks !== 'Weekend' ? ` · ${row.tasks.length > 120 ? `${row.tasks.slice(0, 120)}…` : row.tasks}` : ''}
              {row.automatic ? ' (weekend)' : ''}
            </p>
          )}
        </div>
        {editable && (
          <button type="button" className={ghostCls} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            <PenLine size={12} className="inline" /> {row.dayType === null ? 'Fill in' : row.automatic ? 'I worked' : 'Edit'}
          </button>
        )}
      </div>
      {open && editable && (
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor={`type-${row.date}`}>Kind of day</label>
            <select id={`type-${row.date}`} className={inputCls} value={dayType} onChange={(e) => setDayType(e.target.value as DayType)}>
              {DAY_TYPES.map((t) => (
                <option key={t} value={t}>{DAY_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor={`place-${row.date}`}>Place (optional)</label>
            <input id={`place-${row.date}`} className={inputCls} list="work-places" maxLength={120} value={place} onChange={(e) => setPlace(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor={`tasks-${row.date}`}>What you did</label>
            <textarea id={`tasks-${row.date}`} className={inputCls} rows={3} maxLength={1500} value={tasks} onChange={(e) => setTasks(e.target.value)} />
          </div>
          {data.projects.length > 0 && (
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor={`project-${row.date}`}>Project (optional)</label>
              <select id={`project-${row.date}`} className={inputCls} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">No particular project</option>
                {data.projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} · {p.title}</option>
                ))}
              </select>
            </div>
          )}
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <button type="button" className={btnCls} disabled={busy} onClick={() => void save()}>Save day</button>
            {entered && (
              <button type="button" className={ghostCls} disabled={busy} onClick={() => void clear()}>Remove this entry</button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function SignatureBox({ hasSignature, busy, run }: { hasSignature: boolean; busy: boolean; run: (fn: () => Promise<WorkActionResult>) => Promise<boolean> }) {
  const [preview, setPreview] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let live = true;
    if (!hasSignature) {
      setPreview(null);
      return;
    }
    getMySignatureAction()
      .then((r) => live && r.ok && setPreview(r.data))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [hasSignature]);

  const upload = async () => {
    const file = input.current?.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set('file', file);
    if (await run(() => saveSignatureAction(fd))) if (input.current) input.current.value = '';
  };

  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4">
      <summary className="text-sm font-bold text-slate-900 cursor-pointer">My saved signature (optional)</summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-slate-600">
          Save a picture of your signature once (PNG or JPG, up to 500 KB; a photo of your signature on white paper works). At each step you may tick &ldquo;add my saved signature&rdquo; and it is placed on the Word file.
          Nobody else can see the picture except on a statement where you chose to sign. It is never required.
        </p>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Your saved signature" className="max-h-16 border border-slate-200 rounded bg-white p-1" />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input ref={input} type="file" accept="image/png,image/jpeg" aria-label="Signature picture" className="text-xs" />
          <button type="button" className={btnCls} disabled={busy} onClick={() => void upload()}>{hasSignature ? 'Replace signature' : 'Save signature'}</button>
          {hasSignature && (
            <button type="button" className={ghostCls} disabled={busy} onClick={() => void run(() => removeSignatureAction())}>Remove</button>
          )}
        </div>
      </div>
    </details>
  );
}
