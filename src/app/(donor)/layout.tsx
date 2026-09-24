import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Lock } from 'lucide-react';

export default function DonorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const roleT = useTranslations('RoleAreas');

  return (
    <div className="min-h-screen bg-amber-50/50 flex flex-col">
      <header className="bg-amber-900 text-amber-50 px-4 py-3 shadow flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-300" />
          <h1 className="text-sm font-bold">{roleT('donor')}</h1>
        </div>
        <LanguageSwitcher />
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
