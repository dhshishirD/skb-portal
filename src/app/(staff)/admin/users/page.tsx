'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, Pencil, Shield, UserPlus, X } from 'lucide-react';
import {
  inviteStaffAction,
  listStaffAction,
  resendAccessEmailAction,
  updateStaffAction,
  type StaffRow,
} from '@/server/actions/admin';
import { ROLE_LABELS } from '@/lib/desks';
import { OrganizationDetails } from '@/components/projects/OrganizationDetails';
import { STAFF_ASSIGNABLE_ROLES } from '@/lib/staffAdmin';
import type { AppRole } from '@/lib/database.types';

/*
 * Users & Access (Super Admin: full control; IT Officer: view + re-send emails).
 * Everything here reads and writes the database through server actions. There is no
 * local-storage approval queue: accounts are invite-only.
 */

type Banner = { kind: 'ok' | 'error'; text: string } | null;

function statusOf(u: StaffRow): { label: string; cls: string } {
  if (!u.isActive) return { label: 'Deactivated', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  if (!u.lastSignInAt) return { label: 'Invited', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (u.roles.length === 0) return { label: 'No role', cls: 'bg-red-50 text-red-700 border-red-200' };
  return { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
}

function StaffForm({
  mode,
  staff,
  initial,
  onSubmit,
  onCancel,
  busy,
}: {
  mode: 'invite' | 'edit';
  staff: StaffRow[];
  initial?: StaffRow;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const managers = staff.filter((s) => s.isActive && s.id !== initial?.id);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-xs font-medium text-slate-700 space-y-1">
          <span>Full name</span>
          <input name="fullName" required defaultValue={initial?.fullName} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
        </label>
        {mode === 'invite' ? (
          <label className="text-xs font-medium text-slate-700 space-y-1">
            <span>Email (use @skb.org.bd where possible)</span>
            <input name="email" type="email" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
          </label>
        ) : (
          <div className="text-xs text-slate-500 self-end pb-2">{initial?.email}</div>
        )}
        <label className="text-xs font-medium text-slate-700 space-y-1">
          <span>Designation (shown on the org chart)</span>
          <input name="designation" defaultValue={initial?.designation ?? ''} placeholder="e.g. Program Officer" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
        </label>
        <label className="text-xs font-medium text-slate-700 space-y-1">
          <span>Reports to</span>
          <select name="reportsTo" defaultValue={initial?.reportsTo ?? ''} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
            <option value="">(nobody: top of the hierarchy)</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
                {m.designation ? ` (${m.designation})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-700 space-y-1">
          <span>Order on org chart (lower = higher up)</span>
          <input name="displayOrder" type="number" min={0} max={999} defaultValue={initial?.displayOrder ?? 100} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
        </label>
        {mode === 'edit' && (
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 self-end pb-2">
            <input type="checkbox" name="isActive" defaultChecked={initial?.isActive} />
            Account active (unticking signs them out everywhere)
          </label>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-slate-800">Role(s): these decide which desk they get and what they can see</legend>
        <div className="grid sm:grid-cols-2 gap-2">
          {STAFF_ASSIGNABLE_ROLES.map((r) => (
            <label key={r} className="flex items-start gap-2 text-xs text-slate-700 border border-slate-200 rounded-lg px-3 py-2">
              <input type="checkbox" name="roles" value={r} defaultChecked={initial?.roles.includes(r)} className="mt-0.5" />
              <span>{ROLE_LABELS[r]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-xs border border-slate-300 rounded-lg">
          Cancel
        </button>
        <button type="submit" disabled={busy} className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg">
          {busy ? 'Working…' : mode === 'invite' ? 'Send invitation' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

export default function UsersAdminPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<Banner>(null);
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<{ mode: 'invite' } | { mode: 'edit'; user: StaffRow } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listStaffAction();
    if (res.ok) {
      setStaff(res.staff);
      setCanManage(res.canManage);
    } else {
      setBanner({ kind: 'error', text: res.error });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const nameOf = useMemo(() => new Map(staff.map((s) => [s.id, s.fullName])), [staff]);

  const run = async (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.ok) {
      setBanner({ kind: 'ok', text: res.message ?? 'Done.' });
      setPanel(null);
      await load();
    } else {
      setBanner({ kind: 'error', text: res.error ?? 'Something went wrong' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Users &amp; Access</h1>
          <p className="text-xs text-slate-500">
            Accounts are by invitation only. Each person&apos;s role decides which desk they land on and what they can see.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setPanel({ mode: 'invite' })}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-sm"
          >
            <UserPlus className="w-4 h-4" /> Invite staff member
          </button>
        )}
      </div>

      <OrganizationDetails />

      {banner && (
        <div
          role={banner.kind === 'error' ? 'alert' : 'status'}
          className={`text-xs rounded-lg px-3 py-2 border flex justify-between ${
            banner.kind === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <span>{banner.text}</span>
          <button onClick={() => setBanner(null)} aria-label="Dismiss">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {!canManage && !loading && (
        <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <Shield className="w-4 h-4" /> View-only: you can re-send invite or password emails. Role changes need a Super Admin.
        </p>
      )}

      {panel && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4">
            {panel.mode === 'invite' ? 'Invite a staff member' : `Edit ${panel.user.fullName}`}
          </h2>
          <StaffForm
            mode={panel.mode}
            staff={staff}
            initial={panel.mode === 'edit' ? panel.user : undefined}
            busy={busy}
            onCancel={() => setPanel(null)}
            onSubmit={(fd) =>
              run(() => (panel.mode === 'invite' ? inviteStaffAction(fd) : updateStaffAction(panel.user.id, fd)))
            }
          />
          {panel.mode === 'invite' && (
            <p className="mt-3 text-[11px] text-slate-500">
              They receive an email, set their own password, and land on their desk. Super Admins and the Executive
              Director are then asked to set up two-step verification.
            </p>
          )}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-xs block lg:table">
          <thead className="bg-slate-50 text-slate-600 text-left hidden lg:table-header-group">
            <tr>
              <th className="px-4 py-3">Name &amp; designation</th>
              <th className="px-4 py-3">Reports to</th>
              <th className="px-4 py-3">Roles</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last sign-in</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 block lg:table-row-group">
            {loading && (
              <tr className="block lg:table-row">
                <td colSpan={6} className="block lg:table-cell px-4 py-6 text-center text-slate-500">
                  Loading staff…
                </td>
              </tr>
            )}
            {!loading && staff.length === 0 && (
              <tr className="block lg:table-row">
                <td colSpan={6} className="block lg:table-cell px-4 py-6 text-center text-slate-500">
                  No staff accounts yet.
                </td>
              </tr>
            )}
            {staff.map((u) => {
              const st = statusOf(u);
              return (
                <tr key={u.id} className={`block lg:table-row py-3 lg:py-0 ${u.isActive ? '' : 'opacity-60'}`}>
                  <td className="block lg:table-cell px-4 py-1.5 lg:py-3">
                    <div className="font-semibold text-slate-900">{u.fullName}</div>
                    <div className="text-slate-500">{u.designation ?? 'n/a'}</div>
                    <div className="text-slate-400">{u.email}</div>
                  </td>
                  <td data-label="Reports to" className="block lg:table-cell px-4 py-1.5 lg:py-3 text-slate-600 before:content-[attr(data-label)] before:block before:text-[10px] before:font-bold before:uppercase before:text-slate-400 before:mb-0.5 lg:before:hidden">{u.reportsTo ? nameOf.get(u.reportsTo) ?? 'n/a' : 'n/a'}</td>
                  <td data-label="Roles" className="block lg:table-cell px-4 py-1.5 lg:py-3 before:content-[attr(data-label)] before:block before:text-[10px] before:font-bold before:uppercase before:text-slate-400 before:mb-0.5 lg:before:hidden">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 && <span className="text-red-600">none</span>}
                      {u.roles.map((r: AppRole) => (
                        <span key={r} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {ROLE_LABELS[r]?.split(' (')[0] ?? r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td data-label="Status" className="block lg:table-cell px-4 py-1.5 lg:py-3 before:content-[attr(data-label)] before:block before:text-[10px] before:font-bold before:uppercase before:text-slate-400 before:mb-0.5 lg:before:hidden">
                    <span className={`px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                  </td>
                  <td data-label="Last sign-in" className="block lg:table-cell px-4 py-1.5 lg:py-3 text-slate-500 before:content-[attr(data-label)] before:block before:text-[10px] before:font-bold before:uppercase before:text-slate-400 before:mb-0.5 lg:before:hidden">
                    {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleDateString() : 'never'}
                  </td>
                  <td className="block lg:table-cell px-4 py-1.5 lg:py-3 lg:text-right lg:whitespace-nowrap space-x-1">
                    {u.isActive && (
                      <button
                        onClick={() => run(() => resendAccessEmailAction(u.id))}
                        disabled={busy}
                        title={u.lastSignInAt ? 'Send password-reset email' : 'Re-send invitation'}
                        className="inline-flex items-center gap-1 px-2 py-1 border border-slate-300 rounded-lg hover:bg-slate-50"
                      >
                        <Mail className="w-3.5 h-3.5" /> {u.lastSignInAt ? 'Reset' : 'Re-invite'}
                      </button>
                    )}
                    {canManage && (
                      <button
                        onClick={() => setPanel({ mode: 'edit', user: u })}
                        className="inline-flex items-center gap-1 px-2 py-1 border border-slate-300 rounded-lg hover:bg-slate-50"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
