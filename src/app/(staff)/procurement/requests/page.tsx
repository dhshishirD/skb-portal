'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { CommentBox, Empty, Notice, Pill, dangerButton, formatBdt, formatDate, goodButton, inputClass, labelClass, primaryButton, quietButton } from '@/components/finance/shared';
import {
  actOnPurchaseRequestAction,
  addQuotationAction,
  createPurchaseRequestAction,
  deleteDraftRequestAction,
  listPurchaseRequestsAction,
  listVendorsAction,
  removeQuotationAction,
} from '@/server/actions/procurement';
import { listProjectsAction } from '@/server/actions/projects';
import { EMPTY_REQUEST_FORM, PURCHASE_STATUS_LABELS, approverRoleFor, lowestAmount, type PurchaseAction, type PurchaseRequestFormValues, type PurchaseRequestRow, type VendorRow } from '@/lib/procurement';
import type { ProjectRow } from '@/lib/projects';

const TONE = { draft: 'slate', submitted: 'amber', quotations_attached: 'blue', approved: 'green', po_issued: 'green', rejected: 'red' } as const;

export default function PurchaseRequestsPage() {
  const [requests, setRequests] = useState<PurchaseRequestRow[] | null>(null);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [form, setForm] = useState<PurchaseRequestFormValues>(EMPTY_REQUEST_FORM);
  const [quote, setQuote] = useState<Record<string, { vendorId: string; amount: string }>>({});
  const [choice, setChoice] = useState<Record<string, { quotationId: string; comment: string }>>({});
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [r, v, p] = await Promise.all([listPurchaseRequestsAction(), listVendorsAction(), listProjectsAction()]);
      if (r.ok) setRequests(r.data);
      else setMsg({ kind: 'error', text: r.error });
      if (v.ok) setVendors(v.data);
      if (p.ok) setProjects(p.data.projects.filter((x) => x.stage !== 'closed'));
    } catch {
      setMsg({ kind: 'error', text: 'Could not reach the server. Reload the page (Ctrl+F5) and try again.' });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(fn: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>) {
    setBusy(true);
    setMsg(null);
    const r = await fn();
    setBusy(false);
    setMsg(r.ok ? { kind: 'ok', text: r.message ?? 'Done.' } : { kind: 'error', text: r.error });
    if (r.ok) load();
    return r.ok;
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (await run(() => createPurchaseRequestAction(form))) setForm({ ...EMPTY_REQUEST_FORM, projectId: form.projectId });
  }

  const act = (id: string, action: PurchaseAction, options?: { comment?: string; quotationId?: string }) =>
    run(() => actOnPurchaseRequestAction(id, action, options));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <Link href="/dashboard" className="hover:underline">Procurement</Link> &rsaquo;
          <span className="font-semibold text-slate-800">Purchase Requests</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-600" />
          Purchase Requests and Quotations
        </h1>
        <p className="text-xs text-slate-500">
          From BDT 50,000, quotations from 3 different vendors are required. From BDT 500,000 the Executive Director approves. The person who approves cannot issue the order.
        </p>
      </div>

      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <form onSubmit={create} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-900">New purchase request (saved as a draft)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className={labelClass} htmlFor="pr-project">Project</label>
            <select id="pr-project" className={inputClass} value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} required>
              <option value="">Choose a project</option>
              {projects.map((p) => (<option key={p.id} value={p.id}>{p.code} · {p.title}</option>))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="pr-amount">Estimated amount (BDT)</label>
            <input id="pr-amount" className={inputClass} inputMode="decimal" value={form.estimatedAmount} onChange={(e) => setForm({ ...form, estimatedAmount: e.target.value })} required />
          </div>
          <div className="md:col-span-3">
            <label className={labelClass} htmlFor="pr-desc">What is needed?</label>
            <textarea id="pr-desc" className={inputClass} rows={2} maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </div>
        </div>
        <button type="submit" className={primaryButton} disabled={busy}>Save draft</button>
      </form>

      {requests === null ? (
        <p className="text-xs text-slate-500">Loading…</p>
      ) : requests.length === 0 ? (
        <Empty title="No purchase requests yet">Create a draft above. Quotations are added by Procurement after you submit it.</Empty>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const low = lowestAmount(req.quotations);
            const q = quote[req.id] ?? { vendorId: '', amount: '' };
            const c = choice[req.id] ?? { quotationId: '', comment: '' };
            const needsReason = c.quotationId && low !== null && (req.quotations.find((x) => x.id === c.quotationId)?.amount ?? 0) > low;
            const basis = Math.max(req.estimatedAmount, ...req.quotations.map((x) => x.amount));
            return (
              <div key={req.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600">{req.projectCode} {req.projectTitle ? `· ${req.projectTitle}` : ''}</span>
                  <Pill tone={TONE[req.status]}>{PURCHASE_STATUS_LABELS[req.status]}</Pill>
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">{req.description}</h3>
                  <span className="font-mono font-bold text-sm text-slate-900">{formatBdt(req.estimatedAmount)}</span>
                </div>
                <p className="text-xs text-slate-500">Requested by {req.requesterName ?? 'unknown'} on {formatDate(req.createdAt)}</p>

                {req.quotations.length > 0 && (
                  <ul className="text-xs divide-y divide-slate-100 border border-slate-100 rounded-xl">
                    {req.quotations.map((x) => (
                      <li key={x.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <span>
                          {x.vendorName} {x.isBlacklisted && <Pill tone="red">Blacklisted</Pill>} {x.isSelected && <Pill tone="green">Chosen</Pill>}
                          {low !== null && x.amount === low && <span className="ml-1 text-emerald-700">(lowest)</span>}
                        </span>
                        <span className="font-mono">
                          {formatBdt(x.amount)}
                          {req.canEditQuotations && (
                            <button className="ml-2 text-red-600 underline" disabled={busy} onClick={() => run(() => removeQuotationAction(x.id))}>remove</button>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {req.order && (
                  <p className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3">
                    Order issued to {req.order.vendorName} for {formatBdt(req.order.totalAmount)} on {formatDate(req.order.issuedAt)}.
                  </p>
                )}
                {req.trail.length > 0 && (
                  <ol className="space-y-1 text-[11px] text-slate-600">
                    {req.trail.map((t) => (
                      <li key={t.stepNo}>
                        Step {t.stepNo}: <strong>{t.status}</strong>{t.actorName ? ` by ${t.actorName}` : ''} {t.actedAt ? `on ${formatDate(t.actedAt)}` : ''}{t.comment ? ` — “${t.comment}”` : ''}
                      </li>
                    ))}
                  </ol>
                )}
                {req.note && <p className="text-[11px] text-amber-700">{req.note}</p>}

                {req.canEditQuotations && (
                  <div className="flex flex-wrap items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div>
                      <label className={labelClass} htmlFor={`qv-${req.id}`}>Vendor</label>
                      <select id={`qv-${req.id}`} className={inputClass} value={q.vendorId} onChange={(e) => setQuote({ ...quote, [req.id]: { ...q, vendorId: e.target.value } })}>
                        <option value="">Choose a vendor</option>
                        {vendors.filter((v) => !v.isBlacklisted).map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass} htmlFor={`qa-${req.id}`}>Quotation (BDT)</label>
                      <input id={`qa-${req.id}`} className={inputClass} inputMode="decimal" value={q.amount} onChange={(e) => setQuote({ ...quote, [req.id]: { ...q, amount: e.target.value } })} />
                    </div>
                    <button className={quietButton} disabled={busy} onClick={async () => { if (await run(() => addQuotationAction(req.id, { vendorId: q.vendorId, amount: q.amount }))) setQuote({ ...quote, [req.id]: { vendorId: '', amount: '' } }); }}>
                      Add quotation
                    </button>
                  </div>
                )}

                {req.actions.includes('approve') && (
                  <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <p className="text-xs text-slate-600">Approver for this size: {approverRoleFor(basis) === 'executive' ? 'Executive Director' : 'Programme Manager'}.</p>
                    <label className={labelClass} htmlFor={`ch-${req.id}`}>Choose the quotation</label>
                    <select id={`ch-${req.id}`} className={inputClass} value={c.quotationId} onChange={(e) => setChoice({ ...choice, [req.id]: { ...c, quotationId: e.target.value } })}>
                      <option value="">Choose…</option>
                      {req.quotations.map((x) => (<option key={x.id} value={x.id}>{x.vendorName} · {formatBdt(x.amount)}</option>))}
                    </select>
                    <label className={labelClass} htmlFor={`cc-${req.id}`}>{needsReason ? 'Reason for not choosing the lowest (at least 10 characters)' : 'Comment (optional)'}</label>
                    <textarea id={`cc-${req.id}`} className={inputClass} rows={2} maxLength={1000} value={c.comment} onChange={(e) => setChoice({ ...choice, [req.id]: { ...c, comment: e.target.value } })} />
                  </div>
                )}

                {rejecting === req.id ? (
                  <CommentBox label="Why is it rejected?" minLength={3} busy={busy} confirmLabel="Reject request" onCancel={() => setRejecting(null)} onSubmit={(t) => { setRejecting(null); act(req.id, 'reject', { comment: t }); }} />
                ) : (
                  (req.actions.length > 0 || req.status === 'draft') && (
                    <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-100">
                      {req.status === 'draft' && req.requesterId && req.actions.includes('submit') && (
                        <button className={dangerButton} disabled={busy} onClick={() => run(() => deleteDraftRequestAction(req.id))}>Delete draft</button>
                      )}
                      {req.actions.includes('reject') && <button className={dangerButton} disabled={busy} onClick={() => setRejecting(req.id)}>Reject</button>}
                      {req.actions.includes('submit') && <button className={goodButton} disabled={busy} onClick={() => act(req.id, 'submit')}>Submit</button>}
                      {req.actions.includes('ready') && <button className={goodButton} disabled={busy} onClick={() => act(req.id, 'ready')}>Quotations are complete</button>}
                      {req.actions.includes('approve') && (
                        <button className={goodButton} disabled={busy || !c.quotationId} onClick={() => act(req.id, 'approve', { quotationId: c.quotationId, comment: c.comment })}>Approve</button>
                      )}
                      {req.actions.includes('issue_po') && <button className={goodButton} disabled={busy} onClick={() => act(req.id, 'issue_po')}>Issue order</button>}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
