import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Globe, ShieldCheck, Home } from 'lucide-react';

export default function DonorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const roleT = useTranslations('RoleAreas');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Standard Slate/Blue Navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/skb-logo.png"
              alt="Small Kindness Bangladesh Logo"
              width={34}
              height={34}
              priority
              className="w-8.5 h-8.5 object-contain filter drop-shadow-sm transition-transform group-hover:scale-105"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white leading-none tracking-tight">SKB Works Portal</h1>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2.5 py-0.5 rounded-full border border-blue-400/30 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-blue-400" /> International Partner Hub
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Small Kindness Bangladesh Operations</p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-300 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Audit Clearance Portal
          </div>
          <LanguageSwitcher />
          <Link 
            href="/"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            title="Return to Main Portal"
          >
            <Home className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Main Donor Body Container */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500 bg-white mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Small Kindness Bangladesh • International Donor Intelligence Portal</span>
          <span className="text-slate-400">NGO Affairs Bureau Reg #2938 • Multi-Tenant Partner Security</span>
        </div>
      </footer>
    </div>
  );
}
