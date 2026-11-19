import type { PersonRef, StatementSignatures } from '@/server/actions/workStatement';
import { monthTitle, shortDate, todayInDhaka, type StatementInfo, type WorkDay } from '@/lib/workStatement';
import type { SignerLine, WorkStatementDocData } from '@/lib/workStatementDocx';

const dateOf = (iso: string | null) => (iso ? shortDate(todayInDhaka(new Date(iso))) : null);

/** Collects what the Word file needs from what a page already loaded. */
export function toDocData(a: {
  owner: PersonRef;
  month: string;
  days: WorkDay[];
  statement: StatementInfo | null;
  verifier: PersonRef | null;
  approver: PersonRef | null;
  verifiedBy: PersonRef | null;
  approvedBy: PersonRef | null;
  signatures: StatementSignatures | null;
}): WorkStatementDocData {
  const st = a.statement;
  const sig = a.signatures;
  const prepared: SignerLine = { name: a.owner.fullName, doneOn: dateOf(st?.submittedAt ?? null), signature: sig?.prepared ?? null };
  const hasVerifier = !!(st ? st.verifierId : a.verifier);
  const verified: SignerLine | null = hasVerifier
    ? { name: (a.verifiedBy ?? a.verifier)?.fullName ?? '', doneOn: dateOf(st?.verifiedAt ?? null), signature: sig?.verified ?? null }
    : null;
  const approved: SignerLine | null =
    st?.approverId || a.approver ? { name: (a.approvedBy ?? a.approver)?.fullName ?? '', doneOn: dateOf(st?.approvedAt ?? null), signature: sig?.approved ?? null } : null;
  return {
    ownerName: a.owner.fullName,
    role: a.owner.designation?.trim() || 'Staff',
    month: a.month,
    status: st?.status ?? 'draft',
    days: a.days,
    prepared,
    verified,
    approved,
  };
}

export async function downloadStatementDocx(data: WorkStatementDocData): Promise<void> {
  const { buildWorkStatementDocx } = await import('@/lib/workStatementDocx');
  const blob = await buildWorkStatementDocx(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Daily-Work-Statement-${data.ownerName.replace(/[^A-Za-z0-9]+/g, '-')}-${data.month}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export { monthTitle };
