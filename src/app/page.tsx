import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/language-switcher';
import { LayoutDashboard, Smartphone, ShieldCheck, HeartHandshake } from 'lucide-react';

export default function RootPage() {
  const t = useTranslations('Common');
  const navT = useTranslations('Navigation');
  const roleT = useTranslations('RoleAreas');

  return (
    <div className="flex flex-col min-h-screen">
      {/* Mobile-first Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
            S
          </div>
          <div>
            <h1 className="text-base font-bold leading-none">{t('appName')}</h1>
            <p className="text-[10px] text-slate-500">{t('tagline')}</p>
          </div>
        </div>
        <LanguageSwitcher />
      </header>

      {/* Main Content Container */}
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-2xl shadow-md space-y-3">
          <span className="inline-block bg-blue-500/30 text-blue-100 text-xs px-2.5 py-1 rounded-full font-medium">
            Enterprise Platform • All 7 Phases Enabled
          </span>
          <h2 className="text-2xl font-bold">{t('appName')}</h2>
          <p className="text-sm text-blue-100 leading-relaxed">
            Welcome to the SKB Operations Portal. Choose your functional workspace below.
          </p>
        </div>

        {/* Workspace Quick Nav Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/login"
            className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm hover:border-blue-500 hover:shadow-md transition-all flex items-start gap-4"
          >
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{roleT('auth')}</h3>
              <p className="text-xs text-slate-500 mt-1">Sign in with MFA & invite credentials</p>
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm hover:border-blue-500 hover:shadow-md transition-all flex items-start gap-4"
          >
            <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{roleT('staff')}</h3>
              <p className="text-xs text-slate-500 mt-1">HQ, Finance, M&E & Project Managers</p>
            </div>
          </Link>

          <Link
            href="/field-dashboard"
            className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm hover:border-blue-500 hover:shadow-md transition-all flex items-start gap-4"
          >
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{roleT('field')}</h3>
              <p className="text-xs text-slate-500 mt-1">Offline report forms for Field Officers</p>
            </div>
          </Link>

          <Link
            href="/donor-dashboard"
            className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm hover:border-blue-500 hover:shadow-md transition-all flex items-start gap-4"
          >
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{roleT('donor')}</h3>
              <p className="text-xs text-slate-500 mt-1">Read-only published grant reports</p>
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500 bg-white mt-auto">
        &copy; {new Date().getFullYear()} {t('appName')} • Secure & Isolated Environment
      </footer>
    </div>
  );
}
