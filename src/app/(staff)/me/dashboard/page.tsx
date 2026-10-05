'use client';

import { useState } from 'react';
import { BarChart2, MapPin, Target, CheckCircle2, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface DistrictMetric {
  district: string;
  division: string;
  activeProjects: number;
  indicatorsAchievedPct: number;
}

const MOCK_DISTRICTS: DistrictMetric[] = [];

export default function MeDashboardPage() {
  const [districts] = useState<DistrictMetric[]>(MOCK_DISTRICTS);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:underline">Staff</Link> &rsaquo;
            <span className="font-semibold text-slate-800">M&E Dashboards</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-600" />
            M&E Analytics & Bangladesh District Map
          </h1>
          <p className="text-xs text-slate-500">
            Validated indicator progress trends and district coverage maps across Bangladesh.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs text-slate-500 font-medium">Total Validated Indicators</p>
          <p className="text-2xl font-bold text-slate-900">0 / 0</p>
          <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Awaiting live project verification
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs text-slate-500 font-medium">Districts Reached</p>
          <p className="text-2xl font-bold text-blue-600">{districts.length} Districts</p>
          <p className="text-[11px] text-slate-400">Live operational coverage</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs text-slate-500 font-medium">Field Reports Validated</p>
          <p className="text-2xl font-bold text-purple-600">0 Reports</p>
          <p className="text-[11px] text-slate-400 font-medium">M&E Quality Verification Ready</p>
        </div>
      </div>

      {/* District Coverage Table / Map */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-red-500" /> District Coverage & Target Progress
        </h2>

        {districts.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {districts.map((d) => (
              <div key={d.district} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900">{d.district} District</p>
                  <p className="text-[11px] text-slate-400">{d.division} Division • {d.activeProjects} Active Project(s)</p>
                </div>

                <div className="w-48 space-y-1 text-right">
                  <span className="text-xs font-bold text-slate-800">{d.indicatorsAchievedPct}% Achieved</span>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${d.indicatorsAchievedPct}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500 space-y-2">
            <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">No District Coverage Data</p>
            <p className="text-[11px] text-slate-400">
              District indicator logs will display here as field reports are submitted and validated.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
