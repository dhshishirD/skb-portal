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
  const sectionParam = (searchParams.get('section') || 'overview').toLowerCase();

  const navItems = [
    { key: 'overview', href: `/donor-dashboard?partner=${partnerParam}&section=overview`, label: 'Overview', icon: Globe },
    { key: 'projects', href: `/donor-dashboard?partner=${partnerParam}&section=projects`, label: 'Projects', icon: FolderKanban },
    { key: 'compliance', href: `/donor-dashboard?partner=${partnerParam}&section=compliance`, label: 'Compliance & Form-7', icon: FileCheck2, badge: '7/7' },
    { key: 'messages', href: `/donor-dashboard?partner=${partnerParam}&section=messages`, label: 'Messages & Inquiries', icon: MessageSquare },
    { key: 'financials', href: `/donor-dashboard?partner=${partnerParam}&section=financials`, label: 'Financials', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Dynamic Executive Navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-xs px-4 sm:px-6 lg:px-8 py-2.5 sticky top-0 z-40">
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
              <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2.5 py-0.5 rounded-full border border-slate-700 flex items-center gap-1">
                <span>{partnerMeta.flag}</span> {partnerMeta.shortName}
              </span>
            </Link>
          </div>

          {/* Right Top Header Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 text-xs">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                {partnerMeta.shortName.charAt(0)}
              </div>
              <div className="text-left leading-tight">
                <p className="font-bold text-slate-200">
                  {partnerMeta.shortName}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">{partnerMeta.auditRole}</p>
              </div>
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
          fixed md:static inset-y-0 left-0 z-30 w-60 bg-white border-r border-slate-200/80 p-4 space-y-6 transform transition-transform duration-200 ease-in-out shrink-0
          ${mobileMenuOpen ? 'translate-x-0 pt-20 md:pt-4' : '-translate-x-full md:translate-x-0'}
        `}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2.5">
              Partner Portal
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = sectionParam === item.key;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all
                      ${isActive 
                        ? 'bg-slate-900 text-white shadow-xs' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                    `}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-slate-100 px-3 text-[11px] text-slate-400 space-y-0.5">
            <p className="font-bold text-slate-700">Small Kindness Bangladesh</p>
            <p className="text-[10px] text-slate-400">NGO Affairs Bureau Reg. #2938</p>
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
