'use client';

import { useState } from 'react';
import { ShoppingCart, FileCheck, AlertTriangle, Plus, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface RequestItem {
  id: string;
  projectName: string;
  description: string;
  estimatedAmount: string;
  quotationsCount: number;
  status: string;
}

const MOCK_REQUESTS: RequestItem[] = [];

export default function PurchaseRequestsPage() {
  const [requests] = useState<RequestItem[]>(MOCK_REQUESTS);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:underline">Procurement</Link> &rsaquo;
            <span className="font-semibold text-slate-800">Purchase Requests</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            Purchase Requests & Competitive Quotations
          </h1>
          <p className="text-xs text-slate-500">
            Enforces minimum 3 competitive vendor quotations for requests $\ge 50,000$ BDT before PO issuance.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-sm">
          <Plus className="w-4 h-4" /> New Purchase Request
        </button>
      </div>

      {requests.length > 0 ? (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-blue-600">{req.id}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                  {req.status}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">{req.description}</h3>
                <span className="font-mono font-bold text-sm text-slate-900">{req.estimatedAmount}</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500">{req.projectName}</span>

                {req.quotationsCount >= 3 ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5" /> 3 Quotes Verified (PO Eligible)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5" /> Need {3 - req.quotationsCount} More Quote(s)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-3">
          <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Active Purchase Requests</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click &ldquo;New Purchase Request&rdquo; to create a procurement request and attach 3 competitive vendor quotes.
          </p>
        </div>
      )}
    </div>
  );
}
