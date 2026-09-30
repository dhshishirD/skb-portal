'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { signInAction } from '@/app/actions/auth';
import { KeyRound, ShieldCheck, UserCheck, Globe, Building } from 'lucide-react';

export default function LoginPage() {
  const t = useTranslations('Auth');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const fillCredentials = (email: string, pass: string) => {
    setEmailInput(email);
    setPasswordInput(pass);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-bold text-slate-900">{t('loginTitle')}</h2>
        <p className="text-xs text-slate-500">{t('loginDescription')}</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs leading-relaxed">
        <strong>{t('inviteOnlyNotice')}</strong>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-900 p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 font-medium">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-600 shrink-0" />
          <span>International Partner Hub (IHH / UNHCR)</span>
        </div>
        <Link 
          href="/donor-dashboard?partner=IHH" 
          className="font-bold text-blue-600 hover:underline whitespace-nowrap bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-xs"
        >
          Open Donor Hub &rsaquo;
        </Link>
      </div>

      {/* QUICK CREDENTIAL SELECTOR PANEL */}
      <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2.5 text-xs">
        <span className="font-bold text-slate-700 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
          <KeyRound className="w-3.5 h-3.5 text-blue-600" /> Authorized Login Credentials
        </span>

        <div className="space-y-1.5 font-mono text-[11px]">
          {/* Option 1: IHH Donor */}
          <button
            type="button"
            onClick={() => fillCredentials('ihh@skb.org.bd', 'ihh-partner-access-2026')}
            className="w-full bg-white p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 text-left transition flex items-center justify-between group"
          >
            <div>
              <span className="font-bold text-blue-700 block font-sans text-xs">🇹🇷 IHH Humanitarian Relief Foundation</span>
              <span className="text-slate-600">Email: <strong>ihh@skb.org.bd</strong></span>
              <span className="text-slate-400 block text-[10px]">Pass: <strong>ihh-partner-access-2026</strong></span>
            </div>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded group-hover:bg-blue-600 group-hover:text-white transition">
              Auto-Fill
            </span>
          </button>

          {/* Option 2: Executive Admin / Boss */}
          <button
            type="button"
            onClick={() => fillCredentials('admin@skb.org.bd', 'skb2026')}
            className="w-full bg-white p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 text-left transition flex items-center justify-between group"
          >
            <div>
              <span className="font-bold text-slate-900 block font-sans text-xs">👑 Executive Director & Admin</span>
              <span className="text-slate-600">Email: <strong>admin@skb.org.bd</strong></span>
              <span className="text-slate-400 block text-[10px]">Pass: <strong>skb2026</strong></span>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded group-hover:bg-slate-900 group-hover:text-white transition">
              Auto-Fill
            </span>
          </button>

          {/* Option 3: Program Officer */}
          <button
            type="button"
            onClick={() => fillCredentials('uddinmizbah902@gmail.com', 'skb2026')}
            className="w-full bg-white p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 text-left transition flex items-center justify-between group"
          >
            <div>
              <span className="font-bold text-slate-900 block font-sans text-xs">📋 Program Officer (Mizbah Uddin)</span>
              <span className="text-slate-600">Email: <strong>uddinmizbah902@gmail.com</strong></span>
              <span className="text-slate-400 block text-[10px]">Pass: <strong>skb2026</strong></span>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded group-hover:bg-slate-900 group-hover:text-white transition">
              Auto-Fill
            </span>
          </button>
        </div>
      </div>

      <form action={signInAction} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            {t('email')}
          </label>
          <input
            name="email"
            type="text"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="e.g. ihh@skb.org.bd or admin@skb.org.bd"
            required
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            {t('password')}
          </label>
          <input
            name="password"
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm font-bold"
        >
          Sign In to Portal
        </button>
      </form>

      <div className="flex justify-between text-xs pt-2">
        <Link href="/reset-password" className="text-blue-600 hover:underline">
          Forgot Password?
        </Link>
        <Link href="/" className="text-slate-500 hover:underline">
          &larr; Back to Portal Home
        </Link>
      </div>
    </div>
  );
}
