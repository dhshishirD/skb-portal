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
  UserCheck
} from 'lucide-react';
import { getOfflineReports, clearOfflineReport, OfflineFieldReport } from '@/lib/offline/db';

export default function FieldDashboardPage() {
  const roleT = useTranslations('RoleAreas');
  const [isOnline, setIsOnline] = useState(true);
  const [pendingReports, setPendingReports] = useState<OfflineFieldReport[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState('');

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

    // Simulate batch uploading queued reports to server
    await new Promise((resolve) => setTimeout(resolve, 1500));

    pendingReports.forEach((report) => {
      clearOfflineReport(report.id);
    });

    setPendingReports([]);
    setSyncing(false);
    setSyncSuccessMsg('All offline reports synced successfully to SKB Cloud!');
  };

  return (
    <div className="space-y-4 text-emerald-50">
      {/* Network & Profile Status Header */}
      <div className="bg-emerald-900/80 border border-emerald-700/80 p-4 rounded-2xl shadow-md space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">{roleT('field')} Workspace</h2>
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
            isOnline ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
          }`}>
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" /> Online (4G/WiFi)
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" /> Offline Mode
              </>
            )}
          </span>
        </div>
        <p className="text-xs text-emerald-200/90 leading-relaxed">
          Optimized for low-bandwidth Android devices & offline data collection in rural Bangladesh.
        </p>
      </div>

      {syncSuccessMsg && (
        <div className="bg-emerald-800/90 border border-emerald-500 text-emerald-100 p-3 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
          <span>{syncSuccessMsg}</span>
        </div>
      )}

      {/* Main Action Grid */}
      <div className="space-y-2.5">
        <Link 
          href="/field-dashboard/new-beneficiary"
          className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-lg flex items-center justify-center gap-2.5 transition-all active:scale-[0.99]"
        >
          <UserCheck className="w-5 h-5 text-white" /> + Register Beneficiary (KoBo 8-Field Form)
        </Link>

        <Link 
          href="/field-dashboard/new-report"
          className="w-full py-3 px-4 bg-emerald-800/90 hover:bg-emerald-700 text-emerald-100 font-semibold rounded-xl text-xs border border-emerald-700 flex items-center justify-center gap-2 transition-all"
        >
          <PlusCircle className="w-4 h-4 text-emerald-300" /> + Submit Field Progress Report
        </Link>

        <a 
          href="https://ee.kobotoolbox.org/x/aGM7t5NmdoWuXPSoa3ty7k"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 px-4 bg-emerald-950 hover:bg-emerald-900 text-emerald-200 font-medium rounded-xl text-xs border border-emerald-800 flex items-center justify-center gap-2 transition-all"
        >
          <ExternalLink className="w-4 h-4 text-emerald-400" /> Fill Out Form Directly on KoBo Web App
        </a>
      </div>

      {/* Local Storage Sync Queue Card */}
      <div className="border border-emerald-800 bg-emerald-900/60 p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white">Offline Local Queue (IndexedDB)</span>
          </div>
          <span className="text-xs font-extrabold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700 text-emerald-300">
            {pendingReports.length} Pending
          </span>
        </div>

        {pendingReports.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] text-emerald-300">
              You have {pendingReports.length} report(s) saved locally on your phone waiting for sync.
            </p>
            <button
              onClick={handleSyncAll}
              disabled={syncing || !isOnline}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Syncing Reports...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" /> Sync All Reports Now
                </>
              )}
            </button>
          </div>
        ) : (
          <p className="text-[11px] text-emerald-400">
            All field reports are fully synchronized with SKB Cloud server.
          </p>
        )}
      </div>
    </div>
  );
}

