'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, 
  ShieldCheck, 
  Download, 
  Building2, 
  MapPin, 
  Users, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  Lock, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Award,
  Sparkles,
  Paperclip,
  Check,
  Edit2,
  X,
  Save
} from 'lucide-react';
import { getDefaultCharter, MasterProjectCharter } from '@/server/services/projectCharterService';
import { formatCurrencyString } from '@/server/services/multiCurrency';

export default function MasterProjectCharterPage({ params }: { params: { id: string } }) {
  const projectId = params.id || 'PID-22567';
  const [charter, setCharter] = useState<MasterProjectCharter>(getDefaultCharter(projectId, `Project ${projectId}`));
  const [toastMessage, setToastMessage] = useState('');
  const [openAccordion, setOpenAccordion] = useState<number>(1);
  const [showEditModal, setShowEditModal] = useState(false);

  // Edit Charter Form States
  const [editTitle, setEditTitle] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editDonor, setEditDonor] = useState('');
  const [editNgoab, setEditNgoab] = useState('');
  const [editRrrc, setEditRrrc] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editOutput1, setEditOutput1] = useState('');
  const [editOutput2, setEditOutput2] = useState('');
  const [editOutput3, setEditOutput3] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editUpazila, setEditUpazila] = useState('');
  const [editGpsLat, setEditGpsLat] = useState('');
  const [editGpsLng, setEditGpsLng] = useState('');
  const [editHostCount, setEditHostCount] = useState(500);
  const [editRohingyaCount, setEditRohingyaCount] = useState(500);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`skb_charter_${projectId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setCharter(parsed);
        } catch (e) {
          console.error('Failed to parse saved charter', e);
        }
      }
    }
  }, [projectId]);

  const updateCharterState = (updated: MasterProjectCharter) => {
    setCharter(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`skb_charter_${projectId}`, JSON.stringify(updated));

      // Synchronize with main projects directory list
      const savedProjects = localStorage.getItem('skb_portal_projects_v3');
      if (savedProjects) {
        try {
          const projects = JSON.parse(savedProjects);
          if (Array.isArray(projects)) {
            const updatedProjects = projects.map((p: any) => {
              if (p.id === projectId || p.code === updated.metadata.projectCode) {
                return {
                  ...p,
                  name: updated.metadata.projectTitle,
                  code: updated.metadata.projectCode,
                  location: `${updated.location.district}, ${updated.location.upazila}`,
                };
              }
              return p;
            });
            localStorage.setItem('skb_portal_projects_v3', JSON.stringify(updatedProjects));
          }
        } catch (e) {}
      }
    }
  };

  const handleOpenEditModal = () => {
    setEditTitle(charter.metadata.projectTitle);
    setEditCode(charter.metadata.projectCode);
    setEditDonor(charter.metadata.donorName);
    setEditNgoab(charter.metadata.ngoabRef);
    setEditRrrc(charter.metadata.rrrcRef);
    setEditSummary(charter.narrative.executiveSummary);
    setEditOutput1(charter.narrative.keyOutput1);
    setEditOutput2(charter.narrative.keyOutput2);
    setEditOutput3(charter.narrative.keyOutput3);
    setEditDistrict(charter.location.district);
    setEditUpazila(charter.location.upazila);
    setEditGpsLat(charter.location.gpsLat);
    setEditGpsLng(charter.location.gpsLng);
    setEditHostCount(charter.beneficiaries.hostTotalIndividuals);
    setEditRohingyaCount(charter.beneficiaries.rohingyaTotalIndividuals);
    setShowEditModal(true);
  };

  const handleSaveCharterEdit = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: MasterProjectCharter = {
      ...charter,
      metadata: {
        ...charter.metadata,
        projectTitle: editTitle.trim() || charter.metadata.projectTitle,
        projectCode: editCode.trim() || charter.metadata.projectCode,
        donorName: editDonor.trim() || charter.metadata.donorName,
        ngoabRef: editNgoab.trim() || charter.metadata.ngoabRef,
        rrrcRef: editRrrc.trim() || charter.metadata.rrrcRef,
      },
      narrative: {
        ...charter.narrative,
        executiveSummary: editSummary.trim() || charter.narrative.executiveSummary,
        keyOutput1: editOutput1.trim() || charter.narrative.keyOutput1,
        keyOutput2: editOutput2.trim() || charter.narrative.keyOutput2,
        keyOutput3: editOutput3.trim() || charter.narrative.keyOutput3,
      },
      location: {
        ...charter.location,
        district: editDistrict.trim() || charter.location.district,
        upazila: editUpazila.trim() || charter.location.upazila,
        gpsLat: editGpsLat.trim() || charter.location.gpsLat,
        gpsLng: editGpsLng.trim() || charter.location.gpsLng,
      },
      beneficiaries: {
        ...charter.beneficiaries,
        hostTotalIndividuals: Number(editHostCount) || charter.beneficiaries.hostTotalIndividuals,
        rohingyaTotalIndividuals: Number(editRohingyaCount) || charter.beneficiaries.rohingyaTotalIndividuals,
      }
    };

    updateCharterState(updated);
    setShowEditModal(false);
    setToastMessage(`Project Charter for "${updated.metadata.projectTitle}" updated & permanently saved!`);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const toggleAccordion = (sectionNum: number) => {
    setOpenAccordion(openAccordion === sectionNum ? 0 : sectionNum);
  };

  const handleSignOff = (roleIndex: number) => {
    const updatedSignOffs = [...charter.signOffs];
    updatedSignOffs[roleIndex].signed = true;
    updatedSignOffs[roleIndex].signedAt = new Date().toISOString().split('T')[0];
    
    const updated: MasterProjectCharter = {
      ...charter,
      signOffs: updatedSignOffs,
      isLocked: updatedSignOffs.every(s => s.signed)
    };

    updateCharterState(updated);
    setToastMessage(`Executive Sign-Off recorded for ${updatedSignOffs[roleIndex].role}!`);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleExportPdf = () => {
    const content = `==========================================================\nSMALL KINDNESS BANGLADESH (SKB) - MASTER HUMANITARIAN PROJECT CHARTER\nProject Title: ${charter.metadata.projectTitle}\nProject Code: ${charter.metadata.projectCode}\nDonor: ${charter.metadata.donorName}\nNGOAB Clearance Ref: ${charter.metadata.ngoabRef}\nRRRC Approval Ref: ${charter.metadata.rrrcRef}\n==========================================================\n\n1. EXECUTIVE SUMMARY:\n${charter.narrative.executiveSummary}\n\n2. KEY OUTPUTS:\n- ${charter.narrative.keyOutput1}\n- ${charter.narrative.keyOutput2}\n- ${charter.narrative.keyOutput3}\n\n3. GEOGRAPHICAL MAPPING:\nDivision: ${charter.location.division} | District: ${charter.location.district} | Upazila: ${charter.location.upazila}\nGPS Coordinates: Lat ${charter.location.gpsLat}, Lng ${charter.location.gpsLng}\n\n4. 6-LINE BUDGET FRAMEWORK:\n${charter.budgetLines.map(b => `- ${b.category}: BDT ${b.approvedBdt.toLocaleString()} (${b.status})`).join('\n')}\n\n5. EXECUTIVE SIGN-OFFS:\n${charter.signOffs.map(s => `- ${s.role}: ${s.officerName} (${s.signed ? 'SIGNED ✓' : 'PENDING'})`).join('\n')}\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SKB_Master_Charter_${charter.metadata.projectCode.replace(/[^a-zA-Z0-9_\-]/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToastMessage(`Exported Master Charter Document for ${charter.metadata.projectCode}!`);
    setTimeout(() => setToastMessage(''), 4000);
  };

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* 1. CHARTER BANNER & ACTION HEADER */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-900 text-white px-3 py-1 rounded-full font-extrabold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" /> Master Project Charter
            </span>
            <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> {charter.isLocked ? 'Baseline Approved & Locked' : 'Draft Baseline Mode'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenEditModal}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-2 rounded-xl transition-all"
            >
              <Edit2 className="w-4 h-4 text-blue-600" /> Edit Project Charter
            </button>

            <button
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-xl shadow-sm transition-all"
            >
              <Download className="w-4 h-4 text-amber-400" /> Export Master Charter (.PDF)
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs font-extrabold text-blue-600 font-mono mb-1">
            PROJECT #{charter.metadata.projectCode}
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {charter.metadata.projectTitle}
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed mt-1">
            Official 12-Section Project Charter governing baseline parameters, government clearances, multi-currency budgets, and interdepartmental RACI responsibilities.
          </p>
        </div>
      </div>

      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* 2. ACCORDION CONTAINER FOR THE 12 SECTIONS */}
      <div className="space-y-4">
        {/* SECTION ITEM 1: Document Control & Scope */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
          <button 
            onClick={() => toggleAccordion(1)}
            className="w-full p-4 flex items-center justify-between bg-slate-50/70 hover:bg-slate-100/70 transition border-b border-slate-100 text-left"
          >
            <span className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" /> Document Control, Rationale, Donor Scope &amp; GPS Site Mapping
            </span>
            {openAccordion === 1 ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>

          {openAccordion === 1 && (
            <div className="p-5 space-y-5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">Project Code / PID</span>
                  <strong className="text-blue-700">{charter.metadata.projectCode}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">NGOAB Clearance Ref (FD-6/7)</span>
                  <strong className="text-slate-900">{charter.metadata.ngoabRef}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">RRRC Access Approval Ref</span>
                  <strong className="text-slate-900">{charter.metadata.rrrcRef}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">Donor &amp; Partner Name</span>
                  <strong className="text-slate-900 font-sans">{charter.metadata.donorName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">Approved Implementation Period</span>
                  <strong className="text-slate-900 font-sans">{charter.metadata.startDate} &mdash; {charter.metadata.endDate} ({charter.metadata.durationMonths} Mos)</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">Lead SKB Department</span>
                  <strong className="text-slate-900 font-sans">{charter.metadata.leadDepartment}</strong>
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider text-blue-700 mb-1">
                  Executive Background &amp; Strategic Objectives
                </h4>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  {charter.narrative.executiveSummary}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 space-y-1">
                  <span className="font-extrabold text-blue-900 block text-[11px]">Key Output 1</span>
                  <p className="text-slate-700">{charter.narrative.keyOutput1}</p>
                </div>
                <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 space-y-1">
                  <span className="font-extrabold text-blue-900 block text-[11px]">Key Output 2</span>
                  <p className="text-slate-700">{charter.narrative.keyOutput2}</p>
                </div>
                <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 space-y-1">
                  <span className="font-extrabold text-blue-900 block text-[11px]">Key Output 3</span>
                  <p className="text-slate-700">{charter.narrative.keyOutput3}</p>
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider text-blue-700 mb-2">
                  10-Sector Scope Selection Matrix
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {charter.sectors.map((sec) => (
                    <div
                      key={sec.id}
                      className={`p-2.5 rounded-xl border text-[11px] font-bold transition ${
                        sec.selected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${sec.selected ? 'bg-amber-400' : 'bg-slate-300'}`} />
                        <span>{sec.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider text-blue-700 mb-2">
                  Geographical &amp; GPS Site Coordinates Mapping
                </h4>
                <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Division / District / Upazila</span>
                    <strong className="text-amber-400 font-sans">{charter.location.division} &rsaquo; {charter.location.district} &rsaquo; {charter.location.upazila} ({charter.location.union})</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">GPS Site Coordinates</span>
                    <strong className="text-emerald-400 font-mono">Lat: {charter.location.gpsLat}, Lng: {charter.location.gpsLng}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION ITEM 2: Beneficiary Targeting & Budget */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
          <button 
            onClick={() => toggleAccordion(2)}
            className="w-full p-4 flex items-center justify-between bg-slate-50/70 hover:bg-slate-100/70 transition border-b border-slate-100 text-left"
          >
            <span className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" /> Beneficiary Targeting, Personnel Directory &amp; 6-Line Budget Framework
            </span>
            {openAccordion === 2 ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>

          {openAccordion === 2 && (
            <div className="p-5 space-y-5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-2">
                  <h4 className="font-extrabold text-emerald-950 text-xs flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600" /> Host Community Targets
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>Total Individuals: <strong className="text-slate-900">{charter.beneficiaries.hostTotalIndividuals}</strong></div>
                    <div>Total Households: <strong className="text-slate-900">{charter.beneficiaries.hostTotalHouseholds}</strong></div>
                    <div>Male / Female: <strong className="text-slate-900">{charter.beneficiaries.hostMale} M / {charter.beneficiaries.hostFemale} F</strong></div>
                    <div>Persons w/ Disabilities: <strong className="text-slate-900">{charter.beneficiaries.hostPwd} PWD</strong></div>
                  </div>
                </div>

                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 space-y-2">
                  <h4 className="font-extrabold text-blue-950 text-xs flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-600" /> Rohingya Refugee Targets (FCN Cards)
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>Total Individuals: <strong className="text-slate-900">{charter.beneficiaries.rohingyaTotalIndividuals}</strong></div>
                    <div>Total Households: <strong className="text-slate-900">{charter.beneficiaries.rohingyaTotalHouseholds}</strong></div>
                    <div>Male / Female: <strong className="text-slate-900">{charter.beneficiaries.rohingyaMale} M / {charter.beneficiaries.rohingyaFemale} F</strong></div>
                    <div>Orphans Supported: <strong className="text-slate-900">{charter.beneficiaries.orphanTotal} Orphans</strong></div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider text-blue-700 mb-2">
                  6-Line Financial Budget Framework
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider font-mono">
                      <tr>
                        <th className="p-3">Budget Line Category</th>
                        <th className="p-3 font-mono">Donor Currency</th>
                        <th className="p-3 font-mono">Approved BDT</th>
                        <th className="p-3">Compliance Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {charter.budgetLines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{line.category}</td>
                          <td className="p-3 font-mono text-slate-800">${line.approvedDonorCurrency.toLocaleString()} USD</td>
                          <td className="p-3 font-mono text-emerald-700 font-bold">BDT {line.approvedBdt.toLocaleString()}</td>
                          <td className="p-3">
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                              {line.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION ITEM 3: Executive Sign-Offs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-500" />
              Section 12: Executive Master Authorization Sign-Off
            </h3>
            <span className="text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full">
              {charter.signOffs.filter(s => s.signed).length} of {charter.signOffs.length} Signed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {charter.signOffs.map((sign, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border transition space-y-2 ${
                  sign.signed
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50/30 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider">
                  <span>{sign.role}</span>
                  {sign.signed ? <Check className="w-4 h-4 text-emerald-600" /> : <Lock className="w-3.5 h-3.5 text-amber-600" />}
                </div>
                <div className="font-bold text-xs">{sign.officerName}</div>
                {sign.signed ? (
                  <div className="text-[10px] text-emerald-700 font-mono">Signed on {sign.signedAt}</div>
                ) : (
                  <button
                    onClick={() => handleSignOff(idx)}
                    className="w-full mt-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] py-1.5 rounded-lg shadow-xs transition"
                  >
                    Approve Baseline
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* EDIT CHARTER MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                Edit Operational Project Charter Parameters
              </h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCharterEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Project Code / PID</label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NGOAB Clearance Ref (FD-6/7)</label>
                  <input
                    type="text"
                    required
                    value={editNgoab}
                    onChange={(e) => setEditNgoab(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">RRRC Approval Ref</label>
                  <input
                    type="text"
                    required
                    value={editRrrc}
                    onChange={(e) => setEditRrrc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Project Title</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Donor Name</label>
                  <input
                    type="text"
                    required
                    value={editDonor}
                    onChange={(e) => setEditDonor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Executive Summary &amp; Background</label>
                <textarea
                  rows={3}
                  required
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Key Output 1</label>
                  <input
                    type="text"
                    required
                    value={editOutput1}
                    onChange={(e) => setEditOutput1(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Key Output 2</label>
                  <input
                    type="text"
                    required
                    value={editOutput2}
                    onChange={(e) => setEditOutput2(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Key Output 3</label>
                  <input
                    type="text"
                    required
                    value={editOutput3}
                    onChange={(e) => setEditOutput3(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">District</label>
                  <input
                    type="text"
                    required
                    value={editDistrict}
                    onChange={(e) => setEditDistrict(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Upazila</label>
                  <input
                    type="text"
                    required
                    value={editUpazila}
                    onChange={(e) => setEditUpazila(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">GPS Lat</label>
                  <input
                    type="text"
                    required
                    value={editGpsLat}
                    onChange={(e) => setEditGpsLat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">GPS Lng</label>
                  <input
                    type="text"
                    required
                    value={editGpsLng}
                    onChange={(e) => setEditGpsLng(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Host Target Individuals</label>
                  <input
                    type="number"
                    required
                    value={editHostCount}
                    onChange={(e) => setEditHostCount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rohingya Target Individuals</label>
                  <input
                    type="number"
                    required
                    value={editRohingyaCount}
                    onChange={(e) => setEditRohingyaCount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Save Project Charter Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
