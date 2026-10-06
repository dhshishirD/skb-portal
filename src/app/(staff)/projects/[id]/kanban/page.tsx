'use client';

import { useState, useEffect } from 'react';
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
  Sparkles,
  RotateCcw,
  Check
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
  { key: 'concept', number: 1, label: 'Concept & Charter Baseline', shortLabel: 'Charter', pct: 15 },
  { key: 'proposal', number: 2, label: 'Proposal & Budget Baseline', shortLabel: 'Proposal', pct: 30 },
  { key: 'approved', number: 3, label: 'Executive Approval & RACI', shortLabel: 'Approved', pct: 50 },
  { key: 'implementation', number: 4, label: 'Field Implementation', shortLabel: 'Execution', pct: 75 },
  { key: 'monitoring_evaluation', number: 5, label: 'Pre-Submission Audit', shortLabel: 'M&E Audit', pct: 90 },
  { key: 'closed', number: 6, label: 'Form-7 Export & Closed', shortLabel: 'Closed', pct: 100 },
];

export default function MasterKanbanStageGatePage({ params }: { params: { id: string } }) {
  const projectId = params.id || '1791280957216';
  const [charter, setCharter] = useState(getDefaultCharter(projectId, `Project ${projectId}`));
  const [closingAudit, setClosingAudit] = useState(getDefaultClosingAudit(projectId, `Project ${projectId}`));

  const [currentStageKey, setCurrentStageKey] = useState<string>('implementation');
  const [manualPrereqs, setManualPrereqs] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCharter = localStorage.getItem(`skb_charter_${projectId}`);
      if (savedCharter) {
        try { setCharter(JSON.parse(savedCharter)); } catch (e) {}
      }

      const savedAudit = localStorage.getItem(`skb_closing_audit_${projectId}`);
      if (savedAudit) {
        try { setClosingAudit(JSON.parse(savedAudit)); } catch (e) {}
      }

      const savedStage = localStorage.getItem(`skb_kanban_stage_${projectId}`);
      if (savedStage) {
        setCurrentStageKey(savedStage);
      }

      const savedPrereqs = localStorage.getItem(`skb_kanban_prereqs_${projectId}`);
      if (savedPrereqs) {
        try { setManualPrereqs(JSON.parse(savedPrereqs)); } catch (e) {}
      }
    }
  }, [projectId]);

  // Base logic calculation of Prerequisites
  const defaultPrerequisites: Omit<StagePrerequisite, 'isCompleted'>[] = [
    // STAGE 1: Concept & Charter Baseline
    {
      id: 'prereq-1.1',
      stageKey: 'concept',
      title: 'NGOAB (FD-6/7) & RRRC Access Clearance Recorded',
      description: `Verify Government clearance refs in Section 1 of Project Charter (${charter.metadata.ngoabRef || 'Pending Ref'}).`,
      responsibleRole: 'PM / PD',
      targetRoute: `/projects/${projectId}/charter`,
      targetRouteLabel: 'Open Project Charter',
    },
    {
      id: 'prereq-1.2',
      stageKey: 'concept',
      title: '10-Sector Scope & GPS Site Coordinates Defined',
      description: `Select active sectors in Section 3 & map GPS Lat (${charter.location.gpsLat}) / Lng (${charter.location.gpsLng}) in Section 4.`,
      responsibleRole: 'PM',
      targetRoute: `/projects/${projectId}/charter`,
      targetRouteLabel: 'Edit Sector & GPS Mapping',
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
    },
    {
      id: 'prereq-2.2',
      stageKey: 'proposal',
      title: 'Beneficiary Targets & ID Type Breakdown Set',
      description: 'Host NID/BRN vs. Rohingya FCN Smart Card targets defined in Section 5 of Project Charter.',
      responsibleRole: 'Program Officer',
      targetRoute: `/projects/${projectId}/charter`,
      targetRouteLabel: 'View Beneficiary Targets',
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
    },
    {
      id: 'prereq-3.2',
      stageKey: 'approved',
      title: '4-Executive Digital Baseline Sign-Off Recorded',
      description: 'Sign-offs by Executive Director, Head of Ops, Finance Auditor, and MEAL Lead.',
      responsibleRole: '4 Executive Leads',
      targetRoute: `/projects/${projectId}/charter`,
      targetRouteLabel: 'Check Sign-Off Panel',
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
    },
    {
      id: 'prereq-4.2',
      stageKey: 'implementation',
      title: 'Beneficiary Registry Compiled (>€20 NID Rule)',
      description: '100% NID verified records for host community and FCN cards for Rohingya refugees.',
      responsibleRole: 'Field / PO',
      targetRoute: `/projects/${projectId}/beneficiaries`,
      targetRouteLabel: 'Open Beneficiary Registry',
    },
    {
      id: 'prereq-4.3',
      stageKey: 'implementation',
      title: 'Monthly Progress Reports (MPR - 5th) Submitted',
      description: 'Field activity logs, distribution vouchers, and vendor invoices recorded.',
      responsibleRole: 'Program Officer',
      targetRoute: `/projects/${projectId}/tasks`,
      targetRouteLabel: 'Open Workplan & Tasks',
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
    },
    {
      id: 'prereq-5.2',
      stageKey: 'monitoring_evaluation',
      title: 'Domain B (Safeguarding Audit): Strictly NO Underaged (<18) Signs',
      description: 'NID provisioning (>€20) verified, dual signatures on list, and Parent/Guardian signed for children.',
      responsibleRole: 'Program Officer',
      targetRoute: `/projects/${projectId}/closing-report`,
      targetRouteLabel: 'Audit Domain B Safeguarding',
    },
    {
      id: 'prereq-5.3',
      stageKey: 'monitoring_evaluation',
      title: 'Domain C (Timeline Sequencing): Date AC < Form-7 > End Date',
      description: `Verified Date AC Declaration (${closingAudit.acDeclarationDate}) BEFORE Form-7 Date (${closingAudit.form7SignatureDate}).`,
      responsibleRole: 'Project Coordinator',
      targetRoute: `/projects/${projectId}/closing-report`,
      targetRouteLabel: 'Audit Domain C Timeline',
    },
    {
      id: 'prereq-5.4',
      stageKey: 'monitoring_evaluation',
      title: 'Domain D (Media Vault): Logo Banners & Encrypted Storage Checked',
      description: 'High-res distribution photos with logo banners & password-protected storage vault verified.',
      responsibleRole: 'Media Officer',
      targetRoute: `/projects/${projectId}/closing-report`,
      targetRouteLabel: 'Audit Domain D Media Vault',
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
    },
    {
      id: 'prereq-6.2',
      stageKey: 'closed',
      title: 'Official Form-7 Completion Package (.ZIP) Exported',
      description: 'Form-7 package exported and transmitted to IHH Turkey / Partner Workspace.',
      responsibleRole: 'Project Director',
      targetRoute: `/projects/${projectId}/closing-report`,
      targetRouteLabel: 'Download Form-7 Package ZIP',
    },
  ];

  // Evaluate completion status with manual overrides
  const getIsDefaultCompleted = (id: string, stageKey: string): boolean => {
    if (stageKey === 'concept') {
      if (id === 'prereq-1.1') return Boolean(charter.metadata.ngoabRef && charter.metadata.rrrcRef);
      if (id === 'prereq-1.2') return Boolean(charter.location.gpsLat && charter.sectors.some(s => s.selected));
    }
    if (stageKey === 'proposal') {
      if (id === 'prereq-2.1') return charter.budgetLines.length === 6;
      if (id === 'prereq-2.2') return charter.beneficiaries.hostTotalIndividuals > 0;
    }
    if (stageKey === 'approved') {
      if (id === 'prereq-3.1') return charter.raci.length > 0;
      if (id === 'prereq-3.2') return charter.signOffs.every(s => s.signed);
    }
    if (stageKey === 'implementation') {
      return true; // Default initialized active for field stage
    }
    if (stageKey === 'monitoring_evaluation') {
      if (id === 'prereq-5.1') return closingAudit.domainA_financial.every(i => i.status === 'Compliant');
      if (id === 'prereq-5.2') return closingAudit.domainB_safeguarding.every(i => i.status === 'Compliant');
      if (id === 'prereq-5.3') return closingAudit.domainC_timeline.every(i => i.status === 'Compliant');
      if (id === 'prereq-5.4') return closingAudit.domainD_media.every(i => i.status === 'Compliant');
    }
    if (stageKey === 'closed') {
      if (id === 'prereq-6.1') return closingAudit.signOffs.every(s => s.signed);
      if (id === 'prereq-6.2') return closingAudit.isForm7Unlocked;
    }
    return true;
  };

  const prerequisites: StagePrerequisite[] = defaultPrerequisites.map(p => {
    const defaultVal = getIsDefaultCompleted(p.id, p.stageKey);
    const isCompleted = manualPrereqs[p.id] !== undefined ? manualPrereqs[p.id] : defaultVal;
    return { ...p, isCompleted };
  });

  const currentStageObj = STAGES.find(s => s.key === currentStageKey) || STAGES[3];
  const currentPrereqs = prerequisites.filter(p => p.stageKey === currentStageKey);
  const currentCompletedCount = currentPrereqs.filter(p => p.isCompleted).length;
  const isCurrentStageCleared = currentPrereqs.length > 0 && currentCompletedCount === currentPrereqs.length;
  const currentIdx = STAGES.findIndex(s => s.key === currentStageKey);

  // Dynamic progress calculation based on prerequisite checklist ratio
  const prevStagePct = currentIdx > 0 ? STAGES[currentIdx - 1].pct : 0;
  const targetStagePct = currentStageObj.pct;
  const currentStageRatio = currentPrereqs.length > 0 ? currentCompletedCount / currentPrereqs.length : 1;
  const liveCalculatedProgressPct = Math.round(prevStagePct + currentStageRatio * (targetStagePct - prevStagePct));

  // Sync on state change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProjects = localStorage.getItem('skb_portal_projects_v3');
      if (savedProjects) {
        try {
          const projects = JSON.parse(savedProjects);
          if (Array.isArray(projects)) {
            const updated = projects.map((p: any) => {
              if (p.id === projectId || p.code === charter.metadata.projectCode) {
                return {
                  ...p,
                  stage: currentStageObj.label,
                  progressPct: liveCalculatedProgressPct,
                };
              }
              return p;
            });
            localStorage.setItem('skb_portal_projects_v3', JSON.stringify(updated));
          }
        } catch (e) {}
      }
    }
  }, [projectId, currentStageKey, liveCalculatedProgressPct, currentStageObj.label, charter.metadata.projectCode]);

  const saveStageSelection = (stageKey: string) => {
    setCurrentStageKey(stageKey);
    const targetObj = STAGES.find(s => s.key === stageKey) || STAGES[0];

    if (typeof window !== 'undefined') {
      localStorage.setItem(`skb_kanban_stage_${projectId}`, stageKey);
    }
  };

  const handleTogglePrereq = (prereqId: string, currentVal: boolean, title: string) => {
    const newVal = !currentVal;
    const updated = { ...manualPrereqs, [prereqId]: newVal };
    setManualPrereqs(updated);

    if (typeof window !== 'undefined') {
      localStorage.setItem(`skb_kanban_prereqs_${projectId}`, JSON.stringify(updated));
    }

    setToastMessage(`"${title}" marked as ${newVal ? 'Satisfied [✓]' : 'Pending Action [ ]'}`);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleToggleAllInStage = (shouldComplete: boolean) => {
    const updated = { ...manualPrereqs };
    currentPrereqs.forEach(p => {
      updated[p.id] = shouldComplete;
    });
    setManualPrereqs(updated);

    if (typeof window !== 'undefined') {
      localStorage.setItem(`skb_kanban_prereqs_${projectId}`, JSON.stringify(updated));
    }

    setToastMessage(
      shouldComplete 
        ? `All Stage ${currentStageObj.number} prerequisites marked complete!` 
        : `Stage ${currentStageObj.number} prerequisites reset to pending.`
    );
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleSelectStageTab = (stageKey: string) => {
    saveStageSelection(stageKey);
  };

  const handleAdvanceStage = () => {
    if (currentIdx < STAGES.length - 1) {
      const nextStage = STAGES[currentIdx + 1];
      saveStageSelection(nextStage.key);
      setToastMessage(`Project Stage advanced live to Stage ${nextStage.number}: ${nextStage.label}! (${nextStage.pct}% Target)`);
      setTimeout(() => setToastMessage(''), 4000);
    }
  };

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* Stage Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-900 text-white px-3 py-1 rounded-full font-extrabold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Master Stage-Gate Control Engine
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 ${
              isCurrentStageCleared ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {isCurrentStageCleared ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-amber-600" />}
              {isCurrentStageCleared ? 'Stage Gate Cleared' : `${currentPrereqs.length - currentCompletedCount} Prerequisites Pending`}
            </span>
          </div>

          {currentIdx < STAGES.length - 1 && (
            <button
              onClick={handleAdvanceStage}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-4.5 py-2 rounded-xl shadow-sm transition-all"
            >
              Advance to Stage {currentIdx + 2} ({STAGES[currentIdx + 1].shortLabel}) <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-extrabold text-slate-900">
              Stage {currentStageObj.number}: {currentStageObj.label}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Live Progress:</span>
              <span className="text-base font-extrabold text-blue-600 bg-blue-50 border border-blue-200 px-3.5 py-1 rounded-full font-mono">
                {liveCalculatedProgressPct}% Overall Progress
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Officers can directly check off prerequisite requirements below. Real-time changes instantly update the project&apos;s overall progress percentage and sync to the Projects Directory.
          </p>
        </div>
      </div>

      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* Stage Progression Tabs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
        {STAGES.map((s) => {
          const isActive = s.key === currentStageKey;
          const sPrereqs = defaultPrerequisites.filter(p => p.stageKey === s.key);
          const sCompleted = sPrereqs.filter(p => {
            const def = getIsDefaultCompleted(p.id, p.stageKey);
            return manualPrereqs[p.id] !== undefined ? manualPrereqs[p.id] : def;
          }).length;
          const sDone = sPrereqs.length > 0 && sCompleted === sPrereqs.length;

          return (
            <button
              key={s.key}
              onClick={() => handleSelectStageTab(s.key)}
              className={`p-3 rounded-2xl border transition-all text-left space-y-1 ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-blue-500/30'
                  : sDone
                  ? 'bg-emerald-50/60 text-slate-800 border-emerald-200 hover:bg-emerald-100/60'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono uppercase">
                <span className={isActive ? 'text-amber-400 font-extrabold' : 'text-slate-500 font-bold'}>
                  STAGE {s.number}
                </span>
                <span className={`font-bold ${isActive ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  {s.pct}%
                </span>
              </div>
              <div className="text-xs font-bold truncate">{s.shortLabel}</div>
              <div className="text-[10px] text-slate-400 font-medium">
                {sPrereqs.length > 0 ? `${sCompleted}/${sPrereqs.length} Cleared` : 'Checklist'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Prerequisites Checklist Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            Stage {currentStageObj.number} Interactive Prerequisites Checklist ({currentStageObj.label})
          </h3>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleAllInStage(!isCurrentStageCleared)}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full border border-slate-300 transition flex items-center gap-1"
            >
              {isCurrentStageCleared ? <RotateCcw className="w-3 h-3" /> : <Check className="w-3 h-3" />}
              {isCurrentStageCleared ? 'Uncheck All' : 'Quick Check All'}
            </button>
            <span className="text-xs font-bold bg-slate-900 text-white px-3 py-1 rounded-full font-mono">
              Stage Status: {currentCompletedCount} of {currentPrereqs.length} Satisfied ({isCurrentStageCleared ? '100% Cleared' : 'Pending'})
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {currentPrereqs.map((prereq) => (
            <div
              key={prereq.id}
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                prereq.isCompleted
                  ? 'bg-emerald-50/40 border-emerald-300 text-emerald-950 shadow-xs'
                  : 'bg-amber-50/30 border-amber-300 text-amber-950'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Interactive Checkbox Button */}
                <button
                  type="button"
                  onClick={() => handleTogglePrereq(prereq.id, prereq.isCompleted, prereq.title)}
                  className={`mt-0.5 p-1.5 rounded-xl transition-all flex items-center justify-center border shrink-0 ${
                    prereq.isCompleted
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                      : 'bg-white border-amber-400 text-amber-600 hover:border-emerald-500 hover:text-emerald-600'
                  }`}
                  title={prereq.isCompleted ? 'Click to mark as pending' : 'Click to mark as satisfied'}
                >
                  {prereq.isCompleted ? (
                    <CheckSquare className="w-5 h-5 text-white" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">{prereq.title}</h4>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                      prereq.isCompleted ? 'bg-emerald-200/80 text-emerald-900' : 'bg-amber-200/80 text-amber-900'
                    }`}>
                      {prereq.isCompleted ? 'Cleared' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">{prereq.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 sm:self-center">
                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
                  Role: {prereq.responsibleRole}
                </span>

                {/* Direct Manual Toggle Button */}
                <button
                  type="button"
                  onClick={() => handleTogglePrereq(prereq.id, prereq.isCompleted, prereq.title)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                    prereq.isCompleted
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                      : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                  }`}
                >
                  {prereq.isCompleted ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Satisfied [✓]
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Click to Check [ ]
                    </>
                  )}
                </button>

                <Link
                  href={prereq.targetRoute}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200 transition"
                >
                  {prereq.targetRouteLabel} <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
