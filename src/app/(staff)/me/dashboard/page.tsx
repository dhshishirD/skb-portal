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

const MOCK_DISTRICTS: DistrictMetric[] = [
  { district: "Cox's Bazar", division: 'Chattogram', activeProjects: 2, indicatorsAchievedPct: 85 },
  { district: 'Kurigram', division: 'Rangpur/Dhaka', activeProjects: 1, indicatorsAchievedPct: 70 },
  { district: 'Bandarban', division: 'Chattogram', activeProjects: 1, indicatorsAchievedPct: 62 },
];

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
          <p className="text-2xl font-bold text-slate-900">24 / 30</p>
          <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> 80% Overall Target Achieved
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs text-slate-500 font-medium">Districts Reached</p>
          <p className="text-2xl font-bold text-blue-600">4 Districts</p>
          <p className="text-[11px] text-slate-400">Cox&apos;s Bazar, Bandarban, Kurigram, Dhaka</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs text-slate-500 font-medium">Field Reports Validated</p>
          <p className="text-2xl font-bold text-purple-600">18 Reports</p>
          <p className="text-[11px] text-emerald-600 font-medium">100% M&E Quality Verified</p>
        </div>
      </div>

      {/* District Coverage Table / Map */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-red-500" /> District Coverage & Target Progress
        </h2>

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
      </div>
    </div>
  );
}
