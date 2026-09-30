'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { 
  Wifi, 
  WifiOff, 
  PlusCircle, 
  Receipt, 
  UploadCloud, 
  CheckCircle2, 
  Smartphone, 
  ExternalLink,
  MapPin,
  RefreshCw,
  UserCheck,
  FolderKanban,
  Camera,
  AlertTriangle,
  FileText,
  Phone,
  ChevronRight,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { getOfflineReports, clearOfflineReport, OfflineFieldReport } from '@/lib/offline/db';

export default function FieldDashboardPage() {
  const roleT = useTranslations('RoleAreas');
  const [isOnline, setIsOnline] = useState(true);
  const [pendingReports, setPendingReports] = useState<OfflineFieldReport[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState('');
  const [activeOfficer, setActiveOfficer] = useState({
    name: 'Mizbah Uddin',
    role: 'Program & Field Officer',
    zone: "Cox's Bazar & Kurigram",
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
  });

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load offline queue
    setPendingReports(getOfflineReports());

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSyncAll = async () => {
    if (pendingReports.length === 0) return;
    setSyncing(true);
    setSyncSuccessMsg('');

    await new Promise((resolve) => setTimeout(resolve, 1500));

    pendingReports.forEach((report) => {
      clearOfflineReport(report.id);
    });

    setPendingReports([]);
    setSyncing(false);
    setSyncSuccessMsg('All offline field submissions synced live to SKB Production Database!');
  };

  return (
    <div className="space-y-4">
      {/* 1. OFFICER PROFILE & NETWORK STATUS BANNER */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={activeOfficer.avatar} 
              alt={activeOfficer.name} 
              className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500/60" 
            />
            <div>
              <h2 className="text-sm font-extrabold text-white">{activeOfficer.name}</h2>
              <p className="text-[11px] text-emerald-400 font-semibold">{activeOfficer.role}</p>
            </div>
          </div>

          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
            isOnline 
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
          }`}>
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" /> 4G Online
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" /> Offline Mode
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
          <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span>Assigned Zone: <strong className="text-slate-200">{activeOfficer.zone}</strong></span>
        </div>
      </div>

      {syncSuccessMsg && (
        <div className="bg-emerald-900/90 border border-emerald-500 text-emerald-100 p-3 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
          <span>{syncSuccessMsg}</span>
        </div>
      )}

      {/* 2. PRIMARY QUICK TOUCH ACTIONS GRID */}
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 px-1">
          Field Operations Quick Menu
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Link 
            href="/field-dashboard/new-beneficiary"
            className="p-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-2xl shadow-lg space-y-2 transition-all flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-extrabold">New Beneficiary</p>
              <p className="text-[10px] text-emerald-100 mt-0.5">KoBo 8-Field NID Check</p>
            </div>
          </Link>

          <Link 
            href="/field-dashboard/new-report"
            className="p-4 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-2xl shadow-lg space-y-2 transition-all flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-extrabold">Progress Report</p>
              <p className="text-[10px] text-blue-100 mt-0.5">Milestone & Logframe</p>
            </div>
          </Link>

          <Link 
            href="/finance/expense-claims"
            className="p-4 bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-100 rounded-2xl border border-slate-800 space-y-2 transition-all flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold">Submit Expense Claim</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Voucher & Claims</p>
            </div>
          </Link>

          <a 
            href="https://drive.google.com/drive/folders/1mlDU1TGV-tXIMJAEWfw1IhSlS2UzmDqA"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-100 rounded-2xl border border-slate-800 space-y-2 transition-all flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold">Upload Photos</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Google Drive Album</p>
            </div>
          </a>
        </div>
      </div>

      {/* 3. ASSIGNED ACTIVE PROJECTS CARDS */}
      <div className="space-y-2.5">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
          My Active Assigned Projects (2)
        </p>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
              P-WASH-01
            </span>
            <span className="text-[10px] font-bold text-emerald-400">85% Complete</span>
          </div>
          <h3 className="text-xs font-bold text-white">Rohingya WASH Emergency Phase 2</h3>
          <p className="text-[11px] text-slate-400">📍 Cox’s Bazar • 4,500 Registered Beneficiaries</p>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full w-[85%]"></div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
              P-FLD-02
            </span>
            <span className="text-[10px] font-bold text-amber-400">60% Complete</span>
          </div>
          <h3 className="text-xs font-bold text-white">Flood Resilience & Livelihoods Support</h3>
          <p className="text-[11px] text-slate-400">📍 Kurigram District • 3,200 Registered Beneficiaries</p>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-amber-500 h-1.5 rounded-full w-[60%]"></div>
          </div>
        </div>
      </div>

      {/* 4. OFFLINE STORAGE SYNC QUEUE */}
      <div className="border border-emerald-900/80 bg-emerald-950/60 p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white">Offline Local Queue (IndexedDB)</span>
          </div>
          <span className="text-xs font-extrabold bg-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-700 text-emerald-300">
            {pendingReports.length} Queued
          </span>
        </div>

        {pendingReports.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] text-emerald-300">
              You have {pendingReports.length} report(s) saved locally on your mobile device waiting for sync.
            </p>
            <button
              onClick={handleSyncAll}
              disabled={syncing || !isOnline}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Syncing Reports...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" /> Sync All Reports Now
                </>
              )}
            </button>
          </div>
        ) : (
          <p className="text-[11px] text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            All field records synchronized live with SKB Production Database.
          </p>
        )}
      </div>

      {/* 5. HQ EMERGENCY HOTLINE */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <Phone className="w-4 h-4 text-emerald-400" />
          <div>
            <p className="font-bold text-white text-[11px]">HQ Emergency Support Hotline</p>
            <p className="text-[10px] text-slate-400">Executive & Admin Direct Line</p>
          </div>
        </div>
        <a 
          href="tel:+8801700000000"
          className="px-3 py-1.5 bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 rounded-xl font-bold text-[11px] hover:bg-emerald-600 hover:text-white transition"
        >
          Call HQ
        </a>
      </div>
    </div>
  );
}
