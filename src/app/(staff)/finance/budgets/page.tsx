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

const MOCK_GRANTS: GrantBudget[] = [
  { id: '1', code: 'G1-USAID', title: 'Coastal Climate Resilience Grant', currency: 'USD', totalAmount: 500000, spentAmount: 150000, burnRatePercent: 30.0 },
  { id: '2', code: 'G2-EUDEV', title: 'Primary Healthcare & Sanitation Grant', currency: 'EUR', totalAmount: 350000, spentAmount: 175000, burnRatePercent: 50.0 },
  { id: '3', code: 'G3-USAID', title: 'Youth Livelihoods & Vocational Skills', currency: 'USD', totalAmount: 250000, spentAmount: 45000, burnRatePercent: 18.0 },
];

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
    </div>
  );
}
