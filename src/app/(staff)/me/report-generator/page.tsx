'use client';

import { useState } from 'react';
import { 
  FileText, 
  Sparkles, 
  Send, 
  Download, 
  CheckCircle2, 
  FileSpreadsheet, 
  ShieldCheck, 
  Calculator, 
  Building2, 
  Plus, 
  Paperclip, 
  Layers,
  ChevronRight,
  Printer
} from 'lucide-react';
import { compileDonorReportPayload } from '@/server/services/reportGenerator';
import Link from 'next/link';

interface VendorQuote {
  vendorName: string;
  itemDescription: string;
  unitPriceBDT: number;
  quantity: number;
  totalBDT: number;
  isSelected: boolean;
}

export default function ReportGeneratorPage() {
  const [activeTab, setActiveTab] = useState<'form7' | 'budget3' | 'vault'>('form7');
  
  // Form-7 State
  const [pidNumber, setPidNumber] = useState('PID 22211');
  const [projectName, setProjectName] = useState('IGP in Bangladesh 2025 (Cows, Goats & Sewing Machines)');
  const [donorName, setDonorName] = useState('IHH Humanitarian Relief Foundation');
  const [fundReceivalAmount, setFundReceivalAmount] = useState('7,085 EURO (৳921,050 BDT)');
  const [reportingPeriod, setReportingPeriod] = useState('2025-2026');
  const [form7Generated, setForm7Generated] = useState(false);

  // 3-Proposal Budget State
  const [quotes, setQuotes] = useState<VendorQuote[]>([
    { vendorName: 'Sylhet Cattle & Livestock Supplier', itemDescription: 'Healthy Local Dairy Cows (20 Units)', unitPriceBDT: 45000, quantity: 20, totalBDT: 900000, isSelected: true },
    { vendorName: 'Kurigram Agro Farm Ltd.', itemDescription: 'Local Dairy Cows (20 Units)', unitPriceBDT: 48000, quantity: 20, totalBDT: 960000, isSelected: false },
    { vendorName: 'Bengal Livestock Trading', itemDescription: 'Dairy Cows (20 Units)', unitPriceBDT: 47500, quantity: 20, totalBDT: 950000, isSelected: false },
  ]);
  const [selectedVendorIndex, setSelectedVendorIndex] = useState(0);

  // 9-Document Compliance Package State
  const [compliancePackage] = useState([
    { id: '1', fileName: `1. Form -7 on IGP Bangladesh 2025 (${pidNumber}).pdf`, size: '3.2 MB', status: 'Generated & Verified' },
    { id: '2', fileName: `2. Invoice Declaration (${pidNumber}).pdf`, size: '1.3 MB', status: 'Signed & Sealed' },
    { id: '3', fileName: `3. AC Declaration (${pidNumber}).pdf`, size: '287 KB', status: 'Audit Cleared' },
    { id: '4', fileName: `4.1. Beneficiary list (${pidNumber}).pdf`, size: '438 KB', status: 'NID Deduplicated' },
    { id: '5', fileName: `4.2.12 Beneficiary NID (${pidNumber}).pdf`, size: '18.6 MB', status: 'ID Cards Archived' },
    { id: '6', fileName: `4.3. Underaged beneficiary replacement (${pidNumber}).pdf`, size: '2.1 MB', status: 'Guardian Signed' },
    { id: '7', fileName: `5. ${pidNumber} Picture Link.docx`, size: '15 KB', status: 'Drive Album Linked' },
    { id: '8', fileName: `Explanation regarding orphan's signature on distribution list (${pidNumber}).pdf`, size: '687 KB', status: 'Legal Approved' },
    { id: '9', fileName: `Fund Receival (${pidNumber}) 7085 EURO.pdf`, size: '217 KB', status: 'Bank Confirmed' },
  ]);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <Link href="/dashboard" className="hover:underline">HQ Staff Workspace</Link> &rsaquo;
          <span className="font-semibold text-slate-800">Donor Reporting & Compliance Vault</span>
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Official Donor Form-7 & 3-Proposal Budget Environment
        </h1>
        <p className="text-xs text-slate-500">
          Auto-generate official **Form-7 Reports**, compare **3-Proposal Procurement Budgets**, and compile the **9-Document Compliance Submission Package**.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        <button
          onClick={() => setActiveTab('form7')}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'form7' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" /> 1. Official Form-7 Exporter
        </button>

        <button
          onClick={() => setActiveTab('budget3')}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'budget3' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calculator className="w-4 h-4" /> 2. 3-Proposal Proposed Budget Tool
        </button>

        <button
          onClick={() => setActiveTab('vault')}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'vault' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" /> 3. Standard 9-File Compliance Vault
        </button>
      </div>

      {/* TAB 1: FORM-7 EXPORTER */}
      {activeTab === 'form7' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" /> Form-7 Project Completion Generator
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">PID Number</label>
                <input
                  type="text"
                  value={pidNumber}
                  onChange={(e) => setPidNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Project Title</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Donor Organization Partner</label>
                <input
                  type="text"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fund Received Amount & Currency</label>
                <input
                  type="text"
                  value={fundReceivalAmount}
                  onChange={(e) => setFundReceivalAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-emerald-700"
                />
              </div>

              <button
                onClick={() => setForm7Generated(true)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Auto-Generate Form-7 Official PDF Report
              </button>
            </div>
          </div>

          {/* Form-7 Preview Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Form-7 Official Output Document</h2>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                Standard NGO Bureau & IHH Format
              </span>
            </div>

            {form7Generated ? (
              <div className="space-y-4 text-xs">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between font-mono text-[11px] font-bold text-blue-600">
                    <span>FORM-7 PROJECT COMPLETION REPORT</span>
                    <span>{pidNumber}</span>
                  </div>
                  <p className="font-extrabold text-slate-900 text-sm">{projectName}</p>
                  <p className="text-slate-600">Donor Partner: {donorName}</p>
                  <p className="text-emerald-700 font-bold">Total Fund Receival: {fundReceivalAmount}</p>

                  <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <p className="font-bold text-slate-800">Verified Verification Sections Included:</p>
                    <p>✓ Section I: Organization & Executive Signatures</p>
                    <p>✓ Section II: Beneficiary Master Register & NID Check</p>
                    <p>✓ Section III: Invoice & Audit Clearance Declaration</p>
                    <p>✓ Section IV: Guardian / Orphan Signature Explanations</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" /> Download Form-7 (.pdf)
                  </button>
                  <button className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2">
                    <Printer className="w-4 h-4" /> Print PDF Report
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-300 p-8 text-center rounded-xl space-y-2">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">Click &quot;Auto-Generate Form-7&quot; to compile official PDF format.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: 3-PROPOSAL PROPOSED BUDGET TOOL */}
      {activeTab === 'budget3' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-600" /> 3-Proposal Proposed Budget & Quotation Calculator
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Donors require 3 competitive vendor quotations before proposed budget approval.
              </p>
            </div>
            <span className="text-xs bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-full border border-blue-200">
              Procurement Rule: Lowest Price Selected
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quotes.map((q, idx) => (
              <div 
                key={idx}
                className={`p-4 rounded-xl border transition-all space-y-3 ${
                  selectedVendorIndex === idx
                    ? 'bg-blue-50/60 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                    Proposal {idx + 1}
                  </span>
                  {selectedVendorIndex === idx && (
                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                      ✓ Winning Quote
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-xs font-extrabold text-slate-900">{q.vendorName}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{q.itemDescription}</p>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 text-xs space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Unit Price:</span>
                    <span className="font-mono font-bold">৳{q.unitPriceBDT.toLocaleString()} BDT</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Quantity:</span>
                    <span className="font-bold">{q.quantity}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-100">
                    <span>Total Proposed:</span>
                    <span className="font-mono text-emerald-700">৳{q.totalBDT.toLocaleString()} BDT</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedVendorIndex(idx)}
                  className={`w-full py-2 text-xs font-bold rounded-lg transition-all ${
                    selectedVendorIndex === idx
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  {selectedVendorIndex === idx ? 'Selected for Donor Proposal' : 'Select Proposal'}
                </button>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-slate-900">3-Proposal Procurement Comparison Summary</p>
              <p className="text-slate-500">Selected Vendor: <strong>{quotes[selectedVendorIndex].vendorName}</strong> (Savings: ৳60,000 BDT vs highest proposal)</p>
            </div>
            <button className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export 3-Proposal Budget Comparison Table (.pdf)
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: 9-FILE COMPLIANCE VAULT */}
      {activeTab === 'vault' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" /> SKB 9-File Donor Compliance Package Vault
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete submission package for {pidNumber} matching your official Google Drive audit folder.
              </p>
            </div>
            <button className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Download All 9 Files (.zip)
            </button>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-xs">
            {compliancePackage.map((file) => (
              <div key={file.id} className="p-3.5 hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Paperclip className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900">{file.fileName}</p>
                    <p className="text-[10px] text-slate-500">{file.size} • Verified Format</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
                    ✓ {file.status}
                  </span>
                  <button className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
