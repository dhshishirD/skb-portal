'use client';

import { useCallback, useEffect, useState } from 'react';
import { getReviewersAction, setReviewersAction, type ReviewerRow, type PersonRef } from '@/server/actions/workStatement';

const selectCls = 'w-full px-2 py-1.5 text-sm rounded-lg border border-slate-300 bg-white';
type Note = { kind: 'ok' | 'error'; text: string } | null;

/** Who verifies and who approves each person's monthly Work Statement. */
export default function WorkReviewersPage() {
  const [rows, setRows] = useState<ReviewerRow[] | null>(null);
  const [people, setPeople] = useState<PersonRef[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await getReviewersAction();
      if (r.ok) {
        setRows(r.data.rows);
        setPeople(r.data.people);
        setError(null);
      } else setError(r.error);
    } catch {
      setError('Could not load the list. Please refresh the page.');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const change = async (row: ReviewerRow, field: 'verifierId' | 'approverId', value: string) => {
    const next = { verifierId: row.verifierId, approverId: row.approverId, [field]: value || null };
    setBusy(true);
    setNote(null);
    try {
      const r = await setReviewersAction(row.userId, next.verifierId, next.approverId);
      if (r.ok) {
        setNote({ kind: 'ok', text: `Saved for ${row.fullName}.` });
        await load();
      } else setNote({ kind: 'error', text: r.error });
    } catch {
      setNote({ kind: 'error', text: 'Something went wrong. Nothing was saved.' });
    } finally {
      setBusy(false);
    }
  };

  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>;
  if (!rows) return <p className="text-sm text-slate-500">Loading…</p>;
  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Work Statement reviewers</h1>
        <p className="text-sm text-slate-600">
          Choose who verifies and who approves each person&rsquo;s monthly Work Statement. An approver is needed before a person can submit; the verifier is optional (without one the statement goes straight to the approver).
          The Executive Director and the Super Admin can also step in when someone is away. A change applies to the next submission, not to one already waiting.
        </p>
      </div>
      {note && (
        <p role="status" className={`text-sm ${note.kind === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>
          {note.text}
        </p>
      )}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.userId} className="rounded-xl border border-slate-200 bg-white p-3 grid sm:grid-cols-3 gap-3 items-end">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 break-words">{r.fullName}</p>
              <p className="text-xs text-slate-500">{r.designation ?? 'No designation'}</p>
            </div>
            {(['verifierId', 'approverId'] as const).map((f) => (
              <div key={f}>
                <label className="block text-xs font-bold text-slate-600 mb-1" htmlFor={`${f}-${r.userId}`}>{f === 'verifierId' ? 'Verifier (optional)' : 'Approver'}</label>
                <select id={`${f}-${r.userId}`} className={selectCls} disabled={busy} value={r[f] ?? ''} onChange={(e) => void change(r, f, e.target.value)}>
                  <option value="">{f === 'verifierId' ? 'No verifier' : 'Not set'}</option>
                  {people.filter((p) => p.id !== r.userId).map((p) => (
                    <option key={p.id} value={p.id}>{p.fullName}{p.designation ? ` · ${p.designation}` : ''}</option>
                  ))}
                </select>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
