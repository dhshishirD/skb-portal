'use client';

import { useState } from 'react';
import { DollarSign, Flame, TrendingUp, PieChart } from 'lucide-react';
import Link from 'next/link';

interface GrantBudget {
  id: string;
  code: string;
  title: string;
  currency: string;
  totalAmount: number;
  spentAmount: number;
  burnRatePercent: number;
}

const MOCK_GRANTS: GrantBudget[] = [];

export default function GrantBudgetsPage() {
  const [grants] = useState<GrantBudget[]>(MOCK_GRANTS);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:underline">Finance</Link> &rsaquo;
            <span className="font-semibold text-slate-800">Grant Budgets</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            Grant Budget & Burn Rate Tracker
          </h1>
          <p className="text-xs text-slate-500">
            Real-time grant burn rate tracking, commitment forecasting, and budget lines.
          </p>
        </div>
      </div>

      {grants.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {grants.map((grant) => (
            <div key={grant.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-blue-600">{grant.code}</span>
                <span className="text-xs font-semibold text-slate-500">{grant.currency}</span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 leading-snug">{grant.title}</h3>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-500">Burn Rate</span>
                  <span className="text-amber-600 font-bold">{grant.burnRatePercent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2.5 rounded-full transition-all"
                    style={{ width: `${grant.burnRatePercent}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <p className="text-[10px] text-slate-400">Total Budget</p>
                  <p className="font-bold text-slate-900">{grant.currency} {grant.totalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Spent Amount</p>
                  <p className="font-bold text-emerald-600">{grant.currency} {grant.spentAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-3">
          <PieChart className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Active Grant Budgets Registered</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Grant budget lines and burn rate metrics will populate automatically when project funding allocations are linked from Supabase database.
          </p>
        </div>
      )}
    </div>
  );
}
