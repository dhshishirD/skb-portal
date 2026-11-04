'use client';

import { useEffect, useState } from 'react';
import {
  getOrganizationDetailsAction,
  updateOrganizationDetailsAction,
  type OrganizationFormData,
} from '@/server/actions/projects';

/**
 * SKB's registration number and the authority that issued it. Officers enter it here once;
 * the portal shows it where needed. Nothing is hard-coded in the code.
 */
export function OrganizationDetails() {
  const [org, setOrg] = useState<OrganizationFormData | null>(null);
  const [regNo, setRegNo] = useState('');
  const [authority, setAuthority] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    getOrganizationDetailsAction().then((r) => {
      if (!alive) return;
      if (r.ok) {
        setOrg(r.data);
        setRegNo(r.data.registration_no);
        setAuthority(r.data.registration_authority);
      } else {
        setNote({ kind: 'error', text: r.error });
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    const r = await updateOrganizationDetailsAction({ registration_no: regNo, registration_authority: authority });
    setBusy(false);
    setNote(r.ok ? { kind: 'ok', text: r.message ?? 'Saved.' } : { kind: 'error', text: r.error });
  };

  const input = 'w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50 disabled:text-slate-600';

  return (
    <section aria-labelledby="org-details-title" className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
      <div>
        <h2 id="org-details-title" className="text-sm font-bold text-slate-900">
          Organisation details{org ? `: ${org.name}` : ''}
        </h2>
        <p className="text-xs text-slate-500">The registration number is shown on project pages. Leave blank until you have it.</p>
      </div>
      {org && (
        <form onSubmit={save} className="grid sm:grid-cols-3 gap-3 items-end">
          <label className="text-xs font-medium text-slate-700 space-y-1">
            <span>Registration number</span>
            <input value={regNo} onChange={(e) => setRegNo(e.target.value)} disabled={!org.canEdit} maxLength={100} className={input} />
          </label>
          <label className="text-xs font-medium text-slate-700 space-y-1">
            <span>Registered with</span>
            <input
              value={authority}
              onChange={(e) => setAuthority(e.target.value)}
              disabled={!org.canEdit}
              maxLength={200}
              placeholder="For example NGO Affairs Bureau"
              className={input}
            />
          </label>
          {org.canEdit && (
            <button type="submit" disabled={busy} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {busy ? 'Saving…' : 'Save'}
            </button>
          )}
        </form>
      )}
      {note && (
        <p role={note.kind === 'error' ? 'alert' : 'status'} className={`text-xs ${note.kind === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>
          {note.text}
        </p>
      )}
    </section>
  );
}
