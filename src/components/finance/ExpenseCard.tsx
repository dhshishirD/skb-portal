'use client';

import { useState } from 'react';
import type { ExpenseAction, ExpenseRow } from '@/lib/finance';
import { EXPENSE_STATUS_LABELS } from '@/lib/finance';
import { CommentBox, Pill, dangerButton, formatBdt, formatDate, goodButton, quietButton } from './shared';

const TONE: Record<string, 'slate' | 'amber' | 'green' | 'red' | 'blue'> = {
  submitted: 'amber',
  pm_approved: 'amber',
  finance_verified: 'amber',
  director_approved: 'blue',
  paid: 'green',
  returned: 'red',
  rejected: 'red',
  cancelled: 'slate',
};

const roleName = (r: string) => r.replace('_', ' ');

/** One expense claim with its approval trail and only the buttons this person may press. */
export function ExpenseCard({
  claim,
  busy,
  onAct,
}: {
  claim: ExpenseRow;
  busy: boolean;
  onAct: (id: string, action: ExpenseAction, comment?: string) => void;
}) {
  const [asking, setAsking] = useState<'return' | 'reject' | null>(null);
  const can = (a: ExpenseAction) => claim.actions.includes(a);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-600">
          {claim.projectCode ?? 'Project'} {claim.projectTitle ? `· ${claim.projectTitle}` : ''}
        </span>
        <Pill tone={TONE[claim.status] ?? 'slate'}>{EXPENSE_STATUS_LABELS[claim.status]}</Pill>
      </div>

      <div>
        <div className="flex items-center justify-between text-sm font-bold text-slate-900">
          <span>{claim.claimantName ?? 'Unknown'}</span>
          <span className="font-mono text-blue-700">
            {claim.currency === 'BDT' ? formatBdt(claim.amount) : `${claim.currency} ${claim.amount.toLocaleString('en-US')} (${formatBdt(claim.amountBdt)})`}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Expense date {formatDate(claim.expenseDate)} · filed {formatDate(claim.submittedAt)}
          {claim.vendorName ? ` · ${claim.vendorName}` : ''}
          {claim.receiptRef ? ` · receipt ${claim.receiptRef}` : ''}
        </p>
      </div>

      <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl whitespace-pre-wrap">{claim.description}</p>

      {claim.trail.length > 0 && (
        <ol className="space-y-1 text-[11px] text-slate-600">
          {claim.trail.map((t) => (
            <li key={t.stepNo}>
              Step {t.stepNo} ({roleName(t.role)}): <strong>{t.status}</strong>
              {t.actorName ? ` by ${t.actorName}` : ''} {t.actedAt ? `on ${formatDate(t.actedAt)}` : ''}
              {t.comment ? ` — “${t.comment}”` : ''}
            </li>
          ))}
        </ol>
      )}

      {claim.waitingFor && claim.actions.length === 0 && (
        <p className="text-[11px] text-slate-500">Waiting for the {roleName(claim.waitingFor)}.</p>
      )}

      {asking ? (
        <CommentBox
          label={asking === 'return' ? 'Why is it returned? (the claimant will see this)' : 'Why is it rejected?'}
          minLength={3}
          busy={busy}
          confirmLabel={asking === 'return' ? 'Return claim' : 'Reject claim'}
          onCancel={() => setAsking(null)}
          onSubmit={(c) => {
            onAct(claim.id, asking, c);
            setAsking(null);
          }}
        />
      ) : (
        claim.actions.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-100">
            {can('cancel') && (
              <button className={quietButton} disabled={busy} onClick={() => onAct(claim.id, 'cancel')}>
                Cancel my claim
              </button>
            )}
            {can('reject') && (
              <button className={dangerButton} disabled={busy} onClick={() => setAsking('reject')}>
                Reject
              </button>
            )}
            {can('return') && (
              <button className={quietButton} disabled={busy} onClick={() => setAsking('return')}>
                Return
              </button>
            )}
            {can('approve') && (
              <button className={goodButton} disabled={busy} onClick={() => onAct(claim.id, 'approve')}>
                {claim.approveLabel ?? 'Approve'}
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
}
