'use client';

import { useState } from 'react';
import { Wifi, WifiOff, MapPin, Camera, Save, Send, CheckCircle2, Navigation } from 'lucide-react';
import { saveOfflineReport } from '@/lib/offline/db';
import Link from 'next/link';

export default function NewFieldReportPage() {
  const [projectId, setProjectId] = useState('30000000-0000-0000-0000-000000000001');
  const [period, setPeriod] = useState('2026-09');
  const [summary, setSummary] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(21.4272);
  const [longitude, setLongitude] = useState<number | undefined>(92.0058);
  const [locating, setLocating] = useState(false);
  const [msg, setMsg] = useState('');

  const handleFetchLocation = () => {
    if ('geolocation' in navigator) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(Number(pos.coords.latitude.toFixed(4)));
          setLongitude(Number(pos.coords.longitude.toFixed(4)));
          setLocating(false);
        },
        () => {
          setLocating(false);
        }
      );
    }
  };

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
    setMsg('Field report saved locally to offline queue!');
  };

  return (
    <div className="space-y-4 text-slate-100">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-emerald-200">New Field Progress Report</h1>
        <span className="text-[10px] bg-emerald-800 border border-emerald-600 px-2 py-0.5 rounded flex items-center gap-1">
          <WifiOff className="w-3 h-3 text-amber-400" /> Offline Mode Enabled
        </span>
      </div>

      {msg && (
        <div className="bg-emerald-800/90 border border-emerald-500 p-3 rounded-xl text-xs text-emerald-100 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      <form onSubmit={handleSaveOffline} className="space-y-3 bg-emerald-900/60 p-4 rounded-xl border border-emerald-800">
        <div>
          <label className="block text-xs font-semibold text-emerald-200 mb-1">Select SKB Project</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full bg-emerald-950 border border-emerald-700 text-white text-xs rounded-lg p-2.5"
          >
            <option value="30000000-0000-0000-0000-000000000001">SKB-2026-WASH-001 • Rohingya Refugee Camp Water (Teknaf)</option>
            <option value="30000000-0000-0000-0000-000000000002">SKB-2026-HEALTH-002 • Primary Community Clinics (Ukhiya)</option>
            <option value="30000000-0000-0000-0000-000000000003">SKB-2026-EDU-003 • Primary School WASH Infrastructure (Kurigram)</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-emerald-200">GPS Coordinates</label>
            <button
              type="button"
              onClick={handleFetchLocation}
              className="text-[10px] bg-emerald-800 hover:bg-emerald-700 text-emerald-200 px-2 py-0.5 rounded flex items-center gap-1 transition"
            >
              <Navigation className="w-3 h-3 text-emerald-400" /> {locating ? 'Locating...' : 'Auto-Locate GPS'}
            </button>
          </div>
          <div className="flex items-center gap-2 bg-emerald-950 p-2.5 rounded-lg text-xs font-mono text-emerald-300 border border-emerald-700">
            <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Lat: {latitude}, Long: {longitude}</span>
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
