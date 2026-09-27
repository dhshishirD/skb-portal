'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { 
  FolderKanban, 
  Receipt, 
  CheckCircle2, 
  Users, 
  BarChart3, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Building2,
  Calendar
} from 'lucide-react';

export default function StaffDashboardPage() {
  const navT = useTranslations('Navigation');
  const roleT = useTranslations('RoleAreas');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <Building2 className="w-3.5 h-3.5" /> SKB Works Headquarters
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{roleT('staff')} Executive Control Panel</h1>
          <p className="text-xs text-slate-500 mt-1">
            Overview of active projects, multi-tenant grants, pending financial approvals, and M&E analytics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/me/report-generator" 
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            AI Donor Generator
          </Link>
          <Link 
            href="/finance/approvals" 
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition"
          >
            Pending Approvals (3)
          </Link>
        </div>
      </div>

      {/* Primary Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Projects</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">4</p>
          <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> 100% On-Track Milestones
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Grants</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">3</p>
          <p className="text-[11px] text-slate-500">৳45.2M Total Funding</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending Approvals</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-600">3</p>
          <p className="text-[11px] text-amber-700 font-medium">Requires HQ Sign-off</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Beneficiaries</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">12,450</p>
          <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> NID Verified Records
          </p>
        </div>
      </div>

      {/* Operational Module Shortcuts */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900">Core Portal Workspaces</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link 
            href="/finance/approvals" 
            className="group p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" />
                Finance & Approvals
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="text-xs text-slate-500">
              3-tier expense review (PM → Finance → HQ Admin), multi-currency budgets, and disbursed claim audit trails.
            </p>
          </Link>

          <Link 
            href="/me/dashboard" 
            className="group p-4 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 transition space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 group-hover:text-purple-600 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                M&E & Field Analytics
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="text-xs text-slate-500">
              Bangladesh district coverage maps, indicator achievement tracking, and offline field report validations.
            </p>
          </Link>

          <Link 
            href="/admin/users" 
            className="group p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Admin & Governance
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="text-xs text-slate-500">
              Role-based Access Control (RBAC), multi-tenant user provisioning, audit logging, and security policies.
            </p>
          </Link>
        </div>
      </div>

      {/* Recent Activity & Key Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Projects Portfolio */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Active Program Portfolio</h2>
            <span className="text-xs text-blue-600 font-medium">4 Projects Live</span>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 bg-slate-50 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">Rohingya WASH Emergency Phase 2</span>
                <span className="text-emerald-600 font-semibold">85% Complete</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-1.5 rounded-full w-[85%]"></div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Cox&apos;s Bazar District</span>
                <span>Budget: $150,000</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">Flood Resilience & Livelihoods</span>
                <span className="text-amber-600 font-semibold">60% Complete</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-1.5 rounded-full w-[60%]"></div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Kurigram District</span>
                <span>Budget: $120,000</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Approvals Quick Queue */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Immediate Actions Needed</h2>
            <Link href="/finance/approvals" className="text-xs text-blue-600 hover:underline">
              View All (3)
            </Link>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 border border-amber-200 bg-amber-50/40 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">WASH Water Pump Maintenance</p>
                <p className="text-[11px] text-slate-500">Claimed by Field Officer • ৳45,000 BDT</p>
              </div>
              <Link 
                href="/finance/approvals" 
                className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg transition"
              >
                Review
              </Link>
            </div>

            <div className="p-3.5 border border-slate-200 bg-slate-50/50 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">Solar Latrine Kit Procurement</p>
                <p className="text-[11px] text-slate-500">Vendor Bid Evaluation • $12,500 USD</p>
              </div>
              <Link 
                href="/procurement/requests" 
                className="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg transition"
              >
                Review
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

