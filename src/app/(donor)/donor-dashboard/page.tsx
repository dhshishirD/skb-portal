'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Lock, FileText, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface PublishedDonorReport {
  id: string;
  grantCode: string;
  grantTitle: string;
  period: string;
  publishedAt: string;
  format: 'PDF' | 'Word' | 'Excel';
  fileSize: string;
}

const MOCK_PUBLISHED_REPORTS: PublishedDonorReport[] = [
  {
    id: 'REP-2026-Q2-USAID',
    grantCode: 'G1-USAID',
    grantTitle: 'Coastal Climate Resilience Grant',
    period: '2026 Q2 (Apr - Jun)',
    publishedAt: '2026-07-10',
    format: 'PDF',
    fileSize: '3.2 MB',
  },
  {
    id: 'REP-2026-Q1-USAID',
    grantCode: 'G1-USAID',
    grantTitle: 'Coastal Climate Resilience Grant',
    period: '2026 Q1 (Jan - Mar)',
    publishedAt: '2026-04-12',
    format: 'PDF',
    fileSize: '2.8 MB',
  },
];

export default function DonorDashboardPage() {
  const roleT = useTranslations('RoleAreas');
  const [reports] = useState<PublishedDonorReport[]>(MOCK_PUBLISHED_REPORTS);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
            <Lock className="w-3 h-3 text-amber-600" /> Read-Only Donor Access
          </span>
          <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" /> RLS Isolated Scope
          </span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">USAID Bangladesh Partner Portal</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Welcome to your organization&apos;s read-only grant portal. You are viewing verified and published reporting documents for **Grant G1-USAID**.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" /> Published Grant Performance Reports
        </h3>

        <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
          {reports.map((report) => (
            <div key={report.id} className="p-4 hover:bg-slate-50/50 transition-colors flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600">{report.grantCode}</span>
                  <span className="text-xs font-bold text-slate-900">{report.period}</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                    Published {report.publishedAt}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{report.grantTitle}</p>
              </div>

              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-sm transition-colors">
                <Download className="w-3.5 h-3.5" /> Download {report.format} ({report.fileSize})
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
