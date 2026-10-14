'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { LanguageSwitcher } from '@/components/language-switcher';
import { 
  Globe, 
  ShieldCheck, 
  Home, 
  FolderKanban, 
  FileCheck2, 
  MessageSquare, 
  DollarSign, 
  Menu, 
  X, 
  Building2, 
  CheckCircle2,
  Lock,
  ChevronRight
} from 'lucide-react';

interface PartnerLayoutMeta {
  shortName: string;
  flag: string;
  auditName: string;
  auditRole: string;
  operationsText: string;
}

const PARTNER_LAYOUT_MAP: Record<string, PartnerLayoutMeta> = {
  IHH_SOUTH_ASIA: {
    shortName: 'IHH South Asian Desk',
    flag: '🇹🇷',
    auditName: 'IHH South Asia Audit Bureau',
    auditRole: 'Regional Partner Audit Representative',
    operationsText: 'IHH South Asia Operations • Cloud Verified',
  },
  IHH_ADAK_AQIQAH: {
    shortName: 'IHH Adak & Aqiqah Department',
    flag: '🇹🇷',
    auditName: 'IHH Adak Aqiqah Directorate',
    auditRole: 'Livestock & Food Audit Representative',
    operationsText: 'IHH Adak Aqiqah Operations • Cloud Verified',
  },
  IHH_ORPHAN: {
    shortName: 'IHH Orphan Care Department',
    flag: '🇹🇷',
    auditName: 'IHH Orphan Care Directorate',
    auditRole: 'Child Protection Audit Representative',
    operationsText: 'IHH Orphan Operations • Cloud Verified',
  },
  UMUT_OL: {
    shortName: 'UMUT OL Derneği Workspace',
    flag: '🇹🇷',
    auditName: 'UMUT OL Audit Directorate',
    auditRole: 'Turkish INGO Audit Representative',
    operationsText: 'UMUT OL Operations • Cloud Verified',
  },
  MAVI_MARMARA: {
    shortName: 'Mavi Marmara Solidarity Desk',
    flag: '🇹🇷',
    auditName: 'Mavi Marmara Solidarity Audit',
    auditRole: 'Refugee Solidarity Representative',
    operationsText: 'Mavi Marmara Operations • Cloud Verified',
  },
  QWCQP: {
    shortName: 'QWCQP Welfare Desk',
    flag: '🌐',
    auditName: 'QWCQP International Audit Bureau',
    auditRole: 'Welfare Program Representative',
    operationsText: 'QWCQP Welfare Operations • Cloud Verified',
  },
  ALL: {
    shortName: 'Directorate Master Console',
    flag: '🏛️',
    auditName: 'SKB Directorate General',
    auditRole: 'HQ Central Governance & Audit',
    operationsText: 'HQ Multi-Tenant Engine • 6 Partner Desks Active',
  }
};

function DonorLayoutInner({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const partnerParam = (searchParams.get('partner') || 'IHH_ADAK_AQIQAH').toUpperCase();
  const partnerMeta = PARTNER_LAYOUT_MAP[partnerParam] || PARTNER_LAYOUT_MAP.IHH_ADAK_AQIQAH;

  const navItems = [
    { href: `/donor-dashboard?partner=${partnerParam}`, label: 'Partner Command Overview', icon: Globe },
    { href: `/donor-dashboard?partner=${partnerParam}#portfolio`, label: 'Grant Program Portfolio', icon: FolderKanban },
    { href: `/donor-dashboard?partner=${partnerParam}#compliance`, label: 'Form-7 Compliance', icon: FileCheck2, badge: '7/7' },
    { href: `/donor-dashboard?partner=${partnerParam}#clarifications`, label: 'Audit Clarification Threads', icon: MessageSquare, badge: 'Live' },
    { href: `/donor-dashboard?partner=${partnerParam}#financials`, label: 'Multi-Currency Disbursal', icon: DollarSign },
    { href: `/donor-dashboard?partner=${partnerParam}#security`, label: 'Partner Audit Verification', icon: ShieldCheck, badge: 'Verified' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Dynamic Executive Navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md px-4 sm:px-6 lg:px-8 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <Link href={`/donor-dashboard?partner=${partnerParam}`} className="font-bold text-base sm:text-lg flex items-center gap-2.5 text-white group">
              <Image
                src="/skb-logo.png"
                alt="Small Kindness Bangladesh Logo"
                width={32}
                height={32}
                priority
                className="w-8 h-8 object-contain filter drop-shadow transition-transform group-hover:scale-105"
              />
              <span className="hidden sm:inline tracking-tight font-extrabold text-slate-100">SKB Works Portal</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2.5 py-0.5 rounded-full border border-blue-400/30 flex items-center gap-1">
                <span>{partnerMeta.flag}</span> {partnerMeta.shortName}
              </span>
            </Link>
          </div>

          {/* Right Top Header Actions */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700/70 text-xs">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center">
                {partnerMeta.shortName.charAt(0)}
              </div>
              <div className="text-left leading-tight">
                <p className="font-bold text-slate-100 flex items-center gap-1">
                  {partnerMeta.auditName}
                </p>
                <p className="text-[10px] text-blue-400 font-medium">{partnerMeta.auditRole}</p>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-300 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Audit Clearance Seal
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
        </div>
      </header>

      {/* Main Donor Workspace Container with Desktop & Mobile Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Navigation Sidebar (Desktop & Mobile Drawer) */}
        <aside className={`
          fixed md:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 p-4 space-y-6 transform transition-transform duration-200 ease-in-out shrink-0
          ${mobileMenuOpen ? 'translate-x-0 pt-20 md:pt-4' : '-translate-x-full md:translate-x-0'}
        `}>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-3 mb-3">
              Partner Workspace & Audit Tools
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href.includes('#') && typeof window !== 'undefined' && window.location.hash && item.href.endsWith(window.location.hash));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all
                      ${isActive 
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                <Building2 className="w-3.5 h-3.5 text-blue-600" /> Isolated Workspace
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                {partnerMeta.operationsText}
              </p>
            </div>

            <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 text-emerald-950 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Audit Trust Rating
              </div>
              <p className="text-[10px] text-emerald-800 font-semibold">
                100% NGO Bureau Compliance Rating
              </p>
            </div>
          </div>
        </aside>

        {/* Mobile Backdrop overlay */}
        {mobileMenuOpen && (
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20 md:hidden"
          />
        )}

        {/* Main Donor Dashboard Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500 bg-white mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Small Kindness Bangladesh • Dedicated Partner Desk</span>
          <span className="text-slate-400">NGO Affairs Bureau Reg #2938 • Multi-Tenant Partner Isolation</span>
        </div>
      </footer>
    </div>
  );
}

export default function DonorLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-xs text-slate-400">
        Loading partner workspace...
      </div>
    }>
      <DonorLayoutInner>{children}</DonorLayoutInner>
    </Suspense>
  );
}
