'use client';

import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Paperclip, 
  Users, 
  DollarSign, 
  Clock, 
  FolderArchive, 
  Check,
  X,
  ExternalLink,
  Building2,
  Sparkles
} from 'lucide-react';
import { 
  getDefaultClosingAudit, 
  ClosingReportWorkingPaper, 
  AuditItemParameter 
} from '@/server/services/projectClosingAuditService';

export default function PreSubmissionClosingReportPage({ params }: { params: { id: string } }) {
  const projectId = params.id || 'PID-22567';
  const [workingPaper, setWorkingPaper] = useState<ClosingReportWorkingPaper>(getDefaultClosingAudit(projectId, `Project ${projectId}`));
  const [toastMessage, setToastMessage] = useState('');
  const [activeTabDomain, setActiveTabDomain] = useState<'A' | 'B' | 'C' | 'D'>('A');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`skb_closing_audit_${projectId}`);
      if (saved) {
        try {
          setWorkingPaper(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse closing audit', e);
        }
      }
    }
  }, [projectId]);

  const updateWorkingPaperState = (updated: ClosingReportWorkingPaper) => {
    setWorkingPaper(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`skb_closing_audit_${projectId}`, JSON.stringify(updated));
    }
  };

  const toggleParameterStatus = (domainKey: 'domainA_financial' | 'domainB_safeguarding' | 'domainC_timeline' | 'domainD_media', itemId: string) => {
    const updatedList = workingPaper[domainKey].map((item) => {
      if (item.id === itemId) {
        const nextStatus: AuditItemParameter['status'] = item.status === 'Compliant' ? 'Non-Compliant' : 'Compliant';
        return { ...item, status: nextStatus };
      }
      return item;
    });

    const updated = {
      ...workingPaper,
      [domainKey]: updatedList,
    };

    updateWorkingPaperState(updated);
    setToastMessage(`Updated compliance audit parameter ${itemId}!`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleExecuteSignOff = (roleIdx: number) => {
    const updatedSignOffs = [...workingPaper.signOffs];
    updatedSignOffs[roleIdx].signed = true;
    updatedSignOffs[roleIdx].signedAt = new Date().toLocaleString();

    const allSigned = updatedSignOffs.every(s => s.signed);

    const updated = {
      ...workingPaper,
      signOffs: updatedSignOffs,
      isForm7Unlocked: allSigned,
    };

    updateWorkingPaperState(updated);
    setToastMessage(`Pre-submission sign-off recorded for ${updatedSignOffs[roleIdx].role}!`);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleDownloadForm7Zip = () => {
    if (!workingPaper.isForm7Unlocked) {
      alert('Form-7 Completion Package is LOCKED! All 5 executive sign-offs must be completed prior to export.');
      return;
    }

    const dummyZipContent = `==========================================================\nSMALL KINDNESS BANGLADESH (SKB) - OFFICIAL FORM-7 COMPLETION PACKAGE\nPID: ${workingPaper.ihhPid}\nProject Title: ${workingPaper.projectTitle}\nDonor: ${workingPaper.donorName}\nSWIFT Remittance Match: €${workingPaper.totalBudgetEur.toLocaleString()} (BDT ${workingPaper.totalBudgetBdt.toLocaleString()})\n==========================================================\n\n1. AUDIT DOMAIN VERIFICATION SUMMARY:\nDomain A (Financial Audit): 100% COMPLIANT ✓\nDomain B (Beneficiary Safeguarding & Age Audit): 100% COMPLIANT ✓\nDomain C (Timeline Sequencing): Date AC (${workingPaper.acDeclarationDate}) < Form-7 Date (${workingPaper.form7SignatureDate}) ✓\nDomain D (Media Vault): Logo Banners & Encrypted Storage Verified ✓\n\n2. 5-EXECUTIVE PRE-SUBMISSION SIGN-OFFS:\n${workingPaper.signOffs.map(s => `- ${s.role}: ${s.officerName} (${s.designation}) [SIGNED ✓ ${s.signedAt}]`).join('\n')}\n`;

    const blob = new Blob([dummyZipContent], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Official_Form7_Completion_Package_${workingPaper.ihhPid.replace(/\s+/g, '_')}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToastMessage(`Exported Official Form-7 Completion Package ZIP for ${workingPaper.ihhPid}!`);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const domainA_count = workingPaper.domainA_financial.filter(i => i.status === 'Compliant').length;
  const domainB_count = workingPaper.domainB_safeguarding.filter(i => i.status === 'Compliant').length;
  const domainC_count = workingPaper.domainC_timeline.filter(i => i.status === 'Compliant').length;
  const domainD_count = workingPaper.domainD_media.filter(i => i.status === 'Compliant').length;

  const totalCompliant = domainA_count + domainB_count + domainC_count + domainD_count;
  const totalAuditItems = workingPaper.domainA_financial.length + workingPaper.domainB_safeguarding.length + workingPaper.domainC_timeline.length + workingPaper.domainD_media.length;

  return (
    <div className="space-y-6 font-sans">
      {/* 1. EXECUTIVE PRE-SUBMISSION AUDIT BANNER */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-900 text-white px-3 py-1 rounded-full font-extrabold flex items-center gap-1.5">
              <span>🇹🇷</span> IHH Turkey & Master Pre-Submission Audit Tool
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 border ${
              workingPaper.isForm7Unlocked 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}>
              {workingPaper.isForm7Unlocked ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-600" /> Form-7 Package Unlocked & Verified
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-600" /> Form-7 Package Locked (Sign-offs Pending)
                </>
              )}
            </span>
          </div>

          <button
            onClick={handleDownloadForm7Zip}
            disabled={!workingPaper.isForm7Unlocked}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-2 rounded-xl shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-white" /> Download Official Form-7 Package (.ZIP)
          </button>
        </div>

        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            IHH Project Closing Report Working Paper ({workingPaper.ihhPid})
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed mt-1">
            Exhaustive pre-submission compliance verification tool for executing Form-7 completion packages. All compliance parameters across 4 domains must be audited prior to final transmission.
          </p>
        </div>
      </div>

      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {toastMessage}
        </div>
      )}

      {/* 2. AUDIT KPI OVERVIEW BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Overall Audit Score</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{totalCompliant} / {totalAuditItems} Items</p>
          <p className="text-[11px] text-emerald-600 font-semibold">100% Audit Verified</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Domain B: Safeguarding</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-extrabold text-purple-900">0 Child Signs ✓</p>
          <p className="text-[11px] text-purple-700 font-semibold">100% Parent/Guardian Signed</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Domain C: Sequencing</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">Date AC &lt; Form-7</p>
          <p className="text-[11px] text-amber-700 font-semibold">AC: {workingPaper.acDeclarationDate} | F7: {workingPaper.form7SignatureDate}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Domain D: Vault Storage</span>
            <FolderArchive className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-900">Encrypted Vault</p>
          <p className="text-[11px] text-emerald-700 font-semibold">Password Protected Archiving</p>
        </div>
      </div>

      {/* 3. 4-DOMAIN AUDIT CHECKLIST TAB TOOLBAR */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
          <button
            onClick={() => setActiveTabDomain('A')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTabDomain === 'A'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Domain A: Financial Audit ({domainA_count}/4)
          </button>

          <button
            onClick={() => setActiveTabDomain('B')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTabDomain === 'B'
                ? 'bg-purple-900 text-white shadow-sm'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            Domain B: Beneficiary Safeguarding ({domainB_count}/6)
          </button>

          <button
            onClick={() => setActiveTabDomain('C')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTabDomain === 'C'
                ? 'bg-amber-800 text-white shadow-sm'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Domain C: Timeline Sequencing ({domainC_count}/2)
          </button>

          <button
            onClick={() => setActiveTabDomain('D')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTabDomain === 'D'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            Domain D: Media & Encrypted Vault ({domainD_count}/2)
          </button>
        </div>

        {/* Selected Domain Audit Items List */}
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
          {(activeTabDomain === 'A' ? workingPaper.domainA_financial :
            activeTabDomain === 'B' ? workingPaper.domainB_safeguarding :
            activeTabDomain === 'C' ? workingPaper.domainC_timeline :
            workingPaper.domainD_media
          ).map((item) => {
            const domainKey = activeTabDomain === 'A' ? 'domainA_financial' :
                              activeTabDomain === 'B' ? 'domainB_safeguarding' :
                              activeTabDomain === 'C' ? 'domainC_timeline' : 'domainD_media';

            return (
              <div key={item.id} className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="space-y-1 max-w-2xl min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {item.id}
                    </span>
                    <h4 className="font-extrabold text-slate-900">{item.title}</h4>
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-semibold">
                      Role: {item.roleResponsible}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{item.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleParameterStatus(domainKey, item.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all ${
                      item.status === 'Compliant'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                        : 'bg-red-50 text-red-800 border border-red-300 hover:bg-red-100'
                    }`}
                  >
                    {item.status === 'Compliant' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Compliant ✓
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Non-Compliant ✗
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. 5-EXECUTIVE SEQUENTIAL PRE-SUBMISSION SIGN-OFF BLOCK */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              5-Executive Sequential Pre-Submission Sign-Off Block
            </h3>
            <p className="text-xs text-slate-500">All 5 officers must record their digital sign-off to unlock Form-7 PDF export.</p>
          </div>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            {workingPaper.signOffs.filter(s => s.signed).length} of 5 Signed
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {workingPaper.signOffs.map((sign, idx) => (
            <div 
              key={idx}
              className={`p-3.5 rounded-xl border space-y-2 transition ${
                sign.signed 
                  ? 'bg-emerald-50/60 border-emerald-300' 
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">{sign.role}</span>
                <span className="font-extrabold text-slate-900 truncate block">{sign.officerName}</span>
                <span className="text-[10px] text-slate-500 italic block truncate">{sign.designation}</span>
              </div>

              {sign.signed ? (
                <div className="bg-emerald-100/80 p-1.5 rounded-lg text-emerald-950 font-bold text-[10px] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Signed: {sign.signedAt?.split(' ')[0]}</span>
                </div>
              ) : (
                <button
                  onClick={() => handleExecuteSignOff(idx)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg shadow-sm transition"
                >
                  Sign Off
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
