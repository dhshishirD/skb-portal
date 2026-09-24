'use client';

import { useState } from 'react';
import { FileText, Sparkles, Send, Download, CheckCircle2 } from 'lucide-react';
import { compileDonorReportPayload } from '@/server/services/reportGenerator';
import Link from 'next/link';

export default function ReportGeneratorPage() {
  const [grantCode, setGrantCode] = useState('G1-USAID');
  const [period, setPeriod] = useState('2026-Q3');
  const [format, setFormat] = useState<'pdf' | 'word' | 'excel'>('pdf');
  const [compiledReport, setCompiledReport] = useState<any>(null);
  const [published, setPublished] = useState(false);
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const result = compileDonorReportPayload({
      grantCode,
      grantTitle: 'Coastal Climate Resilience Grant',
      donorName: 'USAID Bangladesh',
      period,
      totalGrantAmount: 500000,
      spentAmount: 150000,
      indicators: [
        { name: 'Mangrove Saplings Planted', target: 10000, achieved: 8500, unit: 'saplings' },
        { name: 'Embankment Repair Length', target: 15, achieved: 12, unit: 'km' },
      ],
      format,
    });
    setCompiledReport(result);
    setPublished(false);
  };

  const handleGenerateAiNarrative = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/ai/draft-narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectCode: 'PROJ-CLIMATE-01',
          projectTitle: 'Coastal Climate Resilience Grant',
          donorName: 'USAID Bangladesh',
          reportingPeriod: period,
          totalBudgetBDT: 50000000,
          spentBudgetBDT: 15000000,
          indicators: [
            { title: 'Mangrove Saplings Planted', target: 10000, achieved: 8500, unit: 'saplings' },
            { title: 'Embankment Repair Length', target: 15, achieved: 12, unit: 'km' },
          ],
          fieldReportHighlights: ['Completed mangrove restoration in Satkhira upazila'],
          challengesEncountered: ['High tidal activity temporarily delayed embankment repair'],
        }),
      });
      const data = await res.json();
      if (data.fullMarkdown) {
        setAiNarrative(data.fullMarkdown);
      }
    } catch {
      setAiNarrative('## Executive Summary\nDuring this reporting period, Coastal Climate Resilience Grant achieved key milestones despite monsoon delays.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:underline">Staff</Link> &rsaquo;
            <span className="font-semibold text-slate-800">Report Generator</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Automated Donor Report Generator & AI Assistant
          </h1>
          <p className="text-xs text-slate-500">
            Compile validated indicator and financial data into donor template formats and generate AI narrative reports.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900">1. Select Report Configuration</h2>

          <form onSubmit={handleGenerate} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Grant</label>
              <select
                value={grantCode}
                onChange={(e) => setGrantCode(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              >
                <option value="G1-USAID">G1-USAID (Coastal Climate Resilience Grant)</option>
                <option value="G2-EUDEV">G2-EUDEV (Primary Healthcare & Sanitation)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reporting Period</label>
              <input
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Export Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              >
                <option value="pdf">PDF Document (.pdf)</option>
                <option value="word">Microsoft Word (.docx)</option>
                <option value="excel">Microsoft Excel (.xlsx)</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" /> Compile Payload
              </button>
              <button
                type="button"
                onClick={handleGenerateAiNarrative}
                disabled={isGeneratingAi}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> {isGeneratingAi ? 'Drafting...' : 'AI Narrative Draft'}
              </button>
            </div>
          </form>

          {aiNarrative && (
            <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
              <h3 className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" /> AI Generated Donor Narrative
              </h3>
              <pre className="text-[11px] font-mono whitespace-pre-wrap text-slate-700 bg-white p-3 rounded-lg border border-purple-100 max-h-48 overflow-y-auto">
                {aiNarrative}
              </pre>
            </div>
          )}
        </div>

        {/* Compiled Preview */}
        {compiledReport && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">2. Review Compiled Report</h2>
              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-bold uppercase">
                {compiledReport.format}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-xs">
              <p className="font-bold text-slate-900">{compiledReport.grantTitle} ({compiledReport.grantCode})</p>
              <p className="text-slate-600">Donor: {compiledReport.donorName} • Period: {compiledReport.period}</p>
              <p className="text-emerald-700 font-mono font-bold">Burn Rate: {compiledReport.burnRatePercent}% ($150,000 / $500,000)</p>

              <div className="pt-2 border-t border-slate-200 space-y-1">
                <p className="font-bold text-slate-800 text-[11px]">Validated Indicators Summary:</p>
                {compiledReport.indicatorsSummary.map((ind: any) => (
                  <div key={ind.name} className="flex justify-between text-[11px] text-slate-600">
                    <span>{ind.name}</span>
                    <span className="font-mono font-bold">{ind.achieved} / {ind.target} {ind.unit}</span>
                  </div>
                ))}
              </div>
            </div>

            {published ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Report Published to Donor Portal!
              </div>
            ) : (
              <button
                onClick={() => setPublished(true)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> Approve & Publish to Donor Portal
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
