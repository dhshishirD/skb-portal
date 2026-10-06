'use client';

import { useState } from 'react';
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
  Check
} from 'lucide-react';
import { getDefaultCharter, MasterProjectCharter } from '@/server/services/projectCharterService';
import { formatCurrencyString } from '@/server/services/multiCurrency';

export default function MasterProjectCharterPage({ params }: { params: { id: string } }) {
  const projectId = params.id || 'PID-22567';
  const [charter, setCharter] = useState<MasterProjectCharter>(getDefaultCharter(projectId, `Project ${projectId}`));
  const [toastMessage, setToastMessage] = useState('');
  const [openAccordion, setOpenAccordion] = useState<number>(1);

  const toggleAccordion = (sectionNum: number) => {
    setOpenAccordion(openAccordion === sectionNum ? 0 : sectionNum);
  };

  const handleSignOff = (roleIndex: number) => {
    const updatedSignOffs = [...charter.signOffs];
    updatedSignOffs[roleIndex].signed = true;
    updatedSignOffs[roleIndex].signedAt = new Date().toISOString().split('T')[0];
    
    setCharter({
      ...charter,
      signOffs: updatedSignOffs,
      isLocked: updatedSignOffs.every(s => s.signed)
    });

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

    setToastMessage(`Exported Master Charter PDF/Text Document for ${charter.metadata.projectCode}!`);
    setTimeout(() => setToastMessage(''), 4000);
  };

  return (
    <div className="space-y-6 font-sans">
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

          <button
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-xl shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-amber-400" /> Export Master Charter (.PDF)
          </button>
        </div>

        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {charter.metadata.projectTitle}
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed mt-1">
            Official 12-Section Project Charter governing baseline parameters, government clearances, multi-currency budgets, and interdepartmental RACI responsibilities.
          </p>
        </div>
      </div>

      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {toastMessage}
        </div>
      )}

      {/* 2. SECTION 1-4 ACCORDION CARD: METADATA, NARRATIVE, SECTORS & GPS */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleAccordion(1)}
          className="w-full p-5 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-left transition"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-800 font-extrabold text-xs flex items-center justify-center">
              1-4
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Document Control, Rationale, Sector Scope & GPS Site Mapping
              </h2>
              <p className="text-xs text-slate-500">Government clearance refs, 10-sector toggle matrix, and location coordinates</p>
            </div>
          </div>
          {openAccordion === 1 ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>

        {openAccordion === 1 && (
          <div className="p-6 space-y-6 border-t border-slate-100 text-xs">
            {/* Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Project Code / PID</span>
                <span className="font-mono font-extrabold text-blue-700 text-xs">{charter.metadata.projectCode}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">NGOAB Clearance Ref (FD-6/7)</span>
                <span className="font-bold text-slate-800">{charter.metadata.ngoabRef}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">RRRC Camp Approval Ref</span>
                <span className="font-bold text-slate-800">{charter.metadata.rrrcRef}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Donor & Grant Number</span>
                <span className="font-bold text-slate-800">{charter.metadata.donorName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Implementation Period</span>
                <span className="font-bold text-slate-800">{charter.metadata.startDate} &rarr; {charter.metadata.endDate} ({charter.metadata.durationMonths} Mo.)</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Lead Department</span>
                <span className="font-bold text-slate-800">{charter.metadata.leadDepartment}</span>
              </div>
            </div>

            {/* Narrative Rationale */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Executive Rationale & Strategic Outputs</h3>
              <p className="text-slate-700 leading-relaxed bg-blue-50/40 p-3.5 rounded-xl border border-blue-100">
                {charter.narrative.executiveSummary}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-extrabold text-blue-700 block mb-1">Key Output 1</span>
                  <p className="text-slate-600 leading-snug">{charter.narrative.keyOutput1}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-extrabold text-emerald-700 block mb-1">Key Output 2</span>
                  <p className="text-slate-600 leading-snug">{charter.narrative.keyOutput2}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-extrabold text-purple-700 block mb-1">Key Output 3</span>
                  <p className="text-slate-600 leading-snug">{charter.narrative.keyOutput3}</p>
                </div>
              </div>
            </div>

            {/* 10-Sector Scope Selection Matrix */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">10-Sector Scope Selection Matrix</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
                {charter.sectors.map((sec) => (
                  <div 
                    key={sec.id}
                    className={`p-3 rounded-xl border transition ${
                      sec.selected 
                        ? 'bg-blue-50 border-blue-300 text-blue-950 font-bold' 
                        : 'bg-slate-50 border-slate-200/80 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                        sec.selected ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-600'
                      }`}>
                        {sec.selected ? '✓' : '•'}
                      </span>
                      <span className="text-[11px] truncate">{sec.name}</span>
                    </div>
                    {sec.selected && sec.activityDetails && (
                      <p className="text-[10px] text-blue-700 leading-tight italic">{sec.activityDetails}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Geographical & Location Mapping */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-500" /> Geographical & Location GPS Coordinates
              </h3>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <span>Division: <strong>{charter.location.division}</strong></span>
                  <span>District: <strong>{charter.location.district}</strong></span>
                  <span>Upazila: <strong>{charter.location.upazila}</strong></span>
                  <span>Union: <strong>{charter.location.union}</strong></span>
                  <span>Camp ID: <strong>{charter.location.campId}</strong></span>
                </div>
                <div className="pt-2 border-t border-slate-200/80 flex items-center gap-2 font-mono text-[11px] text-blue-700">
                  <span>GPS Coordinates:</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Lat: {charter.location.gpsLat}</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Lng: {charter.location.gpsLng}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. SECTION 5-8 ACCORDION CARD: BENEFICIARY TARGETS, DIRECTORY & 6-LINE BUDGET */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleAccordion(2)}
          className="w-full p-5 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-left transition"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-800 font-extrabold text-xs flex items-center justify-center">
              5-8
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Beneficiary Targeting, Personnel Directory & 6-Line Budget Framework
              </h2>
              <p className="text-xs text-slate-500">NID vs FCN card targets, staff assignments, and financial line items</p>
            </div>
          </div>
          {openAccordion === 2 ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>

        {openAccordion === 2 && (
          <div className="p-6 space-y-6 border-t border-slate-100 text-xs">
            {/* Beneficiary Target Summary Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-600" /> Beneficiary Target Matrix & ID Breakdown
              </h3>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-extrabold text-[11px]">
                      <th className="p-3">Target Group</th>
                      <th className="p-3">Primary ID Type</th>
                      <th className="p-3 text-center">Male</th>
                      <th className="p-3 text-center">Female</th>
                      <th className="p-3 text-center">Total Individuals</th>
                      <th className="p-3 text-center">Households</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    <tr>
                      <td className="p-3 font-bold text-slate-900">Host Community</td>
                      <td className="p-3 font-mono text-[11px] text-blue-700">National ID (NID) / BRN</td>
                      <td className="p-3 text-center">{charter.beneficiaries.hostMale}</td>
                      <td className="p-3 text-center">{charter.beneficiaries.hostFemale}</td>
                      <td className="p-3 text-center font-bold">{charter.beneficiaries.hostTotalIndividuals}</td>
                      <td className="p-3 text-center font-bold text-blue-800">{charter.beneficiaries.hostTotalHouseholds} HH</td>
                      <td className="p-3"><span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[10px]">100% NID Verified</span></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900">Orphan Children</td>
                      <td className="p-3 font-mono text-[11px] text-purple-700">Guardian NID Required</td>
                      <td className="p-3 text-center">-</td>
                      <td className="p-3 text-center">-</td>
                      <td className="p-3 text-center font-bold">{charter.beneficiaries.orphanTotal} Orphans</td>
                      <td className="p-3 text-center font-bold text-purple-800">{charter.beneficiaries.orphanTotal} Fam</td>
                      <td className="p-3"><span className="bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-full text-[10px]">Guardian Signed</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 6-Line Budget Framework */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Approved 6-Line Financial Framework
              </h3>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-extrabold text-[11px]">
                      <th className="p-3">Budget Category</th>
                      <th className="p-3 text-right">Approved (Donor EUR)</th>
                      <th className="p-3 text-right">Approved (BDT)</th>
                      <th className="p-3 text-right">Spent (BDT)</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {charter.budgetLines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{line.category}</td>
                        <td className="p-3 text-right font-mono">€{line.approvedDonorCurrency.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono font-bold text-blue-800">৳{line.approvedBdt.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-emerald-700">৳{line.actualSpentBdt.toLocaleString()}</td>
                        <td className="p-3">
                          <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
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

      {/* 4. SECTION 9-11 ACCORDION CARD: REPORTING CALENDAR, RACI & REPOSITORIES */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleAccordion(3)}
          className="w-full p-5 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-left transition"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 font-extrabold text-xs flex items-center justify-center">
              9-11
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Reporting Calendar, RACI Governance Matrix & Document Repository
              </h2>
              <p className="text-xs text-slate-500">Submission deadlines, R/A/C/I roles, and file links</p>
            </div>
          </div>
          {openAccordion === 3 ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>

        {openAccordion === 3 && (
          <div className="p-6 space-y-6 border-t border-slate-100 text-xs">
            {/* RACI Matrix Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Interdepartmental RACI Governance Matrix</h3>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-900 text-white font-extrabold">
                      <th className="p-2.5">Operational Domain</th>
                      <th className="p-2.5 text-center">PD</th>
                      <th className="p-2.5 text-center">PM</th>
                      <th className="p-2.5 text-center">Finance</th>
                      <th className="p-2.5 text-center">Procure</th>
                      <th className="p-2.5 text-center">IT</th>
                      <th className="p-2.5 text-center">Media</th>
                      <th className="p-2.5 text-center">MEAL</th>
                      <th className="p-2.5 text-center">Field</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold">
                    {charter.raci.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2.5 font-semibold text-slate-800">{r.domain}</td>
                        <td className="p-2.5 text-center"><span className={r.pd === 'A' ? 'text-red-600 font-black' : 'text-slate-600'}>{r.pd}</span></td>
                        <td className="p-2.5 text-center"><span className={r.pm === 'R' ? 'text-blue-600 font-black' : 'text-slate-600'}>{r.pm}</span></td>
                        <td className="p-2.5 text-center">{r.finance}</td>
                        <td className="p-2.5 text-center">{r.procure}</td>
                        <td className="p-2.5 text-center">{r.it}</td>
                        <td className="p-2.5 text-center">{r.media}</td>
                        <td className="p-2.5 text-center">{r.meal}</td>
                        <td className="p-2.5 text-center">{r.field}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-500 italic">R = Responsible | A = Accountable | C = Consulted | I = Informed</p>
            </div>
          </div>
        )}
      </div>

      {/* 5. SECTION 12: CHARTER EXECUTIVE AUTHORIZATION SIGN-OFF BLOCK */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" /> Section 12: Executive Charter Authorization Sign-Off
          </h3>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            {charter.signOffs.filter(s => s.signed).length} of {charter.signOffs.length} Signed
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {charter.signOffs.map((sign, idx) => (
            <div 
              key={idx}
              className={`p-4 rounded-xl border space-y-3 transition ${
                sign.signed 
                  ? 'bg-emerald-50/50 border-emerald-300' 
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">{sign.role}</span>
                <span className="font-extrabold text-slate-900">{sign.officerName}</span>
              </div>

              {sign.signed ? (
                <div className="bg-emerald-100/70 p-2 rounded-lg text-emerald-900 font-extrabold text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Signed on {sign.signedAt}
                </div>
              ) : (
                <button
                  onClick={() => handleSignOff(idx)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition"
                >
                  Execute Digital Sign-Off
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
