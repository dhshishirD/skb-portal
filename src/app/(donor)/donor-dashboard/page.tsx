'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Lock, 
  FileText, 
  Download, 
  ShieldCheck, 
  CheckCircle2, 
  Building2, 
  Globe2, 
  BarChart3, 
  DollarSign, 
  Users, 
  Layers, 
  ExternalLink,
  Share2,
  Check,
  Eye
} from 'lucide-react';
import { formatCurrencyString, convertCurrency, SupportedCurrency } from '@/server/services/multiCurrency';

interface DonorPartner {
  id: string;
  name: string;
  code: string;
  logo: string;
  grantCode: string;
  grantTitle: string;
  currency: SupportedCurrency;
  totalGrantAmount: number;
  spentAmount: number;
  beneficiaryTarget: number;
  beneficiaryReached: number;
  location: string;
  status: string;
  logframeIndicators: Array<{
    name: string;
    target: number;
    achieved: number;
    unit: string;
  }>;
  reports: Array<{
    id: string;
    title: string;
    period: string;
    publishedAt: string;
    format: 'PDF' | 'Word' | 'Excel';
    fileSize: string;
  }>;
}

const DONOR_PARTNERS: DonorPartner[] = [
  {
    id: 'unhcr',
    name: 'UNHCR — UN Refugee Agency',
    code: 'UNHCR-BD-2026',
    logo: '🇺🇳',
    grantCode: 'GRANT-2026-UNHCR-WASH',
    grantTitle: 'Rohingya Refugee Camp Clean Water & WASH Infrastructure Phase IV',
    currency: 'USD',
    totalGrantAmount: 500000,
    spentAmount: 380000,
    beneficiaryTarget: 25000,
    beneficiaryReached: 22400,
    location: 'Teknaf & Ukhiya Camps, Cox’s Bazar',
    status: 'Active (76% Burn Rate)',
    logframeIndicators: [
      { name: 'Deep Tube Wells Installed', target: 45, achieved: 45, unit: 'Wells' },
      { name: 'Solar Water Purifiers Active', target: 12, achieved: 10, unit: 'Units' },
      { name: 'Hygiene Kits Distributed', target: 5000, achieved: 4650, unit: 'Kits' },
    ],
    reports: [
      { id: 'R1', title: '2026 Q2 Comprehensive WASH Audit & Beneficiary Photo Album', period: '2026 Q2 (Apr - Jun)', publishedAt: '2026-07-15', format: 'PDF', fileSize: '4.8 MB' },
      { id: 'R2', title: '2026 Q1 Logframe Performance & Water Quality Inspection', period: '2026 Q1 (Jan - Mar)', publishedAt: '2026-04-10', format: 'PDF', fileSize: '3.2 MB' },
    ],
  },
  {
    id: 'eu',
    name: 'European Union (EU Humanitarian Aid)',
    code: 'EU-ECHO-2026',
    logo: '🇪🇺',
    grantCode: 'GRANT-2026-EU-HEALTH',
    grantTitle: 'Primary Healthcare & Emergency Maternal Clinics Initiative',
    currency: 'EUR',
    totalGrantAmount: 350000,
    spentAmount: 210000,
    beneficiaryTarget: 15000,
    beneficiaryReached: 12800,
    location: 'Kurigram & Sunamganj Haor Areas',
    status: 'Active (60% Burn Rate)',
    logframeIndicators: [
      { name: 'Mobile Clinic Consultations', target: 12000, achieved: 10500, unit: 'Patients' },
      { name: 'Essential Medicines Kits Handed Over', target: 800, achieved: 720, unit: 'Kits' },
      { name: 'Community Healthcare Training Sessions', target: 30, achieved: 28, unit: 'Sessions' },
    ],
    reports: [
      { id: 'R3', title: 'EU ECHO Mid-Term Healthcare Audit & Financial Reconciliation', period: '2026 Q2 (Apr - Jun)', publishedAt: '2026-07-20', format: 'PDF', fileSize: '5.1 MB' },
    ],
  },
  {
    id: 'ihh',
    name: 'IHH Humanitarian Relief Foundation (Turkey)',
    code: 'IHH-TR-2026',
    logo: '🇹🇷',
    grantCode: 'GRANT-2026-IHH-ORPHAN',
    grantTitle: 'Orphan Sponsorship, Winter Food Baskets & Education Support',
    currency: 'TRY',
    totalGrantAmount: 3500000,
    spentAmount: 2800000,
    beneficiaryTarget: 8000,
    beneficiaryReached: 7900,
    location: 'Sylhet & North Bengal Districts',
    status: 'Active (80% Burn Rate)',
    logframeIndicators: [
      { name: 'Orphans Enrolled for Monthly Stipend', target: 1200, achieved: 1200, unit: 'Children' },
      { name: 'Winter Warm Clothing & Blanket Packages', target: 4000, achieved: 3950, unit: 'Packages' },
    ],
    reports: [
      { id: 'R4', title: 'IHH Annual Orphan Distribution & Verification Log', period: '2026 Q2 (Apr - Jun)', publishedAt: '2026-08-01', format: 'PDF', fileSize: '3.9 MB' },
    ],
  },
];

