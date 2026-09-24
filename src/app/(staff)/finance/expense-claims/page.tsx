'use client';

import { useState } from 'react';
import { Receipt, Camera, Sparkles, CheckCircle2, DollarSign } from 'lucide-react';
import Link from 'next/link';

export default function ExpenseClaimsPage() {
  const [amount, setAmount] = useState('12500');
  const [vendor, setVendor] = useState('Teknaf Nursery Supplies');
  const [expenseDate, setExpenseDate] = useState('2026-09-22');
  const [ocrActive, setOcrActive] = useState(false);
  const [ocrMsg, setOcrMsg] = useState('');

  const triggerOcrScan = () => {
    setOcrActive(true);
    setTimeout(() => {
      setAmount('12500.00');
      setVendor('Teknaf Nursery Supplies Ltd.');
      setExpenseDate('2026-09-22');
      setOcrMsg('OCR Suggestion applied from receipt photo! Please confirm or edit.');
      setOcrActive(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:underline">Finance</Link> &rsaquo;
            <span className="font-semibold text-slate-800">Expense Claims</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            Expense Claim & Receipt OCR Scanner
          </h1>
          <p className="text-xs text-slate-500">
            Submit expense claims with automated receipt OCR suggestions.
          </p>
        </div>
      </div>

      {ocrMsg && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-xl text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" /> {ocrMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Receipt Upload & OCR Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Camera className="w-4 h-4 text-slate-600" /> 1. Upload Receipt Photo
          </h2>

          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center space-y-2 hover:border-blue-400 transition-colors">
            <Receipt className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-xs text-slate-600">Drag & drop receipt photo or click to upload</p>
            <p className="text-[10px] text-slate-400">Supports JPG, PNG (Max 10 MB)</p>
          </div>

          <button
            onClick={triggerOcrScan}
            disabled={ocrActive}
            className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-indigo-200 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            {ocrActive ? 'Scanning Receipt with OCR...' : 'Run Receipt OCR Scanner'}
          </button>
        </div>

        {/* Claim Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900">2. Confirm Claim Details</h2>

          <form onSubmit={(e) => { e.preventDefault(); alert('Expense claim submitted for PM approval!'); }} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (BDT)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor Name</label>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Date</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
            >
              Submit Claim for Approval
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
