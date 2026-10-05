import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/language-switcher';
import { 
  LayoutDashboard, 
  Smartphone, 
  ShieldCheck, 
  Globe, 
  FolderKanban, 
  CheckCircle2, 
  ArrowRight, 
  Building2, 
  FileText, 
  Sparkles, 
  Receipt,
  Users,
  TrendingUp,
  Activity
} from 'lucide-react';

export default function RootPage() {
  const t = useTranslations('Common');
  const navT = useTranslations('Navigation');
  const roleT = useTranslations('RoleAreas');

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Top Navbar Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/skb-logo.png"
            alt="Small Kindness Bangladesh Logo"
            width={38}
            height={38}
            priority
            className="w-9 h-9 object-contain filter drop-shadow-sm"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-slate-900 leading-none">{t('appName')}</h1>
              <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                NGO Reg #2938
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Small Kindness Bangladesh Operations</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live System Active
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
        
        {/* Royal Blue Hero Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-blue-600/30 space-y-4 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              SKB Works Portal
            </h2>
            <p className="text-sm sm:text-base text-blue-100 leading-relaxed mt-2 max-w-3xl">
              Welcome to the official digital operations platform of Small Kindness Bangladesh. 
              Designed for high transparency, donor accountability, multi-currency grant tracking, and real-time field telemetry.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-blue-100">
            <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl border border-white/10">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Multi-Tenant Security
            </span>
            <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl border border-white/10">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Live Field Data Sync
            </span>
            <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl border border-white/10">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Official Form-7 Exporter
            </span>
          </div>
        </div>

        {/* Live Development & System Progress Banner */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Live Portal System Telemetry & Development Progress
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Updated Real-Time</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Active Projects</span>
              <span className="text-lg font-extrabold text-slate-900">19 Live PIDs</span>
              <span className="text-[10px] text-emerald-600 font-bold block">✓ 100% Audit Tracked</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Verified Beneficiaries</span>
              <span className="text-lg font-extrabold text-slate-900">12,450 Records</span>
              <span className="text-[10px] text-blue-600 font-bold block">✓ NID Deduplicated</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Grant Currencies</span>
              <span className="text-lg font-extrabold text-slate-900">USD, EUR, TRY, BDT</span>
              <span className="text-[10px] text-indigo-600 font-bold block">✓ Auto Rate Conversion</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Donor Compliance</span>
              <span className="text-lg font-extrabold text-emerald-700">9-File Repository</span>
              <span className="text-[10px] text-emerald-600 font-bold block">✓ 1-Click ZIP Exporter</span>
            </div>
          </div>
        </div>

        {/* Primary Functional Workspaces Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" /> Functional Portal Workspaces
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* WORKSPACE 1: HQ COMMAND (ED, Super Admin, IT Officer) */}
            <Link
              href="/dashboard"
              className="group p-6 rounded-2xl border border-blue-200 bg-white hover:bg-blue-50/40 hover:border-blue-400 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <LayoutDashboard className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
                    HQ Command & Staff
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors">
                    1. HQ Command (ED, Super Admin, IT Officer)
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Executive control panel for Directorate, Program Officers, Finance, and IT. Manage donor objection ticket routing, 3-tier financial approvals, active project portfolios, and HQ operations.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-700 group-hover:translate-x-0.5 transition-transform">
                <span>Enter HQ Command Workspace</span>
                <ArrowRight className="w-4 h-4 text-blue-600" />
              </div>
            </Link>

            {/* WORKSPACE 2: PROJECTS DIRECTORY & DOCUMENT REPOSITORY (Program, Finance, Law Office) */}
            <Link
              href="/projects"
              className="group p-6 rounded-2xl border border-purple-200 bg-white hover:bg-purple-50/40 hover:border-purple-400 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                    <FolderKanban className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold bg-purple-50 text-purple-800 px-2.5 py-1 rounded-full border border-purple-200">
                    Programs & Compliance Repository
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-extrabold text-slate-900 group-hover:text-purple-900 transition-colors">
                    2. Projects Directory & Document Repository (Program, Finance, Law Office)
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Browse all SKB program portfolios with quick-action sub-tabs for Kanban lifecycle, logframe indicator targets, work plan tasks, beneficiary registers, legal docs, and document submission repositories.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-800 group-hover:translate-x-0.5 transition-transform">
                <span>Browse Projects Directory</span>
                <ArrowRight className="w-4 h-4 text-purple-600" />
              </div>
            </Link>

            {/* WORKSPACE 3: FIELD OFFICER WORKSPACE */}
            <Link
              href="/field-dashboard"
              className="group p-6 rounded-2xl border border-emerald-200 bg-white hover:bg-emerald-50/40 hover:border-emerald-400 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
                    Field Officers (Offline PWA)
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-900 transition-colors">
                    3. Field Officer Workspace
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Mobile-optimized offline workspace for field officers in Cox&apos;s Bazar, Kurigram, and Bandarban. Features KoBo 8-field NID check forms, IndexedDB local queues, and 1-click cloud sync.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-800 group-hover:translate-x-0.5 transition-transform">
                <span>Open Field Officer App</span>
                <ArrowRight className="w-4 h-4 text-emerald-600" />
              </div>
            </Link>

            {/* WORKSPACE 4: INTERNATIONAL PARTNER HUB (POSITION #4 - LAST) */}
            <Link
              href="/donor-dashboard?partner=IHH"
              className="group p-6 rounded-2xl border border-blue-200 bg-white hover:bg-blue-50/40 hover:border-blue-400 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Globe className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold bg-blue-50 text-blue-800 px-2.5 py-1 rounded-full border border-blue-200">
                    International Partner Hub
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-extrabold text-slate-900 group-hover:text-blue-800 transition-colors">
                    4. International Partner Hub
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Designed for partner organizations (IHH Turkey, UNHCR, etc.). Inspect compliance packages, preview Form-7 PDF reports inline, download complete zip archives, and grant 1-click audit sign-offs.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-800 group-hover:translate-x-0.5 transition-transform">
                <span>Enter Partner Portal</span>
                <ArrowRight className="w-4 h-4 text-blue-600" />
              </div>
            </Link>

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-5 px-4 text-center text-xs text-slate-500 bg-white mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Small Kindness Bangladesh • SKB Works Portal v2.4</span>
          <span className="text-slate-400">NGO Affairs Bureau Reg #2938 • Multi-Tenant Secured Infrastructure</span>
        </div>
      </footer>
    </div>
  );
}
