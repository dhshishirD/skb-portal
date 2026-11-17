'use client';

import { useCallback, useEffect, useState } from 'react';
import { donorUserStatus, type DonorsData } from '@/lib/donors';
import { createDonorOrgAction, getDonorsAction, inviteDonorUserAction, setDonorUserActiveAction } from '@/server/actions/donors';

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white';
const btnCls = 'px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50';
const ghostCls = 'px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 disabled:opacity-50';
type Note = { kind: 'ok' | 'error'; text: string } | null;

const STATUS: Record<ReturnType<typeof donorUserStatus>, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  invited: { label: 'Invited', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  deactivated: { label: 'Switched off', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

/** Donors: the funding organisations, the people from them who may sign in, and how many projects each has. */
export default function DonorsPage() {
  const [data, setData] = useState<DonorsData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const [org, setOrg] = useState({ name: '', country: '' });
  const [invite, setInvite] = useState({ orgId: '', email: '', fullName: '' });

  const load = useCallback(async () => {
    try {
      const r = await getDonorsAction();
      if (r.ok) {
        setData(r.data);
        setLoadError(null);
      } else setLoadError(r.error);
    } catch {
      setLoadError('Could not load the donors. Please refresh the page.');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function run(fn: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>, onOk?: () => void) {
    setBusy(true);
    setNote(null);
    try {
      const r = await fn();
      if (r.ok) {
        setNote({ kind: 'ok', text: r.message });
        onOk?.();
        await load();
      } else setNote({ kind: 'error', text: r.error });
    } catch {
      setNote({ kind: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  if (loadError && !data) return <p role="alert" className="text-sm text-red-700 p-6">{loadError}</p>;
  if (!data) return <p className="text-sm text-slate-500 p-6">Loading the donors…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Donors</h1>
        <p className="text-sm text-slate-600">
          Each project has one donor. People you invite here see only the projects of their own donor, and only what you release to them.
          Set the donor of a project on that project&apos;s Overview page.
        </p>
      </div>

      {note && <p role={note.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${note.kind === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>{note.text}</p>}

      <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3" aria-labelledby="donors-list">
        <h2 id="donors-list" className="text-sm font-bold">Donor organisations</h2>
        {data.orgs.length === 0 ? (
          <p className="text-sm text-slate-500">No donor yet. Add one below.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.orgs.map((o) => {
              const people = data.users.filter((u) => u.orgId === o.id);
              return (
                <li key={o.id} className="py-3 space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{o.name}{o.country ? <span className="font-normal text-slate-500"> · {o.country}</span> : null}</p>
                    <p className="text-xs text-slate-500">{o.projectCount} {o.projectCount === 1 ? 'project' : 'projects'}</p>
                  </div>
                  {people.length === 0 ? (
                    <p className="text-xs text-slate-500">No one from this donor can sign in yet.</p>
                  ) : (
                    <ul className="space-y-1">
                      {people.map((u) => {
                        const s = STATUS[donorUserStatus(u)];
                        return (
                          <li key={u.id} className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-medium text-slate-800">{u.fullName}</span>
                            <span className="text-slate-500">{u.email}</span>
                            <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${s.cls}`}>{s.label}</span>
                            <button type="button" className={ghostCls} disabled={busy} onClick={() => run(() => setDonorUserActiveAction(u.id, !u.isActive))}>
                              {u.isActive ? 'Switch off' : 'Switch on'}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <form
          className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => createDonorOrgAction(org), () => setOrg({ name: '', country: '' }));
          }}
        >
          <h2 className="text-sm font-bold">Add a donor organisation</h2>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="donor-name">Name</label>
            <input id="donor-name" className={inputCls} maxLength={200} value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="donor-country">Country (optional)</label>
            <input id="donor-country" className={inputCls} maxLength={80} value={org.country} onChange={(e) => setOrg({ ...org, country: e.target.value })} />
          </div>
          <button type="submit" className={btnCls} disabled={busy}>Add donor</button>
        </form>

        <form
          className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => inviteDonorUserAction(invite), () => setInvite({ orgId: invite.orgId, email: '', fullName: '' }));
          }}
        >
          <h2 className="text-sm font-bold">Invite a person from a donor</h2>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="invite-org">Donor organisation</label>
            <select id="invite-org" className={inputCls} value={invite.orgId} onChange={(e) => setInvite({ ...invite, orgId: e.target.value })} required>
              <option value="">Choose…</option>
              {data.orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="invite-name">Full name</label>
            <input id="invite-name" className={inputCls} maxLength={120} value={invite.fullName} onChange={(e) => setInvite({ ...invite, fullName: e.target.value })} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="invite-email">Email</label>
            <input id="invite-email" type="email" className={inputCls} value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} required />
          </div>
          <button type="submit" className={btnCls} disabled={busy}>Send invitation</button>
          <p className="text-[11px] text-slate-500">They get an email to set a password. They can only open the Donor area.</p>
        </form>
      </div>
    </div>
  );
}