export default function DonorDashboardPage() {
  const roleT = useTranslations('RoleAreas');
  const [selectedPartner, setSelectedPartner] = useState<DonorPartner>(DONOR_PARTNERS[0]);
  const [copiedLink, setCopiedLink] = useState(false);

  const amountBDT = convertCurrency(selectedPartner.totalGrantAmount, selectedPartner.currency, 'BDT');
  const spentBDT = convertCurrency(selectedPartner.spentAmount, selectedPartner.currency, 'BDT');
  const remainingBDT = amountBDT - spentBDT;
  const burnRatePercent = Math.round((selectedPartner.spentAmount / selectedPartner.totalGrantAmount) * 100);

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}/donor-dashboard?partner=${selectedPartner.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Banner & Partner Switcher */}
      <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-600" /> Interactive Donor Connectivity Hub
            </span>
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Isolated Read-Only Access
            </span>
          </div>

          <button
            onClick={handleCopyShareLink}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100/80 hover:bg-amber-200 px-3 py-1.5 rounded-xl border border-amber-300 transition-all"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            {copiedLink ? 'Portal Link Copied!' : 'Share Donor Portal Link'}
          </button>
        </div>

        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
            Select Active International Donor Organization:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DONOR_PARTNERS.map((partner) => {
              const isSelected = selectedPartner.id === partner.id;
              return (
                <button
                  key={partner.id}
                  onClick={() => setSelectedPartner(partner)}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                    isSelected
                      ? 'bg-amber-900 text-white border-amber-900 shadow-md ring-2 ring-amber-500/30'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <span className="text-2xl">{partner.logo}</span>
                  <div>
                    <p className="text-xs font-bold leading-tight">{partner.name}</p>
                    <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-amber-200' : 'text-slate-500'}`}>
                      {partner.code}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Donor Active Grant Overview */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
              {selectedPartner.grantCode}
            </span>
            <h2 className="text-lg font-extrabold text-slate-900 mt-2">{selectedPartner.grantTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Location: 📍 {selectedPartner.location}</p>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold border border-emerald-200">
            {selectedPartner.status}
          </span>
        </div>

        {/* Multi-Currency & Financial Breakdown Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase">Total Grant Allocation</p>
            <p className="text-xl font-extrabold text-slate-900">
              {formatCurrencyString(selectedPartner.totalGrantAmount, selectedPartner.currency)}
            </p>
            <p className="text-xs text-emerald-700 font-semibold mt-1">
              Equivalent: {formatCurrencyString(amountBDT, 'BDT')}
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase">Disbursed & Expended</p>
            <p className="text-xl font-extrabold text-emerald-600">
              {formatCurrencyString(selectedPartner.spentAmount, selectedPartner.currency)}
            </p>
            <p className="text-xs text-slate-600 font-medium mt-1">
              Equivalent: {formatCurrencyString(spentBDT, 'BDT')}
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase">Available Grant Balance</p>
            <p className="text-xl font-extrabold text-blue-600">
              {formatCurrencyString(selectedPartner.totalGrantAmount - selectedPartner.spentAmount, selectedPartner.currency)}
            </p>
            <p className="text-xs text-slate-600 font-medium mt-1">
              Equivalent: {formatCurrencyString(remainingBDT, 'BDT')}
            </p>
          </div>
        </div>

        {/* Burn Rate Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-700">Financial Utilization (Burn Rate)</span>
            <span className="text-blue-600">{burnRatePercent}% Spent</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 rounded-full"
              style={{ width: `${burnRatePercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Interactive M&E Logframe Indicators */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-600" /> Verified Logframe Target Achievements
        </h3>

        <div className="space-y-4">
          {selectedPartner.logframeIndicators.map((ind, idx) => {
            const percent = Math.round((ind.achieved / ind.target) * 100);
            return (
              <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-900">{ind.name}</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {ind.achieved} / {ind.target} {ind.unit} ({percent}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Published Reports & Verification Documents */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" /> Audit-Ready Published Grant Reports
        </h3>

        <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
          {selectedPartner.reports.map((report) => (
            <div key={report.id} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600">{report.id}</span>
                  <span className="text-xs font-bold text-slate-900">{report.period}</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                    Published {report.publishedAt}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-1">{report.title}</p>
              </div>

              <button className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all active:scale-[0.98]">
                <Download className="w-3.5 h-3.5" /> Download {report.format} ({report.fileSize})
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
