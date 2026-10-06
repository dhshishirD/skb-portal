'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Download, 
  Upload, 
  ShieldCheck, 
  CheckCircle2, 
  ExternalLink, 
  Sparkles, 
  Trash2, 
  Eye, 
  X,
  FolderArchive,
  FileCheck2,
  FileUp,
  Clock,
  UserCheck
} from 'lucide-react';
import { getDefaultClosingAudit, ClosingReportWorkingPaper } from '@/server/services/projectClosingAuditService';

export interface ProjectComplianceDoc {
  id: string;
  projectId: string;
  name: string;
  category: 'MANDATORY_PRIMARY' | 'SPECIAL_AD_HOC';
  auditDomainTag?: 'Domain A' | 'Domain B' | 'Domain C' | 'Domain D';
  fileSize: string;
  fileType: string;
  fileDataUrl?: string;
  status: 'Submitted' | 'Pending Officer Upload';
  specialReason?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export default function DocumentLibraryPage({ params }: { params: { id: string } }) {
  const projectId = params.id || '1791270873958';
  const [docs, setDocs] = useState<ProjectComplianceDoc[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [statusToast, setStatusToast] = useState('');

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newDocName, setNewDocName] = useState('');
  const [newCategory, setNewCategory] = useState<'MANDATORY_PRIMARY' | 'SPECIAL_AD_HOC'>('MANDATORY_PRIMARY');
  const [newAuditDomain, setNewAuditDomain] = useState<'Domain A' | 'Domain B' | 'Domain C' | 'Domain D'>('Domain A');
  const [newFileSize, setNewFileSize] = useState('');
  const [newSpecialReason, setNewSpecialReason] = useState('');
  const [previewDoc, setPreviewDoc] = useState<ProjectComplianceDoc | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`skb_documents_${projectId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setDocs(parsed);
          }
        } catch (e) {
          console.error('Failed to load documents', e);
        }
      }
    }
  }, [projectId]);

  const saveDocuments = (updatedDocs: ProjectComplianceDoc[]) => {
    setDocs(updatedDocs);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`skb_documents_${projectId}`, JSON.stringify(updatedDocs));
      
      // Also update global all-documents vault for real-time donor dashboard sync
      const globalSaved = localStorage.getItem('skb_portal_all_documents');
      let globalList: ProjectComplianceDoc[] = [];
      if (globalSaved) {
        try {
          globalList = JSON.parse(globalSaved);
        } catch (e) {
          globalList = [];
        }
      }
      const otherDocs = globalList.filter(d => d.projectId !== projectId);
      const combined = [...otherDocs, ...updatedDocs];
      localStorage.setItem('skb_portal_all_documents', JSON.stringify(combined));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!newDocName.trim()) {
        setNewDocName(file.name);
      }
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const sizeKB = (file.size / 1024).toFixed(0);
      setNewFileSize(file.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`);

      // Read as DataURL for real browser preview & download
      const reader = new FileReader();
      reader.onload = (event) => {
        (file as any).dataUrl = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim() && !selectedFile) return;

    const fileName = selectedFile ? selectedFile.name : (newDocName.includes('.') ? newDocName : `${newDocName}.pdf`);
    const fileDataUrl = (selectedFile as any)?.dataUrl || `data:text/plain;charset=utf-8,SKB Official Document Content for ${fileName}`;

    const created: ProjectComplianceDoc = {
      id: `doc_${Date.now()}`,
      projectId,
      name: fileName,
      category: newCategory,
      auditDomainTag: newAuditDomain,
      fileSize: newFileSize || '1.2 MB',
      fileType: selectedFile ? selectedFile.type || 'application/pdf' : 'application/pdf',
      fileDataUrl,
      status: 'Submitted',
      specialReason: newCategory === 'SPECIAL_AD_HOC' ? newSpecialReason : undefined,
      uploadedBy: 'Mizbah Uddin (Program Officer)',
      uploadedAt: new Date().toLocaleString(),
    };

    const updated = [created, ...docs];
    saveDocuments(updated);

