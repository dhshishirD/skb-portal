'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Lock, Trash2, UserPlus } from 'lucide-react';
import {
  FIELD_LABELS,
  SEX_LABELS,
  type BeneficiariesData,
  type BeneficiaryFormValues,
  type BeneficiaryRow,
  type RevealField,
  type Sex,
} from '@/lib/beneficiaries';
import {
  deleteBeneficiaryAction,
  getBeneficiariesAction,
  registerBeneficiaryAction,
  revealFieldAction,
  updateBeneficiaryAction,
  type BeneficiaryActionResult,
} from '@/server/actions/beneficiaries';

type Note = { kind: 'ok' | 'error'; text: string } | null;
type Run = (fn: () => Promise<BeneficiaryActionResult>) => Promise<boolean>;

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white';
const labelCls = 'block text-xs font-bold text-slate-600 mb-1';
const btnCls = 'px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';
const ghostCls = 'px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 disabled:opacity-50';
const REVEAL_SECONDS = 30;

/** Beneficiaries tab: the secure registry. IDs and phones are shown only on request, and each request is logged. */
export function BeneficiariesPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<BeneficiariesData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await getBeneficiariesAction(projectId);
      if (r.ok) {
        setData(r.data);
        setLoadError(null);
      } else setLoadError(r.error);
    } catch {
      setLoadError('Could not load the beneficiaries. Please refresh the page.');
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

  const c = data.counts;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        <p className="font-bold flex items-center gap-1">
          <Lock size={12} /> Protected personal data
        </p>
        <p className="mt-1">
          Names, ID numbers and phone numbers are stored encrypted. An ID number or phone number is shown only when you ask, and every time is recorded with your name.
          The consent wording has not been approved by the Law Officer yet, so consent is <b>not recorded</b> ({data.consentRecorded} of {data.counts.total} have it).
          Use real details only with the approval of the Executive Director.
        </p>
      </div>
      {!data.encryptionReady && (
        <p className="text-sm text-red-700">
          Registration is switched off: the encryption key is not set up on the server yet. Names cannot be read until it is.
        </p>
      )}
      {data.closed && <p className="text-sm text-slate-600">This project is closed, so the list is read-only.</p>}

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
        {(
          [
            ['Women', c.women],
            ['Men', c.men],
            ['Girls', c.girls],
            ['Boys', c.boys],
            ['Not stated', c.unspecified],
            ['Total', c.total],
          ] as const
        ).map(([label, n]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-2">
            <p className="text-lg font-bold text-slate-900">{n}</p>
            <p className="text-[11px] text-slate-500">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-500">Girls and boys are under 18 (from the birth year). Counts cover everyone registered, even if the list below is shortened.</p>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-700">
          Showing <b>{data.shown}</b> of <b>{data.counts.total}</b>
        </p>
        {data.canRegister && (
          <button type="button" className={btnCls} onClick={() => setAdding((v) => !v)}>
            <UserPlus size={12} className="inline" /> Register person
          </button>
        )}
      </div>
      {note && (
        <p role="status" className={`text-sm ${note.kind === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>
          {note.text}
        </p>
      )}
      {adding && data.canRegister && (
        <PersonForm
          busy={busy}
          submitLabel="Register"
          onCancel={() => setAdding(false)}
          onSubmit={async (v) => {
            if (await run(() => registerBeneficiaryAction(projectId, v))) setAdding(false);
          }}
        />
      )}
      {data.people.length === 0 && <p className="text-sm text-slate-500">No one is registered yet.</p>}
      <ul className="space-y-2">
        {data.people.map((p) => (
          <PersonRowView key={p.id} person={p} data={data} busy={busy} run={run} projectId={projectId} />
        ))}
      </ul>

      {data.log && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-bold text-slate-700 mb-1">Who opened an ID number or phone number (latest 100)</p>
          {data.log.length === 0 && <p className="text-xs text-slate-500">Nobody yet.</p>}
          <ul className="space-y-1">
            {data.log.map((l) => (
              <li key={l.id} className="text-[11px] text-slate-600">
                {l.at.slice(0, 16).replace('T', ' ')} · <b>{l.byName ?? 'Someone'}</b> opened the {FIELD_LABELS[l.field].toLowerCase()} of {l.personName ?? 'a removed record'}
                {l.reason ? ` · reason: ${l.reason}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PersonRowView({ person, data, busy, run, projectId }: { person: BeneficiaryRow; data: BeneficiariesData; busy: boolean; run: Run; projectId: string }) {
  const [editing, setEditing] = useState(false);
  const [shown, setShown] = useState<{ field: RevealField; value: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState<RevealField | null>(null);
  const [reason, setReason] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function reveal(field: RevealField) {
    setError(null);
    const r = await revealFieldAction(projectId, person.id, field, reason);
    if (r.ok) {
      setShown({ field, value: r.data.value });
      setAsking(null);
      setReason('');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setShown(null), REVEAL_SECONDS * 1000);
    } else setError(r.error);
  }

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-slate-900">{person.fullName}</p>
          <p className="text-[11px] text-slate-500">
            {person.sex ? SEX_LABELS[person.sex] : 'Sex not stated'} · {person.birthYear ? `born ${person.birthYear}` : 'birth year not stated'}
            {person.registeredByName ? ` · registered by ${person.registeredByName}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data.canReveal && person.hasNationalId && (
            <button type="button" className={ghostCls} disabled={busy} onClick={() => setAsking('national_id')}>
              <Eye size={11} className="inline" /> ID
            </button>
          )}
          {data.canReveal && person.hasPhone && (
            <button type="button" className={ghostCls} disabled={busy} onClick={() => setAsking('phone')}>
              <Eye size={11} className="inline" /> Phone
            </button>
          )}
          {data.canRegister && (
            <button type="button" className={ghostCls} onClick={() => setEditing((v) => !v)}>
              Edit
            </button>
          )}
          {data.canDelete && (
            <button
              type="button"
              aria-label={`Remove ${person.fullName}`}
              disabled={busy}
              className="text-slate-400 hover:text-red-600 disabled:opacity-50"
              onClick={() => {
                if (window.confirm('Remove this person from the registry? The access log keeps its history.')) void run(() => deleteBeneficiaryAction(projectId, person.id));
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      {!person.hasNationalId && <p className="text-[11px] text-slate-400 mt-1">No ID number saved</p>}
      {asking && (
        <form
          className="mt-2 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void reveal(asking);
          }}
        >
          <label className="flex-1 min-w-[200px]">
            <span className={labelCls}>Why do you need the {FIELD_LABELS[asking].toLowerCase()}? (optional, recorded)</span>
            <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
          </label>
          <button className={btnCls}>Show</button>
          <button type="button" className={ghostCls} onClick={() => setAsking(null)}>
            Cancel
          </button>
        </form>
      )}
      {error && <p className="text-xs text-red-700 mt-1">{error}</p>}
      {shown && (
        <p className="mt-2 text-sm font-mono bg-slate-50 rounded-lg p-2 flex items-center justify-between">
          <span>
            {FIELD_LABELS[shown.field]}: <b>{shown.value}</b> <span className="text-[11px] text-slate-400 font-sans">(hides in {REVEAL_SECONDS} seconds)</span>
          </span>
          <button type="button" aria-label="Hide now" onClick={() => setShown(null)}>
            <EyeOff size={14} />
          </button>
        </p>
      )}
      {editing && data.canRegister && (
        <PersonForm
          busy={busy}
          person={person}
          submitLabel="Save"
          onCancel={() => setEditing(false)}
          onSubmit={async (v) => {
            if (await run(() => updateBeneficiaryAction(projectId, person.id, v))) setEditing(false);
          }}
        />
      )}
    </li>
  );
}

function PersonForm({
  busy,
  person,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  person?: BeneficiaryRow;
  submitLabel: string;
  onSubmit: (v: BeneficiaryFormValues) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    fullName: person?.fullName ?? '',
    nationalId: '',
    phone: '',
    sex: (person?.sex ?? 'female') as Sex,
    birthYear: person?.birthYear ? String(person.birthYear) : '',
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  return (
    <form
      className="mt-2 grid gap-2 sm:grid-cols-2 rounded-lg border border-slate-200 p-2.5"
      autoComplete="off"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(f);
      }}
    >
      <label className="sm:col-span-2">
        <span className={labelCls}>Full name</span>
        <input className={inputCls} value={f.fullName} onChange={set('fullName')} required autoComplete="off" />
      </label>
      <label>
        <span className={labelCls}>National ID number{person ? ' (leave blank to keep the saved one)' : ' (optional)'}</span>
        <input className={inputCls} value={f.nationalId} onChange={set('nationalId')} inputMode="numeric" autoComplete="off" />
      </label>
      <label>
        <span className={labelCls}>Phone{person ? ' (leave blank to keep the saved one)' : ' (optional)'}</span>
        <input className={inputCls} value={f.phone} onChange={set('phone')} inputMode="tel" placeholder="01XXXXXXXXX" autoComplete="off" />
      </label>
      <label>
        <span className={labelCls}>Sex</span>
        <select className={inputCls} value={f.sex} onChange={set('sex')}>
          {(Object.keys(SEX_LABELS) as Sex[]).map((s) => (
            <option key={s} value={s}>
              {SEX_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={labelCls}>Birth year</span>
        <input className={inputCls} value={f.birthYear} onChange={set('birthYear')} inputMode="numeric" placeholder="1990" maxLength={4} autoComplete="off" />
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
