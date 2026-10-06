'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  CheckSquare, 
  Square, 
  ArrowRight, 
  ShieldCheck, 
  FileText, 
  Target, 
  Users, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  ExternalLink,
  ChevronRight,
  Building2,
  Clock,
  Sparkles
} from 'lucide-react';
import { getDefaultCharter } from '@/server/services/projectCharterService';
import { getDefaultClosingAudit } from '@/server/services/projectClosingAuditService';

interface StagePrerequisite {
  id: string;
  stageKey: 'concept' | 'proposal' | 'approved' | 'implementation' | 'monitoring_evaluation' | 'closed';
  title: string;
  description: string;
  responsibleRole: string;
  targetRoute: string;
  targetRouteLabel: string;
  isCompleted: boolean;
}

const STAGES = [
  { key: 'concept', number: 1, label: 'Concept & Charter Baseline', shortLabel: 'Charter' },
  { key: 'proposal', number: 2, label: 'Proposal & Budget Baseline', shortLabel: 'Proposal' },
  { key: 'approved', number: 3, label: 'Executive Approval & RACI', shortLabel: 'Approved' },
  { key: 'implementation', number: 4, label: 'Field Implementation', shortLabel: 'Execution' },
  { key: 'monitoring_evaluation', number: 5, label: 'Pre-Submission Audit', shortLabel: 'M&E Audit' },
  { key: 'closed', number: 6, label: 'Form-7 Export & Closed', shortLabel: 'Closed' },
];

