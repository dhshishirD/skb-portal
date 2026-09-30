'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Globe, ArrowRight, ShieldCheck, Building2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="space-y-5 max-w-md mx-auto text-center">
      <div className="space-y-1">
        <h2 className="text-xl font-extrabold text-slate-900">Welcome to SKB Works Portal</h2>
        <p className="text-xs text-slate-500">Small Kindness Bangladesh • Open Access Mode</p>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-3.5 rounded-2xl text-xs space-y-1 text-left">
        <div className="flex items-center gap-1.5 font-extrabold text-emerald-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Password-Free Direct Access Active</span>
        </div>
        <p className="text-[11px] text-emerald-800 leading-relaxed">
          No login password is required right now. Select a workspace below to enter instantly.
        </p>
      </div>

      <div className="space-y-3 pt-1">
        {/* 1. Primary IHH Donor Hub Access */}
        <button
          onClick={() => router.push('/donor-dashboard?partner=IHH')}
          className="w-full p-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl shadow-md transition-all text-left flex items-center justify-between group cursor-pointer"
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-base">🇹🇷</span>
              <span className="font-extrabold text-sm">IHH International Donor Portal</span>
            </div>
            <p className="text-[11px] text-blue-100">
              Inspect IHH-funded projects, Form-7 clearance, beneficiary register & 1-click audit ZIP export.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-blue-200 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
        </button>

        {/* 2. Staff & Executive Dashboard */}
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full p-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-sm transition-all text-left flex items-center justify-between group cursor-pointer"
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-300" />
              <span className="font-extrabold text-sm">Staff & Executive Directorate Dashboard</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Program Management, Procurement, Finance Approvals & NGO Bureau Compliance.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
        </button>
      </div>

      <div className="pt-2 text-xs text-slate-500">
        Direct URL: <Link href="/donor-dashboard?partner=IHH" className="font-bold text-blue-600 hover:underline">https://www.skbportal.online/donor-dashboard?partner=IHH</Link>
      </div>
    </div>
  );
}
