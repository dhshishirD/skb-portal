'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Download, Send } from 'lucide-react';
import { LETTER_STATUS_LABELS, missingForIssue, padDate, type LetterInfo } from '@/lib/letters';
import { copyLetterAction, deleteLetterAction, getLetterAction, issueLetterAction, saveLetterAction, voidLetterAction, type LetterView } from '@/server/actions/letters';
import { downloadLetterDocx } from './downloadLetter';

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white';
const labelCls = 'block text-xs font-bold text-slate-600 mb-1';
const btnCls = 'px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';
const ghostCls = 'px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 disabled:opacity-50';
type Note = { kind: 'ok' | 'error'; text: string } | null;

/** Write, issue, download and (if needed) cancel one letter. An issued letter is read-only. */
export function LetterEditor({ id }: { id: string }) {
  const router = useRouter();
  const [view, setView] = useState<LetterView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [f, setF] = useState<LetterInfo | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await getLetterAction(id);
      if (r.ok) {
        setView(r.data);
        setF(r.data.letter);
        setDirty(false);
        setLoadError(null);
      } else setLoadError(r.error);
    } catch {
      setLoadError('Could not load the letter. Please refresh the page.');
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  if (loadError) return <p className="text-sm text-red-700">{loadError}</p>;
  if (!view || !f) return <p className="text-sm text-slate-500">Loading…</p>;

  const draft = f.status === 'draft';
  const canEdit = draft && (view.mine || view.canManage);
  const canIssueOrVoid = view.mine || view.canManage;
  const set = (patch: Partial<LetterInfo>) => {
    setF({ ...f, ...patch });
    setDirty(true);
  };
  const input = () => ({ toLines: f.toLines, subject: f.subject, salutation: f.salutation, body: f.body, closing: f.closing, signatoryName: f.signatoryName, signatoryTitle: f.signatoryTitle, cc: f.cc, withSignature: f.withSignature, withStamp: f.withStamp });
  const say = (kind: 'ok' | 'error', text: string) => setNote({ kind, text });

  const guard = async (fn: () => Promise<void>) => {
    setBusy(true);
    setNote(null);
    try {
      await fn();
    } catch {
      say('error', 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    guard(async () => {
      const r = await saveLetterAction(id, input());
      if (r.ok) {
        say('ok', 'Saved.');
        await load();
      } else say('error', r.error);
    });

  const issue = () => {
    const missing = missingForIssue(f);
    if (missing.length > 0) return say('error', `Before issuing, fill in ${missing.join(', ')}.`);
    return guard(async () => {
      const r = await issueLetterAction(id, input());
      if (r.ok) {
        say('ok', `Issued as ${r.data.refNo}.`);
        await load();
      } else say('error', r.error);
    });
  };

  const download = () =>
    guard(async () => {
      // Make the file from what is on the screen (a draft), or from the saved letter (issued).
      const r = await downloadLetterDocx(draft ? { ...f, id } : view.letter);
      if (!r.ok) say('error', r.error);
    });

  const copy = () =>
    guard(async () => {
      const r = await copyLetterAction(id);
      if (r.ok) router.push(`/workspace/letters/${r.data.id}`);
      else say('error', r.error);
    });

  const remove = () =>
    guard(async () => {
      const r = await deleteLetterAction(id);
      if (r.ok) router.push('/workspace/letters');
      else say('error', r.error);
    });

  const cancel = () =>
    guard(async () => {
      const r = await voidLetterAction(id, reason);
      if (r.ok) {
        say('ok', r.message ?? 'Cancelled.');
        setVoiding(false);
        await load();
      } else say('error', r.error);
    });

  return (
    <section className="space-y-4" aria-label="Letter">
      <Link href="/workspace/letters" className="inline-flex items-center gap-1 text-xs text-slate-600 underline">
        <ArrowLeft size={12} /> All letters
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">
          {f.refNo ?? 'New letter'}{' '}
          <span className="text-xs font-semibold text-slate-500">{LETTER_STATUS_LABELS[f.status]}</span>
        </h2>
        <p className="text-xs text-slate-500">
          {f.status === 'draft'
            ? `Written by ${view.people[f.createdBy] ?? 'staff'}`
            : `Issued ${f.letterDate ? padDate(f.letterDate) : ''} by ${view.people[f.issuedBy ?? ''] ?? 'staff'}`}
        </p>
      </div>

      {f.status === 'void' && <p className="text-sm text-amber-800">This letter is cancelled{f.voidReason ? `: ${f.voidReason}` : ''}. Its number stays in the register.</p>}
      {note && (
        <p role="status" className={`text-sm ${note.kind === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>
          {note.text}
        </p>
      )}

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <label className={labelCls} htmlFor="l-to">To (one line each: name, designation, organisation, address)</label>
          <textarea id="l-to" rows={4} maxLength={600} className={inputCls} disabled={!canEdit} value={f.toLines} onChange={(e) => set({ toLines: e.target.value })} />
        </div>
        <div>
          <label className={labelCls} htmlFor="l-subject">Subject</label>
          <input id="l-subject" maxLength={250} className={inputCls} disabled={!canEdit} value={f.subject} onChange={(e) => set({ subject: e.target.value })} />
        </div>
        <div>
          <label className={labelCls} htmlFor="l-salutation">Greeting</label>
          <input id="l-salutation" maxLength={80} className={inputCls} disabled={!canEdit} value={f.salutation} onChange={(e) => set({ salutation: e.target.value })} />
        </div>
        <div>
          <label className={labelCls} htmlFor="l-body">Letter (leave a blank line between paragraphs)</label>
          <textarea id="l-body" rows={12} maxLength={8000} className={inputCls} disabled={!canEdit} value={f.body} onChange={(e) => set({ body: e.target.value })} />
          <p className="text-[11px] text-slate-500 mt-1">{f.body.length} / 8000</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls} htmlFor="l-closing">Closing</label>
            <input id="l-closing" maxLength={60} className={inputCls} disabled={!canEdit} value={f.closing} onChange={(e) => set({ closing: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="l-signer">Name of the person who signs</label>
            <input id="l-signer" maxLength={120} className={inputCls} disabled={!canEdit} value={f.signatoryName} onChange={(e) => set({ signatoryName: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="l-title">Designation</label>
            <input id="l-title" maxLength={160} className={inputCls} disabled={!canEdit} value={f.signatoryTitle} onChange={(e) => set({ signatoryTitle: e.target.value })} />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="l-cc">Copy to (one line each, optional)</label>
          <textarea id="l-cc" rows={2} maxLength={500} className={inputCls} disabled={!canEdit} value={f.cc} onChange={(e) => set({ cc: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="flex items-start gap-2 text-sm text-slate-800">
            <input type="checkbox" className="mt-1" disabled={!canEdit} checked={f.withSignature} onChange={(e) => set({ withSignature: e.target.checked })} />
            <span>
              Add my signature (the picture saved on the Work Log page, added only when <b>you</b> issue the letter)
              {!view.hasMySignature && f.withSignature && <span className="block text-xs text-amber-800">You have not saved a signature yet. Save it on the Work Log page first, or untick this.</span>}
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-800">
            <input type="checkbox" className="mt-1" disabled={!canEdit} checked={f.withStamp} onChange={(e) => set({ withStamp: e.target.checked })} />
            <span>
              Add the stamp of the organisation
              {!view.hasStamp && f.withStamp && <span className="block text-xs text-amber-800">No stamp is saved yet. Upload it on the Letters page first, or untick this.</span>}
            </span>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {canEdit && (
          <button type="button" className={ghostCls} disabled={busy || !dirty} onClick={() => void save()}>
            Save draft
          </button>
        )}
        <button type="button" className={ghostCls} disabled={busy} onClick={() => void download()}>
          <Download size={12} className="inline" /> Download Word file
        </button>
        {canEdit && canIssueOrVoid && (
          <button type="button" className={btnCls} disabled={busy} onClick={() => void issue()}>
            <Send size={12} className="inline" /> Issue (gives the Ref number)
          </button>
        )}
        {!draft && (
          <button type="button" className={ghostCls} disabled={busy} onClick={() => void copy()}>
            <Copy size={12} className="inline" /> Copy as a new draft
          </button>
        )}
        {f.status === 'issued' && canIssueOrVoid && (
          <button type="button" className={ghostCls} disabled={busy} aria-expanded={voiding} onClick={() => setVoiding((v) => !v)}>
            Cancel this letter
          </button>
        )}
        {canEdit && (
          <button type="button" className={ghostCls} disabled={busy} onClick={() => void remove()}>
            Delete draft
          </button>
        )}
      </div>
      {canEdit && <p className="text-[11px] text-slate-500">Issuing spends the next Ref number and locks the letter. No approval is needed. Issue is saved together with the latest text.</p>}

      {voiding && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
          <label className={labelCls} htmlFor="l-reason">Why is this letter cancelled?</label>
          <input id="l-reason" maxLength={200} className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} />
          <button type="button" className={btnCls} disabled={busy || !reason.trim()} onClick={() => void cancel()}>
            Cancel the letter
          </button>
          <p className="text-[11px] text-slate-500">The number stays in the register, marked cancelled. Write a corrected letter with &ldquo;Copy as a new draft&rdquo;.</p>
        </div>
      )}
    </section>
  );
}
