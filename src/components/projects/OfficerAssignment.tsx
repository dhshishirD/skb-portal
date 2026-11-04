'use client';

import { useEffect, useState } from 'react';
import {
  getOfficerAssignmentAction,
  setProjectOfficersAction,
  type OfficerOption,
} from '@/server/actions/projects';

/** Super Admin / Programme Manager: choose which Program Officers can work on this project. */
export function OfficerAssignment({ projectId }: { projectId: string }) {
  const [candidates, setCandidates] = useState<OfficerOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    getOfficerAssignmentAction(projectId).then((r) => {
      if (!alive) return;
      if (r.ok) {
        setCandidates(r.data.candidates);
        setSelected(new Set(r.data.assignedIds));
      } else {
        setNote({ kind: 'error', text: r.error });
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = async () => {
    setBusy(true);
    setNote(null);
    const r = await setProjectOfficersAction(projectId, [...selected]);
    setBusy(false);
    setNote(r.ok ? { kind: 'ok', text: r.message ?? 'Saved.' } : { kind: 'error', text: r.error });
  };

  return (
    <section aria-labelledby="officers-title" className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
      <h2 id="officers-title" className="text-sm font-bold text-slate-900">
        Assigned Program Officers
      </h2>
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : candidates.length === 0 ? (
        <p className="text-sm text-slate-600">No active Program Officers yet. Invite them from Admin → Users.</p>
      ) : (
        <ul className="space-y-1.5">
          {candidates.map((c) => (
            <li key={c.id}>
              <label className="flex items-center gap-2 text-sm text-slate-800">
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="h-4 w-4" />
                <span>{c.fullName}</span>
                {c.designation && <span className="text-xs text-slate-500">· {c.designation}</span>}
              </label>
            </li>
          ))}
        </ul>
      )}
      {note && (
        <p role={note.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${note.kind === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>
          {note.text}
        </p>
      )}
      {!loading && candidates.length > 0 && (
        <button onClick={save} disabled={busy} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60">
          {busy ? 'Saving…' : 'Save assignments'}
        </button>
      )}
    </section>
  );
}
