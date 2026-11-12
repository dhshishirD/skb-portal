'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { ExpenseCard } from '@/components/finance/ExpenseCard';
import { Empty, Notice } from '@/components/finance/shared';
import { actOnExpenseAction, listExpensesAction } from '@/server/actions/expenses';
import type { ExpenseAction, ExpenseRow } from '@/lib/finance';

/*
 * Approvals queue: only claims where the signed-in person can act right now.
 * The database blocks self-approval and the same person approving two steps in a row.
 */
export default function ApprovalsQueuePage() {
  const [claims, setClaims] = useState<ExpenseRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await listExpensesAction();
      if (r.ok) setClaims(r.data.filter((c) => c.actions.some((a) => a !== 'cancel')));
      else setMsg({ kind: 'error', text: r.error });
    } catch {
      setMsg({ kind: 'error', text: 'Could not reach the server. Reload the page (Ctrl+F5) and try again.' });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: ExpenseAction, comment?: string) {
    setBusy(true);
    setMsg(null);
    const r = await actOnExpenseAction(id, action, comment);
    setBusy(false);
    setMsg(r.ok ? { kind: 'ok', text: r.message ?? 'Done.' } : { kind: 'error', text: r.error });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <Link href="/dashboard" className="hover:underline">Finance</Link> &rsaquo;
          <span className="font-semibold text-slate-800">Approvals Queue</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          Approvals Queue
        </h1>
        <p className="text-xs text-slate-500">Claims waiting for your step. You cannot approve your own claim, or two steps of the same claim.</p>
      </div>

      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      {claims === null ? (
        <p className="text-xs text-slate-500">Loading…</p>
      ) : claims.length === 0 ? (
        <Empty title="Nothing waiting for you">New claims that need your step will appear here.</Empty>
      ) : (
        claims.map((c) => <ExpenseCard key={c.id} claim={c} busy={busy} onAct={act} />)
      )}
    </div>
  );
}
