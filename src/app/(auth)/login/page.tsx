'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { signInAction } from '@/app/actions/auth';

export default function LoginPage() {
  const t = useTranslations('Auth');

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-bold text-slate-900">{t('loginTitle')}</h2>
        <p className="text-xs text-slate-500">{t('loginDescription')}</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs leading-relaxed">
        <strong>{t('inviteOnlyNotice')}</strong>
      </div>

      <form action={signInAction} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            {t('email')}
          </label>
          <input
            name="email"
            type="email"
            placeholder="user@organization.org"
            required
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            {t('password')}
          </label>
          <input
            name="password"
            type="password"
            placeholder="••••••••"
            required
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
        >
          {t('submit')} (MFA Enforced)
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
