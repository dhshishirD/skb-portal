'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Lock } from 'lucide-react';
import { PROJECT_STAGES, STAGE_LABELS } from '@/lib/projects';
import {
  gateProgress,
  itemsForStage,
  nextStage,
  previousStage,
  type StageGateData,
} from '@/lib/stageGates';
import { advanceStageAction, getStageGatesAction, toggleGateItemAction } from '@/server/actions/stageGates';

const whenText = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' })
    : '';

type Note = { kind: 'ok' | 'error'; text: string } | null;

/** Stage gates tab: the six stages, the current checklist, who may move the project, and the history. */
export function StageGates({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [data, setData] = useState<StageGateData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [forwardNote, setForwardNote] = useState('');
  const [backReason, setBackReason] = useState('');
  const [note, setNote] = useState<Note>(null);

  const load = useCallback(async () => {
    try {
      const r = await getStageGatesAction(projectId);
      if (r.ok) {
        setData(r.data);
        setLoadError(null);
      } else {
        setLoadError(r.error);
      }
    } catch {
      setLoadError('Could not reach the server. Reload the page (Ctrl+F5) and try again.');
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loadError && !data) {
    return (
      <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
        <p role="alert" className="text-sm text-red-700">
          {loadError}
        </p>
        <button
          onClick={() => {
            setLoadError(null);
            load();
          }}
          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Try again
        </button>
      </section>
    );
  }
  if (!data) {
    return (
      <section className="bg-white p-5 rounded-2xl border border-slate-200">
        <p className="text-sm text-slate-500">Loading stage gates…</p>
      </section>
    );
  }

  const stageIndex = PROJECT_STAGES.indexOf(data.stage);
  const currentItems = itemsForStage(data.items, data.stage);
  const progress = gateProgress(currentItems);
  const next = nextStage(data.stage);
  const prev = previousStage(data.stage);

  const toggle = async (itemId: string, done: boolean) => {
    setBusyItem(itemId);
    setNote(null);
    const r = await toggleGateItemAction(projectId, itemId, done).catch(() => null);
    if (!r) setNote({ kind: 'error', text: 'Could not reach the server. Please try again.' });
    else if (!r.ok) setNote({ kind: 'error', text: r.error });
    await load();
    setBusyItem(null);
  };

  const move = async (to: string, text: string, label: string) => {
    if (!window.confirm(label)) return;
    setMoving(true);
    setNote(null);
    const r = await advanceStageAction(projectId, to, text).catch(() => null);
    if (!r) {
      setNote({ kind: 'error', text: 'Could not reach the server. Please try again.' });
    } else if (r.ok) {
      setNote({ kind: 'ok', text: r.message ?? 'Stage changed.' });
      setForwardNote('');
      setBackReason('');
      await load();
      router.refresh(); // updates the stage badge in the project header
    } else {
      setNote({ kind: 'error', text: r.error });
    }
    setMoving(false);
  };

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <section aria-labelledby="stages-title" className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
        <h2 id="stages-title" className="text-sm font-bold text-slate-900">
          Project stages
        </h2>
        <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {PROJECT_STAGES.map((stage, i) => {
            const state = i < stageIndex ? 'past' : i === stageIndex ? 'current' : 'future';
            const p = gateProgress(itemsForStage(data.items, stage));
            return (
              <li
                key={stage}
                aria-current={state === 'current' ? 'step' : undefined}
                className={`rounded-xl border p-3 text-xs space-y-1 ${
                  state === 'current'
                    ? 'border-blue-500 bg-blue-50'
                    : state === 'past'
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  {state === 'past' && <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />}
                  <span>
                    {i + 1}. {STAGE_LABELS[stage]}
                  </span>
                </div>
                <div className="text-slate-600">
                  {state === 'current' ? 'Current stage' : state === 'past' ? 'Completed' : 'Not reached yet'}
                </div>
                {stage !== 'closed' && state !== 'future' && (
                  <div className="text-slate-500">
                    {p.requiredDone} of {p.requiredTotal} required done
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* Current checklist */}
      <section aria-labelledby="checklist-title" className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="checklist-title" className="text-sm font-bold text-slate-900">
            Checklist: {STAGE_LABELS[data.stage]}
          </h2>
          {currentItems.length > 0 && (
            <p className="text-xs text-slate-600">
              {progress.requiredDone} of {progress.requiredTotal} required items done
            </p>
          )}
        </div>

        {currentItems.length === 0 ? (
          <p className="text-sm text-slate-600">
            {data.stage === 'closed' ? 'This project is closed and frozen. The Executive Director can reopen it below (Change the stage).' : 'This stage has no checklist items.'}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {currentItems.map((item) => (
              <li key={item.id} className="py-2.5">
                <label className="flex items-start gap-3 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={item.done}
                    disabled={!data.canTick || busyItem === item.id || moving}
                    onChange={(e) => toggle(item.id, e.target.checked)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span className="space-y-0.5">
                    <span className="block">
                      {item.label}{' '}
                      {!item.required && (
                        <span className="ml-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          Optional
                        </span>
                      )}
                    </span>
                    {item.done && (
                      <span className="block text-xs text-slate-500">
                        Done{item.doneByName ? ` by ${item.doneByName}` : ''}
                        {item.doneAt ? ` on ${whenText(item.doneAt)}` : ''}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {!data.canTick && currentItems.length > 0 && (
          <p className="text-xs text-slate-500">Your role can view this checklist but not change it.</p>
        )}
      </section>

      {/* Changing the stage */}
      <section aria-labelledby="move-title" className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
        <h2 id="move-title" className="text-sm font-bold text-slate-900">
          Change the stage
        </h2>

        {!data.canChangeStage ? (
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <Lock className="w-4 h-4 text-slate-400" aria-hidden="true" />
            Only the Executive Director can change a project&apos;s stage.
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Move forward</h3>
              {next ? (
                <>
                  {!progress.complete && (
                    <p className="text-xs text-amber-700">
                      Finish every required checklist item first ({progress.requiredTotal - progress.requiredDone} left).
                    </p>
                  )}
                  <label className="block text-xs text-slate-600" htmlFor="forward-note">
                    Note (optional)
                  </label>
                  <textarea
                    id="forward-note"
                    value={forwardNote}
                    onChange={(e) => setForwardNote(e.target.value)}
                    maxLength={1000}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => move(next, forwardNote, `Move this project to "${STAGE_LABELS[next]}"?`)}
                    disabled={!progress.complete || moving}
                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {moving ? 'Working…' : `Move to ${STAGE_LABELS[next]}`}
                  </button>
                </>
              ) : (
                <p className="text-sm text-slate-600">This is the final stage.</p>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{data.stage === 'closed' ? 'Reopen project' : 'Move back'}</h3>
              {prev ? (
                <>
                  <label className="block text-xs text-slate-600" htmlFor="back-reason">
                    Reason (required, at least 5 characters)
                  </label>
                  <textarea
                    id="back-reason"
                    value={backReason}
                    onChange={(e) => setBackReason(e.target.value)}
                    maxLength={1000}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => move(prev, backReason, data.stage === 'closed' ? `Reopen this closed project and move it to "${STAGE_LABELS[prev]}"? Edits will be allowed again.` : `Move this project back to "${STAGE_LABELS[prev]}"?`)}
                    disabled={backReason.trim().length < 5 || moving}
                    className="px-4 py-2 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                  >
                    {moving ? 'Working…' : data.stage === 'closed' ? `Reopen project (to ${STAGE_LABELS[prev]})` : `Move back to ${STAGE_LABELS[prev]}`}
                  </button>
                </>
              ) : (
                <p className="text-sm text-slate-600">This is the first stage.</p>
              )}
            </div>
          </div>
        )}

        {note && (
          <p role={note.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${note.kind === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>
            {note.text}
          </p>
        )}
      </section>

      {/* History */}
      <section aria-labelledby="history-title" className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
        <h2 id="history-title" className="text-sm font-bold text-slate-900">
          Stage history
        </h2>
        {data.history.length === 0 ? (
          <p className="text-sm text-slate-600">No stage changes yet. The project is still at its first stage.</p>
        ) : (
          <ul className="space-y-3">
            {data.history.map((h) => (
              <li key={h.id} className="text-sm text-slate-800">
                <p className="font-semibold">
                  {h.fromStage ? `${STAGE_LABELS[h.fromStage]} → ` : ''}
                  {STAGE_LABELS[h.toStage]}
                </p>
                <p className="text-xs text-slate-500">
                  {h.changedByName ? `By ${h.changedByName}` : 'By a former user'} · {whenText(h.createdAt)}
                </p>
                {h.note && <p className="text-xs text-slate-700 whitespace-pre-line mt-0.5">{h.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