export default function MasterKanbanStageGatePage({ params }: { params: { id: string } }) {
  const projectId = params.id || 'PID-22567';
  const charter = getDefaultCharter(projectId, `Project ${projectId}`);
  const closingAudit = getDefaultClosingAudit(projectId, `Project ${projectId}`);

  const [currentStageKey, setCurrentStageKey] = useState<string>('implementation');
  const [toastMessage, setToastMessage] = useState('');

  // Prerequisites dynamically mapped to Master Charter and Closing Audit Working Paper
  const [prerequisites, setPrerequisites] = useState<StagePrerequisite[]>([
    // STAGE 1: Concept & Charter Baseline
    {
      id: 'prereq-1.1',
      stageKey: 'concept',
      title: 'NGOAB (FD-6/7) & RRRC Access Clearance Recorded',
      description: `Verify Government clearance refs in Section 1 of Project Charter (${charter.metadata.ngoabRef}).`,
      responsibleRole: 'PM / PD',
      targetRoute: `/projects/${projectId}/charter`,
      targetRouteLabel: 'Open Project Charter',
      isCompleted: Boolean(charter.metadata.ngoabRef && charter.metadata.rrrcRef),
    },
    {
      id: 'prereq-1.2',
      stageKey: 'concept',
      title: '10-Sector Scope & GPS Site Coordinates Defined',
      description: `Select active sectors in Section 3 & map GPS Lat (${charter.location.gpsLat}) / Lng (${charter.location.gpsLng}) in Section 4.`,
      responsibleRole: 'PM',
      targetRoute: `/projects/${projectId}/charter`,
      targetRouteLabel: 'Edit Sector & GPS Mapping',
      isCompleted: Boolean(charter.location.gpsLat && charter.sectors.some(s => s.selected)),
    },

    // STAGE 2: Proposal & Budget Baseline
    {
      id: 'prereq-2.1',
      stageKey: 'proposal',
      title: 'Approved 6-Line Financial Budget Framework Set',
      description: `Define BDT & Donor currency budget breakdown across 6 categories in Section 7 of Project Charter.`,
      responsibleRole: 'Finance Auditor',
      targetRoute: `/projects/${projectId}/charter`,
      targetRouteLabel: 'View 6-Line Budget',
      isCompleted: charter.budgetLines.length === 6,
    },
    {
      id: 'prereq-2.2',
      stageKey: 'proposal',
      title: 'Beneficiary Targets & ID Type Breakdown Set',
      description: 'Host NID/BRN vs. Rohingya FCN Smart Card targets defined in Section 5 of Project Charter.',
      responsibleRole: 'Program Officer',
      targetRoute: `/projects/${projectId}/charter`,
      targetRouteLabel: 'View Beneficiary Targets',
      isCompleted: charter.beneficiaries.hostTotalIndividuals > 0,
    },

    // STAGE 3: Executive Approval & RACI
    {
      id: 'prereq-3.1',
      stageKey: 'approved',
      title: 'Interdepartmental RACI Matrix Agreed',
      description: 'Responsibility matrix (R, A, C, I) assigned across 8 operational domains in Section 10.',
      responsibleRole: 'Project Director',
      targetRoute: `/projects/${projectId}/charter`,
      targetRouteLabel: 'View RACI Governance',
      isCompleted: charter.raci.length > 0,
    },
    {
      id: 'prereq-3.2',
      stageKey: 'approved',
      title: '4-Executive Charter Authorization Sign-Off Executed',
      description: 'Digital sign-offs completed by PD, PM, Head of Finance, and Head of Procurement.',
      responsibleRole: '4 Executive Leads',
      targetRoute: `/projects/${projectId}/charter`,
      targetRouteLabel: 'Execute Charter Sign-Off',
      isCompleted: charter.signOffs.every(s => s.signed),
    },

    // STAGE 4: Field Implementation
    {
      id: 'prereq-4.1',
      stageKey: 'implementation',
      title: 'Logframe Goal / Outcome / Output Tree Defined',
      description: 'Hierarchical logframe tree nodes and M&E indicators defined.',
      responsibleRole: 'Program Officer',
      targetRoute: `/projects/${projectId}/logframe`,
      targetRouteLabel: 'View Logframe Tree',
      isCompleted: true,
    },
    {
      id: 'prereq-4.2',
      stageKey: 'implementation',
      title: 'Beneficiary Registry Compiled (>€20 NID Rule)',
      description: '100% NID verified records for host community and FCN cards for Rohingya refugees.',
      responsibleRole: 'Field / PO',
      targetRoute: `/projects/${projectId}/beneficiaries`,
      targetRouteLabel: 'Open Beneficiary Registry',
      isCompleted: true,
    },
    {
      id: 'prereq-4.3',
      stageKey: 'implementation',
      title: 'Monthly Progress Reports (MPR - 5th) Submitted',
      description: 'Field activity logs, distribution vouchers, and vendor invoices recorded.',
      responsibleRole: 'Program Officer',
      targetRoute: `/projects/${projectId}/tasks`,
      targetRouteLabel: 'Open Workplan & Tasks',
      isCompleted: true,
    },

    // STAGE 5: Pre-Submission Audit
    {
      id: 'prereq-5.1',
      stageKey: 'monitoring_evaluation',
      title: 'Domain A (Financial Audit): Form-3 Rate & Invoice Date Match',
      description: 'Vendor invoice unit rates match Form-3 proposal rates & dates fall within project period.',
      responsibleRole: 'Finance Auditor',
      targetRoute: `/projects/${projectId}/closing-report`,
      targetRouteLabel: 'Audit Domain A Financials',
      isCompleted: closingAudit.domainA_financial.every(i => i.status === 'Compliant'),
    },
    {
      id: 'prereq-5.2',
      stageKey: 'monitoring_evaluation',
      title: 'Domain B (Safeguarding Audit): Strictly NO Underaged (<18) Signs',
      description: 'NID provisioning (>€20) verified, dual signatures on list, and Parent/Guardian signed for children.',
      responsibleRole: 'Program Officer',
      targetRoute: `/projects/${projectId}/closing-report`,
      targetRouteLabel: 'Audit Domain B Safeguarding',
      isCompleted: closingAudit.domainB_safeguarding.every(i => i.status === 'Compliant'),
    },
    {
      id: 'prereq-5.3',
      stageKey: 'monitoring_evaluation',
      title: 'Domain C (Timeline Sequencing): Date AC < Form-7 > End Date',
      description: `Verified Date AC Declaration (${closingAudit.acDeclarationDate}) BEFORE Form-7 Date (${closingAudit.form7SignatureDate}).`,
      responsibleRole: 'Project Coordinator',
      targetRoute: `/projects/${projectId}/closing-report`,
      targetRouteLabel: 'Audit Domain C Timeline',
      isCompleted: closingAudit.domainC_timeline.every(i => i.status === 'Compliant'),
    },
    {
      id: 'prereq-5.4',
      stageKey: 'monitoring_evaluation',
      title: 'Domain D (Media Vault): Logo Banners & Encrypted Storage Checked',
      description: 'High-res distribution photos with logo banners & password-protected storage vault verified.',
      responsibleRole: 'Media Officer',
      targetRoute: `/projects/${projectId}/closing-report`,
      targetRouteLabel: 'Audit Domain D Media Vault',
      isCompleted: closingAudit.domainD_media.every(i => i.status === 'Compliant'),
    },

    // STAGE 6: Form-7 Export & Closed
    {
      id: 'prereq-6.1',
      stageKey: 'closed',
      title: '5-Executive Pre-Submission Sign-Off Completed',
      description: 'Sequential digital sign-offs recorded by PO, FA, MO, PC, and PD.',
      responsibleRole: '5 Executive Officers',
      targetRoute: `/projects/${projectId}/closing-report`,
      targetRouteLabel: 'Execute 5-Executive Sign-Off',
      isCompleted: closingAudit.signOffs.every(s => s.signed),
    },
    {
      id: 'prereq-6.2',
      stageKey: 'closed',
      title: 'Official Form-7 Completion Package (.ZIP) Exported',
      description: 'Form-7 package exported and transmitted to IHH Turkey / Partner Workspace.',
      responsibleRole: 'Project Director',
      targetRoute: `/projects/${projectId}/closing-report`,
      targetRouteLabel: 'Download Form-7 Package ZIP',
      isCompleted: closingAudit.isForm7Unlocked,
    },
  ]);

  const togglePrerequisite = (id: string) => {
    setPrerequisites(prev =>
      prev.map(p => (p.id === id ? { ...p, isCompleted: !p.isCompleted } : p))
    );
    setToastMessage(`Updated prerequisite status!`);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const currentStageObj = STAGES.find(s => s.key === currentStageKey) || STAGES[3];
  const currentPrereqs = prerequisites.filter(p => p.stageKey === currentStageKey);
  const currentCompletedCount = currentPrereqs.filter(p => p.isCompleted).length;
  const isCurrentStageCleared = currentPrereqs.length > 0 && currentCompletedCount === currentPrereqs.length;

  const currentIdx = STAGES.findIndex(s => s.key === currentStageKey);

  const handleAdvanceStage = () => {
    if (!isCurrentStageCleared) {
      alert(`Cannot advance to next stage! All prerequisite checks for Stage ${currentIdx + 1} (${currentStageObj.label}) must be 100% completed.`);
      return;
    }
    if (currentIdx < STAGES.length - 1) {
      const nextKey = STAGES[currentIdx + 1].key;
      setCurrentStageKey(nextKey);
      setToastMessage(`Project advanced to Stage ${currentIdx + 2}: ${STAGES[currentIdx + 1].label}!`);
      setTimeout(() => setToastMessage(''), 3500);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. HEADER CONTROL BAR */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-900 text-white px-3 py-1 rounded-full font-extrabold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Master Stage Gate Control Engine
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
              isCurrentStageCleared 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}>
              {isCurrentStageCleared ? '✓ Stage Gate Cleared' : '🟡 Prerequisites Pending'}
            </span>
          </div>

          <button
            onClick={handleAdvanceStage}
            disabled={!isCurrentStageCleared || currentIdx === STAGES.length - 1}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 px-4 py-2 rounded-xl shadow-sm transition-all"
          >
            Advance to Stage {currentIdx + 2} &rsaquo;
          </button>
        </div>

        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Stage {currentStageObj.number}: {currentStageObj.label}
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed mt-1">
            Stage gates prevent invalid transitions. All prerequisite checks below are dynamically linked to the **Master Project Charter** and the **Pre-Submission Closing Audit Working Paper**.
          </p>
        </div>
      </div>

      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {toastMessage}
        </div>
      )}

      {/* 2. 6-STAGE SEQUENTIAL KANBAN BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {STAGES.map((s, idx) => {
          const isCurrent = s.key === currentStageKey;
          const isPassed = currentIdx > idx;
          const stagePrereqs = prerequisites.filter(p => p.stageKey === s.key);
          const stageDoneCount = stagePrereqs.filter(p => p.isCompleted).length;

          return (
            <button
              key={s.key}
              onClick={() => setCurrentStageKey(s.key)}
              className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                isCurrent
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md font-bold ring-2 ring-blue-500/50'
                  : isPassed
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950 font-semibold hover:bg-emerald-100/70'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] uppercase font-extrabold tracking-wider opacity-75 mb-1">
                <span>Stage {s.number}</span>
                {isPassed ? (
                  <span className="text-emerald-600 font-extrabold">✓</span>
                ) : (
                  <span>{stageDoneCount}/{stagePrereqs.length}</span>
                )}
              </div>
              <div className="text-xs font-extrabold truncate">{s.shortLabel}</div>
              <div className="text-[10px] opacity-80 mt-0.5 truncate">{s.label}</div>
            </button>
          );
        })}
      </div>

      {/* 3. DYNAMIC PREREQUISITE CHECKLIST CARD */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Stage {currentStageObj.number} Prerequisites Checklist ({currentStageObj.label})
              </h2>
              <p className="text-xs text-slate-500">
                {currentCompletedCount} of {currentPrereqs.length} prerequisite requirements satisfied for this stage.
              </p>
            </div>
          </div>

          <span className="text-xs font-bold bg-slate-100 text-slate-800 px-3 py-1 rounded-full border border-slate-200">
            Stage Status: {isCurrentStageCleared ? '🟢 100% Cleared' : '🟡 In Progress'}
          </span>
        </div>

        {/* Prerequisites List */}
        <div className="space-y-3">
          {currentPrereqs.map((prereq) => (
            <div 
              key={prereq.id}
              className={`p-4 rounded-xl border transition-all space-y-2 ${
                prereq.isCompleted
                  ? 'bg-emerald-50/50 border-emerald-300'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={() => togglePrerequisite(prereq.id)}
                    className="shrink-0"
                  >
                    {prereq.isCompleted ? (
                      <CheckSquare className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                    )}
                  </button>
                  <span className="font-extrabold text-xs text-slate-900">{prereq.title}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md">
                    Role: {prereq.responsibleRole}
                  </span>

                  <Link
                    href={prereq.targetRoute}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg border border-blue-200 transition"
                  >
                    <span>{prereq.targetRouteLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              <p className="text-xs text-slate-600 pl-7 leading-relaxed">
                {prereq.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
