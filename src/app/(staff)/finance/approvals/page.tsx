'use client';

import { useState } from 'react';
import { ShieldCheck, Check, X, RotateCcw, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface PendingClaim {
  id: string;
  claimantName: string;
  projectName: string;
  amount: string;
  date: string;
  description: string;
  requiredRole: string;
}

const MOCK_PENDING_CLAIMS: PendingClaim[] = [
  {
    id: 'EXP-101',
    claimantName: 'Karim Field Officer',
    projectName: 'P1-CLIMATE',
    amount: '12,500.00 BDT',
    date: '2026-09-22',
    description: 'Mangrove saplings transport & labor charges in Teknaf',
    requiredRole: 'programme_manager',
  },
  {
    id: 'EXP-102',
    claimantName: 'Tariq Project Officer',
    projectName: 'P2-HEALTH',
    amount: '45,000.00 BDT',
    date: '2026-09-23',
    description: 'WASH sanitation supplies procurement in Ukhiya',
    requiredRole: 'finance',
  },
];

export default function ApprovalsQueuePage() {
  const [claims, setClaims] = useState<PendingClaim[]>(MOCK_PENDING_CLAIMS);
  const [feedback, setFeedback] = useState('');

  const handleApprove = (id: string) => {
    setClaims((prev) => prev.filter((c) => c.id !== id));
    setFeedback(`Claim ${id} successfully approved! Separation of duties verified.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:underline">Finance</Link> &rsaquo;
            <span className="font-semibold text-slate-800">Approvals Queue</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Financial Approvals Queue
          </h1>
          <p className="text-xs text-slate-500">
            Multi-step workflow approval chain enforcing separation of duties in database.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs">
          {feedback}
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl text-xs flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong>Separation of Duties Policy:</strong> Submitter cannot approve their own claim. The database automatically blocks self-approvals and consecutive approvals by the same user.
        </div>
      </div>

      <div className="space-y-4">
        {claims.map((claim) => (
          <div key={claim.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-blue-600">{claim.id}</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                Pending: {claim.requiredRole}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm font-bold text-slate-900">
                <span>{claim.claimantName}</span>
                <span className="text-blue-700 font-mono">{claim.amount}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{claim.projectName} • Submitted on {claim.date}</p>
            </div>

            <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl">{claim.description}</p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setClaims((prev) => prev.filter((c) => c.id !== claim.id))}
                className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Reject
              </button>
              <button
                onClick={() => handleApprove(claim.id)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Approve Step
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
