import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/language-switcher';
import { WifiOff, FileText, UploadCloud } from 'lucide-react';

export default function FieldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const roleT = useTranslations('RoleAreas');

  return (
    <div className="min-h-screen bg-emerald-950 text-emerald-50 flex flex-col">
      {/* PWA Mobile Header */}
      <header className="bg-emerald-900 border-b border-emerald-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
          <h1 className="text-sm font-bold">{roleT('field')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
            <WifiOff className="w-3 h-3" /> Offline Ready
          </span>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        {children}
      </main>

      {/* PWA Mobile Bottom Bar */}
      <nav className="bg-emerald-900 border-t border-emerald-800 px-6 py-2 flex justify-around sticky bottom-0">
        <Link href="/field-dashboard" className="flex flex-col items-center gap-1 text-emerald-300 text-[10px]">
          <FileText className="w-5 h-5" />
          Forms
        </Link>
        <Link href="/field-dashboard" className="flex flex-col items-center gap-1 text-emerald-400 text-[10px]">
          <UploadCloud className="w-5 h-5" />
          Sync Queue
        </Link>
      </nav>
    </div>
  );
}
