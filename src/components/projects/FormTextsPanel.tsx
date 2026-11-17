'use client';

import { useCallback, useEffect, useState } from 'react';
import { FORM_TEXT_FIELDS, MAX_FORM_TEXT, type FormTextKey, type FormTexts, type FormTextsData } from '@/lib/formTexts';
import { getFormTextsAction, saveFormTextsAction } from '@/server/actions/formTexts';

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white';
const btnCls = 'px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';

/** The written answers donor forms ask for. Kept once here so the Form 3 and Form 7 Word files fill in by themselves. */
export function FormTextsPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<FormTextsData | null>(null);
  const [texts, setTexts] = useState<FormTexts | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [note, setNote] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await getFormTextsAction(projectId);
      if (r.ok) {
        setData(r.data);
        setTexts(r.data.texts);
        setLoadError(null);
      } else setLoadError(r.error);
    } catch {
      setLoadError('Could not load the texts. Please refresh the page.');
    }
  }, [projectId]);
  useEffect(() => {
    void load();
  }, [load]);

  if (loadError && !data) return <p role="alert" className="text-sm text-red-700">{loadError}</p>;
  if (!data || !texts) return <p className="text-sm text-slate-500">Loading the form texts…</p>;

  const set = (k: FormTextKey) => (e: React.ChangeEvent<HTMLTextAreaElement>) => setTexts((t) => (t ? { ...t, [k]: e.target.value } : t));
  const dirty = textsChanged(data.texts, texts);

  const save = async () => {
    setBusy(true);
    setNote(null);
    try {
      const r = await saveFormTextsAction(projectId, texts);
      if (r.ok) {
        setNote({ kind: 'ok', text: r.message });
        await load();
      } else setNote({ kind: 'error', text: r.error });
    } catch {
      setNote({ kind: 'error', text: 'Could not save. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3" aria-labelledby="form-texts-title">
      <div>
        <h2 id="form-texts-title" className="text-sm font-bold">Donor form texts</h2>
        <p className="text-xs text-slate-500">
          The written answers that Form 3 and Form 7 ask for. Write them once here and the Word files fill in by themselves. All are optional.
        </p>
      </div>
      <div className="grid gap-3">
        {FORM_TEXT_FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor={`ft-${f.key}`}>{f.label}</label>
            <textarea
              id={`ft-${f.key}`}
              className={inputCls}
              rows={3}
              maxLength={MAX_FORM_TEXT}
              value={texts[f.key]}
              onChange={set(f.key)}
              disabled={!data.canWrite}
              aria-describedby={`ft-${f.key}-hint`}
            />
            <p id={`ft-${f.key}-hint`} className="text-[11px] text-slate-500 mt-0.5">{f.hint}</p>
          </div>
        ))}
      </div>
      {data.closed && <p className="text-xs text-slate-500">This project is closed, so the texts cannot be changed.</p>}
      {note && (
        <p role={note.kind === 'error' ? 'alert' : 'status'} className={`text-xs ${note.kind === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>{note.text}</p>
      )}
      {data.canWrite && (
        <button type="button" className={btnCls} onClick={save} disabled={busy || !dirty}>
          {busy ? 'Saving…' : 'Save texts'}
        </button>
      )}
    </section>
  );
}

function textsChanged(a: FormTexts, b: FormTexts): boolean {
  return (Object.keys(a) as FormTextKey[]).some((k) => a[k] !== b[k]);
}