    // Auto-update Closing Audit Working Paper domain parameter if domain tag is provided
    if (typeof window !== 'undefined') {
      const savedAudit = localStorage.getItem(`skb_closing_audit_${projectId}`);
      let auditPaper: ClosingReportWorkingPaper = savedAudit ? JSON.parse(savedAudit) : getDefaultClosingAudit(projectId);
      
      if (newAuditDomain === 'Domain A') {
        auditPaper.domainA_financial = auditPaper.domainA_financial.map(i => ({ ...i, status: 'Compliant' }));
      } else if (newAuditDomain === 'Domain B') {
        auditPaper.domainB_safeguarding = auditPaper.domainB_safeguarding.map(i => ({ ...i, status: 'Compliant' }));
      } else if (newAuditDomain === 'Domain C') {
        auditPaper.domainC_timeline = auditPaper.domainC_timeline.map(i => ({ ...i, status: 'Compliant' }));
      } else if (newAuditDomain === 'Domain D') {
        auditPaper.domainD_media = auditPaper.domainD_media.map(i => ({ ...i, status: 'Compliant' }));
      }

      localStorage.setItem(`skb_closing_audit_${projectId}`, JSON.stringify(auditPaper));
    }

    setShowUploadModal(false);
    setSelectedFile(null);
    setNewDocName('');
    setNewSpecialReason('');
    setStatusToast(`File "${created.name}" uploaded successfully & synced real-time to Donor Portal!`);
    setTimeout(() => setStatusToast(''), 4000);
  };

  const handleDeleteDocument = (docId: string, docName: string) => {
    if (confirm(`Are you sure you want to remove document "${docName}"?`)) {
      const updated = docs.filter(d => d.id !== docId);
      saveDocuments(updated);
      setStatusToast(`Document "${docName}" removed from portal library.`);
      setTimeout(() => setStatusToast(''), 3000);
    }
  };

  const handleDownloadFile = (doc: ProjectComplianceDoc) => {
    const link = document.createElement('a');
    link.href = doc.fileDataUrl || `data:text/plain;charset=utf-8,SKB Official Document Content for ${doc.name}`;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setStatusToast(`Downloaded file "${doc.name}"!`);
    setTimeout(() => setStatusToast(''), 3000);
  };

  const primaryDocs = docs.filter(d => d.category === 'MANDATORY_PRIMARY');
  const specialDocs = docs.filter(d => d.category === 'SPECIAL_AD_HOC');

  return (
    <div className="space-y-6 pb-10 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Program Officer Document Submission & Donor Sync Workspace
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Upload, inspect, and manage compliance files. Submitted documents synchronize **real-time** with **skbportal.online/donor-dashboard**.
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

      {/* Real-time Multi-Tenant Sync Banner */}
      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <span className="font-extrabold text-emerald-950">Live Multi-Tenant Sync Active with International Donor Portal</span>
            <p className="text-[11px] text-emerald-800">
              All documents uploaded below automatically populate in &ldquo;Document Inspection&rdquo; on <strong>skbportal.online/donor-dashboard</strong> for partner audit &amp; sign-off.
            </p>
          </div>
        </div>

        <Link
          href="/donor-dashboard"
          target="_blank"
          className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-sm transition"
        >
          View Live Partner Inspection Portal <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {statusToast && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          {statusToast}
        </div>
      )}

      {/* SECTION A: Primary Baseline Compliance Documents */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FolderArchive className="w-5 h-5 text-blue-600" />
              A. Project Baseline Compliance Documents
            </h3>
            <p className="text-xs text-slate-500">
              Standard submission package required by NGO Affairs Bureau &amp; International Donors.
            </p>
          </div>
          <span className="text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full font-mono">
            {primaryDocs.length} Submitted
          </span>
        </div>

        {primaryDocs.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {primaryDocs.map((doc) => (
              <div key={doc.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 p-2 rounded-xl transition">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shrink-0">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-extrabold text-slate-900">{doc.name}</h4>
                      {doc.auditDomainTag && (
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
                          {doc.auditDomainTag}
                        </span>
                      )}
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                        {doc.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                      <span>Size: <strong className="text-slate-700">{doc.fileSize}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><UserCheck className="w-3 h-3 text-blue-600" /> {doc.uploadedBy}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" /> {doc.uploadedAt}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                    title="Inspect Document"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600" /> Inspect
                  </button>
                  <button
                    onClick={() => handleDownloadFile(doc)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(doc.id, doc.name)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                    title="Delete Document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
            <FileUp className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-xs font-bold text-slate-800">No Baseline Primary Compliance Documents Uploaded</h4>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Click &ldquo;Upload Document&rdquo; above to attach Form-7, Invoice Declarations, or Audit certificates.
            </p>
          </div>
        )}
      </div>

      {/* SECTION B: Special Project Submissions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
              B. Special Project Submissions &amp; Clarifications
            </h3>
            <p className="text-xs text-slate-500">
              Extra documents submitted for special audit reasons (e.g., Underaged Guardian Representation Letters).
            </p>
          </div>
          <span className="text-xs font-extrabold bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-full font-mono">
            {specialDocs.length} Special Documents
          </span>
        </div>

        {specialDocs.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {specialDocs.map((doc) => (
              <div key={doc.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 p-2 rounded-xl transition">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100 shrink-0">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-extrabold text-slate-900">{doc.name}</h4>
                      {doc.auditDomainTag && (
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
                          {doc.auditDomainTag}
                        </span>
                      )}
                    </div>
                    {doc.specialReason && (
                      <p className="text-[11px] text-purple-700 font-medium italic mt-0.5">
                        Note: {doc.specialReason}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                      <span>Size: <strong className="text-slate-700">{doc.fileSize}</strong></span>
                      <span>•</span>
                      <span>{doc.uploadedBy}</span>
                      <span>•</span>
                      <span>{doc.uploadedAt}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDownloadFile(doc)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(doc.id, doc.name)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                    title="Delete Document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
            <FolderArchive className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-xs font-bold text-slate-800">No Special Ad-Hoc Audit Documents</h4>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Special audit letters (e.g. underaged orphan beneficiary explanations) will display here.
            </p>
          </div>
        )}
      </div>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Upload Project Compliance Document
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadDocument} className="space-y-4 text-xs">
              {/* Native Drag & Drop / File Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Select Document File (PDF, DOCX, XLSX, JPG, PNG, ZIP)</label>
                <div className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/30 rounded-xl p-4 text-center cursor-pointer transition">
                  <input
                    type="file"
                    required
                    onChange={handleFileChange}
                    className="hidden"
                    id="real-file-upload-input"
                  />
                  <label htmlFor="real-file-upload-input" className="cursor-pointer block space-y-1">
                    <FileUp className="w-7 h-7 text-blue-600 mx-auto" />
                    <span className="block font-bold text-blue-700">
                      {selectedFile ? selectedFile.name : 'Click or Drag File Here to Upload'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {selectedFile ? `Size: ${newFileSize} | Type: ${selectedFile.type || 'Document'}` : 'Supports official PDF, Word, Excel, Images, ZIP files up to 50MB'}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Display Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Form-7 Compliance Package 2026.pdf or SWIFT Voucher.pdf"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Compliance Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition font-medium"
                  >
                    <option value="MANDATORY_PRIMARY">Primary Baseline Package</option>
                    <option value="SPECIAL_AD_HOC">Special Ad-Hoc Submission</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Audit Domain Tag</label>
                  <select
                    value={newAuditDomain}
                    onChange={(e) => setNewAuditDomain(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition font-medium"
                  >
                    <option value="Domain A">Domain A: Financial & SWIFT</option>
                    <option value="Domain B">Domain B: Safeguarding & NID</option>
                    <option value="Domain C">Domain C: Timeline & AC Date</option>
                    <option value="Domain D">Domain D: Media & Photo Vault</option>
                  </select>
                </div>
              </div>

              {newCategory === 'SPECIAL_AD_HOC' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Special Audit Reason / Clarification</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Explanation for underaged orphan beneficiary legal guardian signature"
                    value={newSpecialReason}
                    onChange={(e) => setNewSpecialReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" /> Upload &amp; Sync Live
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECTION MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                Document Verification &amp; Inspection
              </h3>
              <button onClick={() => setPreviewDoc(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-900">{previewDoc.name}</span>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono">
                  {previewDoc.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>Category: <strong className="text-slate-900">{previewDoc.category}</strong></div>
                <div>Audit Domain: <strong className="text-slate-900">{previewDoc.auditDomainTag || 'N/A'}</strong></div>
                <div>File Size: <strong className="text-slate-900">{previewDoc.fileSize}</strong></div>
                <div>Uploaded By: <strong className="text-slate-900">{previewDoc.uploadedBy}</strong></div>
              </div>
              <div className="pt-2 border-t border-slate-200 text-slate-500 text-[11px]">
                Timestamp: <strong>{previewDoc.uploadedAt}</strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadFile(previewDoc)}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Download Official File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
