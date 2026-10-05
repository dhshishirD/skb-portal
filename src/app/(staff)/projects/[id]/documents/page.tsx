'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Download, 
  Upload, 
  ShieldCheck, 
  History, 
  CheckCircle2, 
  Layers, 
  Paperclip, 
  ExternalLink, 
  Sparkles, 
  Plus, 
  Eye, 
  X,
  Building2,
  FolderArchive
} from 'lucide-react';

interface ProjectComplianceDoc {
  id: string;
  name: string;
  category: 'MANDATORY_PRIMARY' | 'SPECIAL_AD_HOC';
  fileSize: string;
  status: 'Submitted' | 'Pending Officer Upload';
  specialReason?: string;
  uploadedBy: string;
  uploadedAt: string;
}

const INITIAL_PROJECT_DOCS: ProjectComplianceDoc[] = [
  { id: '1', name: '1. Form-7 Project Completion Report.pdf', category: 'MANDATORY_PRIMARY', fileSize: '3.2 MB', status: 'Submitted', uploadedBy: 'Mizbah Uddin (Program Officer)', uploadedAt: '2026-09-20 10:15 AM' },
  { id: '2', name: '2. Invoice Declaration.pdf', category: 'MANDATORY_PRIMARY', fileSize: '1.3 MB', status: 'Submitted', uploadedBy: 'Fatema (Finance Manager)', uploadedAt: '2026-09-21 11:30 AM' },
  { id: '3', name: '3. AC Audit Clearance Certificate.pdf', category: 'MANDATORY_PRIMARY', fileSize: '287 KB', status: 'Submitted', uploadedBy: 'External Chartered Auditor', uploadedAt: '2026-09-22 02:45 PM' },
  { id: '4', name: '4. Verified Beneficiary Master List.pdf', category: 'MANDATORY_PRIMARY', fileSize: '438 KB', status: 'Submitted', uploadedBy: 'Auto-Synced from NID Register', uploadedAt: '2026-09-23 09:00 AM' },
  { id: '5', name: '5. Beneficiary NID Cards Archive.pdf', category: 'MANDATORY_PRIMARY', fileSize: '18.6 MB', status: 'Submitted', uploadedBy: 'MD. Emran (Program Officer)', uploadedAt: '2026-09-24 04:10 PM' },
  { id: '6', name: '6. High-Res Picture Documentation Album.docx', category: 'MANDATORY_PRIMARY', fileSize: '15 KB', status: 'Submitted', uploadedBy: 'Mizbah Uddin (Drive Album)', uploadedAt: '2026-09-25 01:20 PM' },
  { id: '7', name: '7. Bank Fund Receival Certificate.pdf', category: 'MANDATORY_PRIMARY', fileSize: '217 KB', status: 'Submitted', uploadedBy: 'Finance Department', uploadedAt: '2026-09-26 11:00 AM' },
  { id: 's1', name: 'Special: Underaged Beneficiary Replacement & Guardian Letter.pdf', category: 'SPECIAL_AD_HOC', fileSize: '2.1 MB', status: 'Submitted', specialReason: 'Beneficiary #14 is an orphan child represented by legal guardian/mother Fatema Begum.', uploadedBy: 'Mizbah Uddin & Legal Officer', uploadedAt: '2026-09-27 03:15 PM' },
  { id: 's2', name: 'Special: Orphan Legal Signature Explanation Certificate.pdf', category: 'SPECIAL_AD_HOC', fileSize: '687 KB', status: 'Submitted', specialReason: 'Requested by donor audit for thumbprint sign-off verification.', uploadedBy: 'Adv. Aminul Islam Bulbul', uploadedAt: '2026-09-28 10:00 AM' },
];

