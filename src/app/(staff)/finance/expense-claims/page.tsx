'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { ExpenseCard } from '@/components/finance/ExpenseCard';
import { Empty, Notice, inputClass, labelClass, primaryButton } from '@/components/finance/shared';
import { actOnExpenseAction, fileExpenseAction, listExpensesAction } from '@/server/actions/expenses';
import { listProjectsAction } from '@/server/actions/projects';
import { EMPTY_EXPENSE_FORM, EXPENSE_CURRENCIES, type ExpenseAction, type ExpenseClaimFormValues, type ExpenseRow } from '@/lib/finance';
import type { ProjectRow } from '@/lib/projects';

/*
 * Expense claims. Everything comes from the database; the approval rules are enforced there.
 * Receipt photo upload is not built yet: a voucher/receipt number can be written instead.
 */
export default function ExpenseClaimsPage() {
  const [claims, setClaims] = useState<ExpenseRow[] | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [form, setForm] = useState<ExpenseClaimFormValues>(EMPTY_EXPENSE_FORM);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([listExpensesAction(), listProjectsAction()]);
      if (c.ok) setClaims(c.data);
      else setMsg({ kind: 'error', text: c.error });
      if (p.ok) setProjects(p.data.projects.filter((x) => x.stage !== 'closed'));
    } catch {
      setMsg({ kind: 'error', text: 'Could not reach the server. Reload the page (Ctrl+F5) and try again.' });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k: keyof ExpenseClaimFormValues, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await fileExpenseAction(form);
    setBusy(false);
    if (r.ok) {
      setMsg({ kind: 'ok', text: r.message ?? 'Claim filed.' });
      setForm({ ...EMPTY_EXPENSE_FORM, projectId: form.projectId });
      load();
    } else {
      setMsg({ kind: 'error', text: r.error });
    }
  }

  async function act(id: string, action: ExpenseAction, comment?: string) {
    setBusy(true);
    setMsg(null);
    const r = await actOnExpenseAction(id, action, comment);
    setBusy(false);
    setMsg(r.ok ? { kind: 'ok', text: r.message ?? 'Done.' } : { kind: 'error', text: r.error });
    load();
  }

  const mine = claims;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <Link href="/dashboard" className="hover:underline">Finance</Link> &rsaquo;
          <span className="font-semibold text-slate-800">Expense Claims</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-blue-600" />
          Expense Claims
        </h1>
        <p className="text-xs text-slate-500">File a claim. It goes to the Programme Manager, then Finance, then the Executive Director, then Finance marks it paid.</p>
      </div>

      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-900">New claim</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className={labelClass} htmlFor="ec-project">Project</label>
            <select id="ec-project" className={inputClass} value={form.projectId} onChange={(e) => set('projectId', e.target.value)} required>
              <option value="">Choose a project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.code} · {p.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="ec-amount">Amount</label>
            <input id="ec-amount" className={inputClass} inputMode="decimal" value={form.amount} onChange={(e) => set('amount', e.target.value)} required />
          </div>
          <div>
            <label className={labelClass} htmlFor="ec-currency">Currency</label>
            <select id="ec-currency" className={inputClass} value={form.currency} onChange={(e) => set('currency', e.target.value)}>
              {EXPENSE_CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {form.currency !== 'BDT' && (
            <div>
              <label className={labelClass} htmlFor="ec-fx">Exchange rate (1 {form.currency} = ? BDT)</label>
              <input id="ec-fx" className={inputClass} inputMode="decimal" value={form.fxRate} onChange={(e) => set('fxRate', e.target.value)} required />
            </div>
          )}
          <div>
            <label className={labelClass} htmlFor="ec-date">Expense date</label>
            <input id="ec-date" type="date" className={inputClass} value={form.expenseDate} onChange={(e) => set('expenseDate', e.target.value)} required />
          </div>
          <div>
            <label className={labelClass} htmlFor="ec-vendor">Paid to (optional)</label>
            <input id="ec-vendor" className={inputClass} maxLength={200} value={form.vendorName} onChange={(e) => set('vendorName', e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="ec-ref">Receipt or voucher number (optional)</label>
            <input id="ec-ref" className={inputClass} maxLength={100} value={form.receiptRef} onChange={(e) => set('receiptRef', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass} htmlFor="ec-desc">What was it for?</label>
            <textarea id="ec-desc" className={inputClass} rows={2} maxLength={1000} value={form.description} onChange={(e) => set('description', e.target.value)} required />
          </div>
        </div>
        <button type="submit" className={primaryButton} disabled={busy}>
          {busy ? 'Saving…' : 'File claim'}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Claims you can see</h2>
        {mine === null ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : mine.length === 0 ? (
          <Empty title="No claims yet">Claims you file, and claims you may review, appear here.</Empty>
        ) : (
          mine.map((c) => <ExpenseCard key={c.id} claim={c} busy={busy} onAct={act} />)
        )}
      </section>
    </div>
  );
}
