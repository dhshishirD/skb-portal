import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/language-switcher';
import { LayoutDashboard, FolderKanban, Receipt, ShieldCheck } from 'lucide-react';

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const commonT = useTranslations('Common');
  const navT = useTranslations('Navigation');
  const roleT = useTranslations('RoleAreas');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white px-4 py-3 shadow flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-bold text-base flex items-center gap-2">
            <span className="w-7 h-7 rounded bg-blue-500 flex items-center justify-center text-xs">HQ</span>
            {roleT('staff')}
          </Link>
        </div>
        <LanguageSwitcher />
      </header>

      {/* Main Staff Container */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Navigation Sidebar / Mobile Bar */}
        <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Staff Workspace
          </p>
          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg bg-blue-50 text-blue-700"
            >
              <LayoutDashboard className="w-4 h-4" />
              {navT('dashboard')}
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <FolderKanban className="w-4 h-4" />
              {navT('projects')}
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Receipt className="w-4 h-4" />
              {navT('finance')}
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <ShieldCheck className="w-4 h-4" />
              {navT('admin')}
            </Link>
          </nav>
        </aside>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 max-w-5xl">
          {children}
        </main>
      </div>
    </div>
  );
}
