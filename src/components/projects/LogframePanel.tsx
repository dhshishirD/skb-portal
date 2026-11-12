'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { LogframeMatrix } from './LogframeMatrix';
import {
  KIND_LABELS,
  MEASURE_LABELS,
  buildTree,
  childKind,
  descendantCount,
  formatNumber,
  formatPercent,
  indicatorProgress,
  type Indicator,
  type IndicatorMeasure,
  type LogframeData,
  type LogframeKind,
  type TreeNode,
} from '@/lib/logframe';
import {
  addIndicatorAction,
  addIndicatorValueAction,
  addNodeAction,
  addNodesFromLinesAction,
  deleteIndicatorAction,
  deleteIndicatorValueAction,
  deleteNodeAction,
  getLogframeAction,
  updateIndicatorAction,
  updateNodeAction,
  validateIndicatorValueAction,
  type LogframeActionResult,
} from '@/server/actions/logframe';

type Note = { kind: 'ok' | 'error'; text: string } | null;

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white';
const labelCls = 'block text-xs font-bold text-slate-600 mb-1';
const btnCls = 'px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';
const ghostCls = 'px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 disabled:opacity-50';

/** Logframe tab: goal, outcomes, outputs, activities, with indicators and validated progress. */
export function LogframePanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<LogframeData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<'list' | 'matrix'>('list');

  const load = useCallback(async () => {
    try {
      const r = await getLogframeAction(projectId);
      if (r.ok) {
        setData(r.data);
        setLoadError(null);
      } else setLoadError(r.error);
    } catch {
      setLoadError('Could not load the logframe. Please refresh the page.');
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(fn: () => Promise<LogframeActionResult>): Promise<boolean> {
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
  }

  if (loadError) return <p className="text-sm text-red-700">{loadError}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading…</p>;

  const tree = buildTree(data.nodes);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden" role="tablist" aria-label="Logframe view">
        <div className="inline-flex rounded-xl border border-slate-300 p-0.5">
          {(['list', 'matrix'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg ${view === v ? 'bg-slate-900 text-white' : 'text-slate-700'}`}
            >
              {v === 'list' ? 'List (edit here)' : 'Table (as the donor sees it)'}
            </button>
          ))}
        </div>
      </div>
      {view === 'matrix' ? <LogframeMatrix data={data} /> : (<>
      {data.closed && <p className="text-sm text-slate-600">This project is closed, so the logframe is read-only.</p>}
      {note && (
        <p role="status" className={`text-sm ${note.kind === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>
          {note.text}
        </p>
      )}
      {tree.length === 0 && <p className="text-sm text-slate-500">No logframe yet.{data.canEditStructure ? ' Start by adding the project goal.' : ''}</p>}
      <ul className="space-y-3">
        {tree.map((t) => (
          <NodeView key={t.node.id} tree={t} data={data} busy={busy} run={run} projectId={projectId} />
        ))}
      </ul>
      {data.canEditStructure && !tree.some((t) => t.node.kind === 'goal') && (
        <AddNodeForm kind="goal" busy={busy} onSubmit={async (v) => { await run(() => addNodeAction(projectId, null, v)); }} onLines={async (t) => run(() => addNodesFromLinesAction(projectId, null, 'goal', t))} />
      )}
      </>)}
    </div>
  );
}

function NodeView({
  tree,
  data,
  busy,
  run,
  projectId,
}: {
  tree: TreeNode;
  data: LogframeData;
  busy: boolean;
  run: (fn: () => Promise<LogframeActionResult>) => Promise<boolean>;
  projectId: string;
}) {
  const { node } = tree;
  const next = childKind(node.kind);
  const indicators = data.indicators.filter((i) => i.nodeId === node.id);
  const [adding, setAdding] = useState(false);
  const [addingInd, setAddingInd] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase text-slate-500">{KIND_LABELS[node.kind]}</p>
          <p className="text-sm font-bold text-slate-900">
            {node.code}. {node.title}
          </p>
          {node.description && <p className="text-xs text-slate-600 mt-0.5">{node.description}</p>}
          {node.assumptions && <p className="text-xs text-slate-600 mt-0.5"><b>Assumes:</b> {node.assumptions}</p>}
        </div>
        {data.canEditStructure && (
          <div className="flex items-center gap-2">
          <button type="button" aria-label={`Edit ${node.code}`} disabled={busy} className="text-slate-400 hover:text-slate-700 disabled:opacity-50" onClick={() => setEditing((v) => !v)}>
            <Pencil size={14} />
          </button>
          <button
            type="button"
            aria-label={`Remove ${node.code}`}
            disabled={busy}
            className="text-slate-400 hover:text-red-600 disabled:opacity-50"
            onClick={() => {
              const n = descendantCount(tree);
              const extra = n > 1 ? ` This also removes ${n - 1} item(s) under it.` : '';
              if (window.confirm(`Remove ${node.code} and its indicators?${extra}`)) void run(() => deleteNodeAction(projectId, node.id));
            }}
          >
            <Trash2 size={14} />
          </button>
          </div>
        )}
      </div>
      {editing && (
        <EditNodeForm
          node={node}
          busy={busy}
          onSubmit={async (v) => {
            if (await run(() => updateNodeAction(projectId, node.id, v))) setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      {indicators.map((ind) => (
        <IndicatorView key={ind.id} ind={ind} data={data} busy={busy} run={run} projectId={projectId} />
      ))}

      <div className="flex gap-2 mt-2">
        {data.canEditIndicators && (
          <button type="button" className={ghostCls} onClick={() => setAddingInd((v) => !v)}>
            <Plus size={12} className="inline" /> Indicator
          </button>
        )}
        {data.canEditStructure && next && (
          <button type="button" className={ghostCls} onClick={() => setAdding((v) => !v)}>
            <Plus size={12} className="inline" /> {KIND_LABELS[next]}
          </button>
        )}
      </div>
      {addingInd && (
        <AddIndicatorForm
          busy={busy}
          onSubmit={async (v) => {
            if (await run(() => addIndicatorAction(projectId, node.id, v))) setAddingInd(false);
          }}
        />
      )}
      {adding && next && (
        <AddNodeForm
          kind={next}
          busy={busy}
          onSubmit={async (v) => {
            if (await run(() => addNodeAction(projectId, node.id, v))) setAdding(false);
          }}
          onLines={async (t) => {
            const ok = await run(() => addNodesFromLinesAction(projectId, node.id, next, t));
            if (ok) setAdding(false);
            return ok;
          }}
        />
      )}

      {tree.children.length > 0 && (
        <ul className="mt-3 ml-3 pl-3 border-l-2 border-slate-100 space-y-3">
          {tree.children.map((c) => (
            <NodeView key={c.node.id} tree={c} data={data} busy={busy} run={run} projectId={projectId} />
          ))}
        </ul>
      )}
    </li>
  );
}

function IndicatorView({
  ind,
  data,
  busy,
  run,
  projectId,
}: {
  ind: Indicator;
  data: LogframeData;
  busy: boolean;
  run: (fn: () => Promise<LogframeActionResult>) => Promise<boolean>;
  projectId: string;
}) {
  const p = indicatorProgress(ind);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [value, setValue] = useState('');
  const pct = p.percentBp === null ? 0 : Math.max(0, Math.min(100, p.percentBp / 100));

  return (
    <div className="mt-2 rounded-lg bg-slate-50 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-slate-800">{ind.name}</p>
          <p className="text-[11px] text-slate-500">
            Baseline {ind.baseline} → target {ind.target} {ind.unit}
            {ind.frequency ? ` · ${ind.frequency}` : ''}
          </p>
          {ind.meansOfVerification && <p className="text-[11px] text-slate-500">Proof: {ind.meansOfVerification}</p>}
        </div>
        {data.canEditIndicators && (
          <div className="flex items-center gap-2">
            <button type="button" aria-label={`Edit indicator ${ind.name}`} disabled={busy} className="text-slate-400 hover:text-slate-700 disabled:opacity-50" onClick={() => setEditing((v) => !v)}>
              <Pencil size={13} />
            </button>
            <button
              type="button"
              aria-label={`Remove indicator ${ind.name}`}
              disabled={busy}
              className="text-slate-400 hover:text-red-600 disabled:opacity-50"
              onClick={() => {
                if (window.confirm('Remove this indicator and its values?')) void run(() => deleteIndicatorAction(projectId, ind.id));
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
      {editing && (
        <AddIndicatorForm
          busy={busy}
          submitLabel="Save"
          initial={{
            name: ind.name,
            unit: ind.unit,
            baseline: String(ind.baseline),
            target: String(ind.target),
            frequency: ind.frequency ?? '',
            meansOfVerification: ind.meansOfVerification ?? '',
            measure: ind.measure,
          }}
          onCancel={() => setEditing(false)}
          onSubmit={async (v) => {
            if (await run(() => updateIndicatorAction(projectId, ind.id, v))) setEditing(false);
          }}
        />
      )}
      <div className="mt-1.5 h-2 rounded-full bg-slate-200 overflow-hidden" aria-hidden>
        <div className="h-full bg-emerald-600" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-slate-600 mt-1">
        {formatNumber(p.achievedHundredths)} {ind.unit} ({formatPercent(p.percentBp)}) from {p.validatedCount} validated value(s)
        {p.pendingCount > 0 ? ` · ${p.pendingCount} waiting for validation` : ''}
      </p>

      <button type="button" className="text-[11px] font-bold text-slate-700 underline mt-1" onClick={() => setOpen((v) => !v)}>
        {open ? 'Hide values' : `Values (${ind.values.length})`}
      </button>
      {open && (
        <div className="mt-1.5 space-y-1">
          {ind.values.map((v) => (
            <div key={v.id} className="flex items-center justify-between gap-2 text-[11px] text-slate-700">
              <span>
                {v.periodStart} → {v.periodEnd}: <b>{v.value}</b> {ind.unit}{' '}
                {v.validatedAt ? (
                  <span className="text-emerald-700">✓ validated{v.validatedByName ? ` by ${v.validatedByName}` : ''}</span>
                ) : (
                  <span className="text-amber-700">not validated{v.createdByName ? ` · entered by ${v.createdByName}` : ''}</span>
                )}
              </span>
              <span className="flex gap-1">
                {!v.validatedAt && data.canValidate && (
                  <button
                    type="button"
                    className={ghostCls}
                    disabled={busy}
                    title="Confirm this value is correct"
                    onClick={() => void run(() => validateIndicatorValueAction(projectId, v.id))}
                  >
                    <Check size={11} className="inline" /> Validate
                  </button>
                )}
                {!v.validatedAt && data.canEnterValues && (
                  <button
                    type="button"
                    aria-label="Remove value"
                    disabled={busy}
                    className="text-slate-400 hover:text-red-600"
                    onClick={() => void run(() => deleteIndicatorValueAction(projectId, v.id))}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </span>
            </div>
          ))}
          {data.canEnterValues && (
            <form
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end pt-1"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await run(() => addIndicatorValueAction(projectId, ind.id, { periodStart: start, periodEnd: end, value }))) {
                  setStart('');
                  setEnd('');
                  setValue('');
                }
              }}
            >
              <label>
                <span className={labelCls}>From</span>
                <input type="date" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} required />
              </label>
              <label>
                <span className={labelCls}>To</span>
                <input type="date" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} required />
              </label>
              <label>
                <span className={labelCls}>Value ({ind.unit})</span>
                <input className={inputCls} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} required />
              </label>
              <button className={btnCls} disabled={busy}>
                Add value
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

const HINTS: Record<LogframeKind, string> = {
  goal: 'The big change this project helps bring about',
  outcome: 'What changes for the people (the "Purpose")',
  output: 'What the project delivers',
  activity: 'What the team does',
};

function AddNodeForm({
  kind,
  busy,
  onSubmit,
  onLines,
}: {
  kind: LogframeKind;
  busy: boolean;
  onSubmit: (v: { kind: LogframeKind; code: string; title: string; description: string; assumptions: string }) => void | Promise<void>;
  onLines: (text: string) => Promise<boolean>;
}) {
  const [many, setMany] = useState(false);
  const [more, setMore] = useState(false);
  const [title, setTitle] = useState('');
  const [lines, setLines] = useState('');
  const [description, setDescription] = useState('');
  const [assumptions, setAssumptions] = useState('');
  const [code, setCode] = useState('');
  return (
    <form
      className="mt-2 space-y-2 rounded-lg border border-slate-200 p-2.5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (many) {
          if (await onLines(lines)) setLines('');
          return;
        }
        await onSubmit({ kind, code, title, description, assumptions });
        setTitle('');
        setDescription('');
        setAssumptions('');
        setCode('');
      }}
    >
      {many ? (
        <label className="block">
          <span className={labelCls}>{KIND_LABELS[kind]}s, one on each line</span>
          <textarea className={inputCls} rows={4} value={lines} onChange={(e) => setLines(e.target.value)} placeholder={'First one\nSecond one\nThird one'} required />
          <span className="text-[11px] text-slate-500">Numbers (1, 1.1 ...) are added for you.</span>
        </label>
      ) : (
        <label className="block">
          <span className={labelCls}>{KIND_LABELS[kind]}: {HINTS[kind]}</span>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        </label>
      )}
      {!many && more && (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={labelCls}>More detail (optional)</span>
            <textarea className={inputCls} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="sm:col-span-2">
            <span className={labelCls}>Assumptions (optional): what must stay true for this to work</span>
            <textarea className={inputCls} rows={2} value={assumptions} onChange={(e) => setAssumptions(e.target.value)} />
          </label>
          <label>
            <span className={labelCls}>Own number (leave empty to number automatically)</span>
            <input className={inputCls} value={code} onChange={(e) => setCode(e.target.value)} maxLength={20} placeholder="1.1" />
          </label>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button className={btnCls} disabled={busy}>
          {many ? 'Add all' : `Add ${KIND_LABELS[kind].toLowerCase()}`}
        </button>
        {!many && (
          <button type="button" className="text-[11px] font-bold text-slate-700 underline" onClick={() => setMore((v) => !v)}>
            {more ? 'Fewer fields' : 'More fields (detail, assumptions)'}
          </button>
        )}
        <button type="button" className="text-[11px] font-bold text-slate-700 underline" onClick={() => setMany((v) => !v)}>
          {many ? 'Add one at a time' : 'Add many at once'}
        </button>
      </div>
    </form>
  );
}

function EditNodeForm({
  node,
  busy,
  onSubmit,
  onCancel,
}: {
  node: { code: string; title: string; description: string | null; assumptions: string | null };
  busy: boolean;
  onSubmit: (v: { code: string; title: string; description: string; assumptions: string }) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [f, setF] = useState({ code: node.code, title: node.title, description: node.description ?? '', assumptions: node.assumptions ?? '' });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  return (
    <form
      className="mt-2 grid gap-2 sm:grid-cols-[100px_1fr] rounded-lg border border-slate-200 p-2.5"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(f);
      }}
    >
      <label>
        <span className={labelCls}>Number</span>
        <input className={inputCls} value={f.code} onChange={set('code')} maxLength={20} required />
      </label>
      <label>
        <span className={labelCls}>Title</span>
        <input className={inputCls} value={f.title} onChange={set('title')} required />
      </label>
      <label className="sm:col-span-2">
        <span className={labelCls}>More detail</span>
        <textarea className={inputCls} rows={2} value={f.description} onChange={set('description')} />
      </label>
      <label className="sm:col-span-2">
        <span className={labelCls}>Assumptions: what must stay true for this to work</span>
        <textarea className={inputCls} rows={2} value={f.assumptions} onChange={set('assumptions')} />
      </label>
      <div className="sm:col-span-2 flex gap-2">
        <button className={btnCls} disabled={busy}>Save</button>
        <button type="button" className={ghostCls} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

type IndicatorForm = { name: string; unit: string; baseline: string; target: string; frequency: string; meansOfVerification: string; measure: IndicatorMeasure };

const UNIT_CHIPS = ['people', 'families', 'kits', 'sessions', '%'];

/** Name, unit and target are all most indicators need; the rest is under "More fields". */
function AddIndicatorForm({
  busy,
  onSubmit,
  initial,
  submitLabel = 'Add indicator',
  onCancel,
}: {
  busy: boolean;
  onSubmit: (v: IndicatorForm) => void | Promise<void>;
  initial?: IndicatorForm;
  submitLabel?: string;
  onCancel?: () => void;
}) {
  const [f, setF] = useState<IndicatorForm>(initial ?? { name: '', unit: '', baseline: '0', target: '', frequency: '', meansOfVerification: '', measure: 'cumulative' });
  const [more, setMore] = useState(!!initial);
  const set = (k: keyof IndicatorForm) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  return (
    <form
      className="mt-2 grid gap-2 sm:grid-cols-2 rounded-lg border border-slate-200 p-2.5"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(f);
      }}
    >
      <label className="sm:col-span-2">
        <span className={labelCls}>What will be measured? (for example: Families receiving food packs)</span>
        <input className={inputCls} value={f.name} onChange={set('name')} required autoFocus={!initial} />
      </label>
      <label>
        <span className={labelCls}>Target (the number to reach)</span>
        <input className={inputCls} inputMode="decimal" value={f.target} onChange={set('target')} required />
      </label>
      <label>
        <span className={labelCls}>Counted in</span>
        <input className={inputCls} list="logframe-units" value={f.unit} onChange={set('unit')} required placeholder="people, families, kits…" />
        <datalist id="logframe-units">
          {UNIT_CHIPS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
      </label>
      {more && (
        <>
          <label>
            <span className={labelCls}>Starting number (baseline)</span>
            <input className={inputCls} inputMode="decimal" value={f.baseline} onChange={set('baseline')} required />
          </label>
          <label>
            <span className={labelCls}>How progress is counted</span>
            <select className={inputCls} value={f.measure} onChange={set('measure')}>
              {(Object.keys(MEASURE_LABELS) as IndicatorMeasure[]).map((m) => (
                <option key={m} value={m}>
                  {MEASURE_LABELS[m]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelCls}>How often measured (optional)</span>
            <input className={inputCls} value={f.frequency} onChange={set('frequency')} />
          </label>
          <label>
            <span className={labelCls}>Proof / source (optional)</span>
            <input className={inputCls} value={f.meansOfVerification} onChange={set('meansOfVerification')} />
          </label>
        </>
      )}
      <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
        <button className={btnCls} disabled={busy}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className={ghostCls} onClick={onCancel}>
            Cancel
          </button>
        )}
        {!initial && (
          <button type="button" className="text-[11px] font-bold text-slate-700 underline" onClick={() => setMore((v) => !v)}>
            {more ? 'Fewer fields' : 'More fields (starting number, proof, how often)'}
          </button>
        )}
      </div>
    </form>
  );
}
