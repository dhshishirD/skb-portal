'use client';

import { useState } from 'react';
import { Wifi, WifiOff, MapPin, Camera, Save, Send } from 'lucide-react';
import { saveOfflineReport } from '@/lib/offline/db';
import Link from 'next/link';

export default function NewFieldReportPage() {
  const [projectId, setProjectId] = useState('30000000-0000-0000-0000-000000000001');
  const [period, setPeriod] = useState('2026-09');
  const [summary, setSummary] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(21.4272);
  const [longitude, setLongitude] = useState<number | undefined>(92.0058);
  const [msg, setMsg] = useState('');

  const handleSaveOffline = (e: React.FormEvent) => {
    e.preventDefault();
    const id = crypto.randomUUID();
    saveOfflineReport({
      id,
      projectId,
      period,
      gpsLatitude: latitude,
      gpsLongitude: longitude,
      payload: { summary },
      createdAt: new Date().toISOString(),
    });
    setMsg('Report saved locally to offline queue!');
  };

  return (
    <div className="space-y-4 text-slate-100">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-emerald-200">New Field Report (PWA)</h1>
        <span className="text-[10px] bg-emerald-800 px-2 py-0.5 rounded flex items-center gap-1">
          <WifiOff className="w-3 h-3 text-amber-400" /> Offline Mode
        </span>
      </div>

      {msg && (
        <div className="bg-emerald-800 border border-emerald-600 p-3 rounded-xl text-xs text-emerald-100">
          {msg}
        </div>
      )}

      <form onSubmit={handleSaveOffline} className="space-y-3 bg-emerald-900/60 p-4 rounded-xl border border-emerald-800">
        <div>
          <label className="block text-xs font-semibold text-emerald-200 mb-1">Select Project</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full bg-emerald-950 border border-emerald-700 text-white text-xs rounded-lg p-2.5"
          >
            <option value="30000000-0000-0000-0000-000000000001">P1 - Coastal Embankment Protection (Teknaf)</option>
            <option value="30000000-0000-0000-0000-000000000002">P2 - Community Health Clinics (Ukhiya)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-emerald-200 mb-1">GPS Coordinates (Auto-Captured)</label>
          <div className="flex items-center gap-2 bg-emerald-950 p-2 rounded-lg text-xs font-mono text-emerald-300 border border-emerald-700">
            <MapPin className="w-4 h-4 text-emerald-400" />
            Lat: {latitude}, Long: {longitude}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-emerald-200 mb-1">Report Summary & Observations</label>
          <textarea
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Describe field activity, community turnout, and challenges..."
            className="w-full bg-emerald-950 border border-emerald-700 text-white text-xs rounded-lg p-2.5"
            required
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow"
          >
            <Save className="w-4 h-4" /> Save Offline Draft
          </button>
        </div>
      </form>

      <div className="text-center pt-2">
        <Link href="/field-dashboard" className="text-xs text-emerald-400 hover:underline">
          &larr; Return to Field Dashboard
        </Link>
      </div>
    </div>
  );
}
