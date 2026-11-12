'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Store } from 'lucide-react';
import { CommentBox, Empty, Notice, Pill, dangerButton, inputClass, labelClass, primaryButton, quietButton } from '@/components/finance/shared';
import { listVendorsAction, saveVendorAction, setBlacklistAction } from '@/server/actions/procurement';
import { EMPTY_VENDOR_FORM, type VendorFormValues, type VendorRow } from '@/lib/procurement';

/* Vendor registry. Procurement and the Executive Director manage it; only the Executive Director lifts a blacklist. */
export default function VendorsPage() {
  const [vendors, setVendors] = useState<VendorRow[] | null>(null);
  const [form, setForm] = useState<VendorFormValues>(EMPTY_VENDOR_FORM);
  const [editing, setEditing] = useState<string | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await listVendorsAction();
      if (r.ok) setVendors(r.data);
      else setMsg({ kind: 'error', text: r.error });
    } catch {
      setMsg({ kind: 'error', text: 'Could not reach the server. Reload the page (Ctrl+F5) and try again.' });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const canManage = vendors?.[0]?.canManage ?? false;
  const set = (k: keyof VendorFormValues, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await saveVendorAction(form, editing ?? undefined);
    setBusy(false);
    if (r.ok) {
      setMsg({ kind: 'ok', text: r.message ?? 'Saved.' });
      setForm(EMPTY_VENDOR_FORM);
      setEditing(null);
      load();
    } else setMsg({ kind: 'error', text: r.error });
  }

  async function blacklist(id: string, on: boolean, reason?: string) {
    setBusy(true);
    setMsg(null);
    const r = await setBlacklistAction(id, on, reason);
    setBusy(false);
    setAsking(null);
    setMsg(r.ok ? { kind: 'ok', text: r.message ?? 'Done.' } : { kind: 'error', text: r.error });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <Link href="/dashboard" className="hover:underline">Procurement</Link> &rsaquo;
          <span className="font-semibold text-slate-800">Vendors</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Store className="w-5 h-5 text-blue-600" />
          Vendors and Blacklist
        </h1>
        <p className="text-xs text-slate-500">A blacklisted vendor cannot give quotations or receive orders. A reason is required; only the Executive Director can lift it.</p>
      </div>

      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      {canManage && (
        <form onSubmit={save} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900">{editing ? 'Edit vendor' : 'Add vendor'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="v-name">Vendor name</label>
              <input id="v-name" className={inputClass} maxLength={200} value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
            <div>
              <label className={labelClass} htmlFor="v-contact">Contact person</label>
              <input id="v-contact" className={inputClass} maxLength={120} value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="v-phone">Phone</label>
              <input id="v-phone" className={inputClass} maxLength={30} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="v-email">Email</label>
              <input id="v-email" className={inputClass} maxLength={254} value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className={primaryButton} disabled={busy}>{editing ? 'Save changes' : 'Add vendor'}</button>
            {editing && (
              <button type="button" className={quietButton} onClick={() => { setEditing(null); setForm(EMPTY_VENDOR_FORM); }}>Cancel</button>
            )}
          </div>
        </form>
      )}

      {vendors === null ? (
        <p className="text-xs text-slate-500">Loading…</p>
      ) : vendors.length === 0 ? (
        <Empty title="No vendors yet">{canManage ? 'Add the first vendor above.' : 'Procurement adds vendors here.'}</Empty>
      ) : (
        <div className="space-y-3">
          {vendors.map((v) => (
            <div key={v.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">{v.name}</p>
                  <p className="text-xs text-slate-500">{[v.contactPerson, v.phone, v.email].filter(Boolean).join(' · ') || 'No contact details'}</p>
                </div>
                {v.isBlacklisted ? <Pill tone="red">Blacklisted</Pill> : <Pill tone="green">Active</Pill>}
              </div>
              {v.isBlacklisted && v.blacklistReason && <p className="text-xs text-red-700">Reason: {v.blacklistReason}</p>}
              {asking === v.id ? (
                <CommentBox label="Why is this vendor blacklisted?" minLength={5} busy={busy} confirmLabel="Blacklist vendor" onCancel={() => setAsking(null)} onSubmit={(r) => blacklist(v.id, true, r)} />
              ) : (
                v.canManage && (
                  <div className="flex justify-end gap-2">
                    <button className={quietButton} disabled={busy} onClick={() => { setEditing(v.id); setForm({ name: v.name, contactPerson: v.contactPerson ?? '', phone: v.phone ?? '', email: v.email ?? '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                      Edit
                    </button>
                    {!v.isBlacklisted && (
                      <button className={dangerButton} disabled={busy} onClick={() => setAsking(v.id)}>Blacklist</button>
                    )}
                    {v.isBlacklisted && v.canLift && (
                      <button className={quietButton} disabled={busy} onClick={() => blacklist(v.id, false)}>Remove from blacklist</button>
                    )}
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
