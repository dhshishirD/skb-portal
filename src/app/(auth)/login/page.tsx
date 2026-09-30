'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signInAction } from '@/app/actions/auth';
import { Globe, Lock, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const [emailInput, setEmailInput] = useState('audit@ihh.org.tr');
  const [passwordInput, setPasswordInput] = useState('IHH-SKB-2026');

  return (
    <div className="space-y-5 max-w-sm mx-auto">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-extrabold text-slate-900">Sign In to SKB Portal</h2>
        <p className="text-xs text-slate-500">IHH Partner Access & Audit Clearance Portal</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-900 p-3.5 rounded-xl text-xs space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold">
          <Globe className="w-4 h-4 text-blue-600 shrink-0" />
          <span>IHH Humanitarian Relief Foundation (Turkey 🇹🇷)</span>
        </div>
        <p className="text-[11px] text-blue-800 leading-relaxed">
          Default credentials pre-filled below. Click &quot;Sign In to Donor Hub&quot; to open your portal.
        </p>
      </div>

      <form action={signInAction} className="space-y-3.5">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            IHH Official Email
          </label>
          <input
            name="email"
            type="text"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="audit@ihh.org.tr"
            required
            className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-semibold"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Access Password
          </label>
          <input
            name="password"
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="IHH-SKB-2026"
            required
            className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-semibold"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
        >
          <Lock className="w-3.5 h-3.5" /> Sign In to Donor Hub
        </button>
      </form>

      <div className="text-center pt-1">
        <Link 
          href="/donor-dashboard?partner=IHH"
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
        >
          Direct Link: https://www.skbportal.online/donor-dashboard?partner=IHH &rsaquo;
        </Link>
      </div>
    </div>
  );
}
