'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/language-switcher';
import { 
  Smartphone, 
  Wifi, 
  WifiOff, 
  FileText, 
  UploadCloud, 
  UserCheck, 
  Receipt, 
  Home,
  LogOut
} from 'lucide-react';

export default function FieldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const roleT = useTranslations('RoleAreas');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* PWA Mobile Header */}
      <header className="bg-slate-900 border-b border-emerald-900/60 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-xs">
            SKB
          </div>
          <div>
            <h1 className="text-xs font-bold text-white flex items-center gap-1.5">
              Field Operations Workspace
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-400/30">PWA</span>
            </h1>
            <p className="text-[10px] text-emerald-400 font-mono">Mobile Offline Workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link 
            href="/login" 
            className="p-1 rounded-lg text-slate-400 hover:text-red-400 transition"
            title="Exit Workspace"
          >
            <LogOut className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Main Field Content */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full pb-20">
        {children}
      </main>

      {/* Touch-Friendly PWA Bottom Navigation Bar */}
      <nav className="bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-4 py-2 flex justify-around fixed bottom-0 inset-x-0 z-40 max-w-lg mx-auto">
        <Link 
          href="/field-dashboard" 
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition ${
            pathname === '/field-dashboard' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Field Home</span>
        </Link>

        <Link 
          href="/field-dashboard/new-beneficiary" 
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition ${
            pathname === '/field-dashboard/new-beneficiary' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-5 h-5" />
          <span>New NID</span>
        </Link>

        <Link 
          href="/field-dashboard/new-report" 
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition ${
            pathname === '/field-dashboard/new-report' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span>Progress Report</span>
        </Link>

        <Link 
          href="/field-dashboard" 
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-emerald-400 transition"
        >
          <UploadCloud className="w-5 h-5" />
          <span>Sync Queue</span>
        </Link>
      </nav>
    </div>
  );
}