export default function DocumentLibraryPage({ params }: { params: { id: string } }) {
  const projectId = params.id || '1';
  const [docs, setDocs] = useState<ProjectComplianceDoc[]>(INITIAL_PROJECT_DOCS);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [statusToast, setStatusToast] = useState('');

  // Upload Form State
  const [newDocName, setNewDocName] = useState('');
  const [newCategory, setNewCategory] = useState<'MANDATORY_PRIMARY' | 'SPECIAL_AD_HOC'>('MANDATORY_PRIMARY');
  const [newFileSize, setNewFileSize] = useState('1.5 MB');
  const [newSpecialReason, setNewSpecialReason] = useState('');

  const primaryDocs = docs.filter(d => d.category === 'MANDATORY_PRIMARY');
  const specialDocs = docs.filter(d => d.category === 'SPECIAL_AD_HOC');

  const handleUploadDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;

    const created: ProjectComplianceDoc = {
      id: `doc_${Date.now()}`,
      name: newDocName.endsWith('.pdf') || newDocName.endsWith('.docx') ? newDocName : `${newDocName}.pdf`,
      category: newCategory,
      fileSize: newFileSize,
      status: 'Submitted',
      specialReason: newCategory === 'SPECIAL_AD_HOC' ? newSpecialReason : undefined,
      uploadedBy: 'Mizbah Uddin (Program Officer)',
      uploadedAt: new Date().toLocaleString(),
    };

    setDocs([...docs, created]);
    setShowUploadModal(false);
    setNewDocName('');
    setNewSpecialReason('');
    setStatusToast(`File "${created.name}" uploaded successfully! Synced live to /donor-dashboard.`);
    setTimeout(() => setStatusToast(''), 4000);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/projects" className="hover:underline">Projects</Link> &rsaquo;
            <span className="font-semibold text-slate-800">Project Compliance (#{projectId})</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Program Officer Document Submission & Donor Sync Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Upload, auto-generate, and manage project compliance documents. Submitted files immediately synchronize with **skbportal.online/donor-dashboard** for donor review & approval.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/me/report-generator"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-sm hover:from-blue-700 hover:to-indigo-700 transition"
          >
            <Sparkles className="w-4 h-4 text-amber-300" /> Auto-Generate Form-7
          </Link>

          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            <Upload className="w-4 h-4" /> Upload Document
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-1 text-xs font-semibold">
        <Link 
          href={`/projects/${projectId}/kanban`} 
          className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
        >
          📋 Kanban Lifecycle
        </Link>
        <Link 
          href={`/projects/${projectId}/logframe`} 
          className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
        >
          🎯 Logframe Targets
        </Link>
        <Link 
          href={`/projects/${projectId}/tasks`} 
          className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
        >
          📝 Work Plan & Tasks
        </Link>
        <Link 
          href={`/projects/${projectId}/beneficiaries`} 
          className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
        >
          👥 Project Beneficiaries
        </Link>
        <button 
          className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold shadow-sm"
        >
          📂 Documents & Donor Compliance ({docs.length})
        </button>
      </div>

      {/* Live Sync Banner */}
      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-bold text-emerald-950">Live Multi-Tenant Sync Active with International Donor Portal</p>
            <p className="text-[11px] text-emerald-800">
              All documents listed below automatically populate in **Document Inspection** on **skbportal.online/donor-dashboard** for partner audit & sign-off.
            </p>
          </div>
        </div>

        <Link
          href="/donor-dashboard"
          className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1"
        >
          View Live Donor Inspection Hub &rsaquo;
        </Link>
      </div>

      {statusToast && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600" /> {statusToast}
        </div>
      )}

      {/* Section A: Baseline Compliance Documents */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              A. Project Baseline Compliance Documents
            </h2>
            <p className="text-xs text-slate-500">
              Standard submission package required by NGO Affairs Bureau & International Donors.
            </p>
          </div>
          <span className="text-xs bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-full border border-blue-200">
            {primaryDocs.length} / 7 Submitted
          </span>
        </div>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
          {primaryDocs.map((doc) => (
            <div key={doc.id} className="p-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50 transition">
              <div className="flex items-center gap-3 min-w-0">
                <Paperclip className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{doc.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {doc.fileSize} • Uploaded by {doc.uploadedBy} on {doc.uploadedAt}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                  ✓ Submitted to Donor Hub
                </span>

                <Link
                  href="/donor-dashboard"
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg border border-slate-200 transition"
                >
                  <Eye className="w-3 h-3" /> Preview
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section B: Special Project Submissions & Clarifications */}
      <div className="bg-white rounded-2xl border border-purple-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              B. Special Project Submissions & Clarifications
            </h2>
            <p className="text-xs text-slate-500">
              Extra documents submitted for special audit reasons (e.g. Underaged Guardian Representation Letters).
            </p>
          </div>
          <span className="text-xs bg-purple-100 text-purple-900 font-bold px-3 py-1 rounded-full border border-purple-300">
            {specialDocs.length} Special Documents
          </span>
        </div>

        <div className="divide-y divide-purple-100 border border-purple-200 bg-purple-50/20 rounded-xl overflow-hidden text-xs">
          {specialDocs.map((doc) => (
            <div key={doc.id} className="p-3.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Paperclip className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900">{doc.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {doc.fileSize} • Uploaded by {doc.uploadedBy}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] bg-purple-100 text-purple-900 font-bold px-2.5 py-0.5 rounded-full border border-purple-300">
                  ✓ Special Submission Verified
                </span>
              </div>

              {doc.specialReason && (
                <p className="text-[11px] text-purple-950 bg-purple-100/80 p-2.5 rounded-lg italic">
                  Special Reason: &ldquo;{doc.specialReason}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* UPLOAD DOCUMENT MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Upload / Submit Compliance Document
              </h3>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadDocument} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Submission Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 font-semibold"
                >
                  <option value="MANDATORY_PRIMARY">Section A: Primary Mandatory Baseline Document (1-7)</option>
                  <option value="SPECIAL_AD_HOC">Section B: Special Ad-Hoc Request (Guardian/Audit Letter)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Title & File Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Form-7 Project Completion Report.pdf"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              {newCategory === 'SPECIAL_AD_HOC' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Special Reason for Extra Submission</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Beneficiary #14 is an orphan child represented by legal guardian mother..."
                    value={newSpecialReason}
                    onChange={(e) => setNewSpecialReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">File Size</label>
                <input
                  type="text"
                  value={newFileSize}
                  onChange={(e) => setNewFileSize(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-[11px] text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Will be automatically published to the live Donor Hub repository.</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-4 h-4" /> Upload & Sync to Donor Hub
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
