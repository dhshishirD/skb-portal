'use client';

import { useState } from 'react';
import { FileText, Download, Upload, ShieldCheck, History } from 'lucide-react';
import Link from 'next/link';

interface DocItem {
  id: string;
  title: string;
  category: string;
  versionNo: number;
  fileSize: string;
  uploadedBy: string;
  uploadedAt: string;
}

const MOCK_DOCS: DocItem[] = [
  { id: '1', title: 'Grant Agreement - USAID Coastal Climate', category: 'grant_agreement', versionNo: 2, fileSize: '2.4 MB', uploadedBy: 'Fatema Finance Manager', uploadedAt: '2026-09-20' },
  { id: '2', title: 'Q2 Field Progress Report & Photo Log', category: 'field_report', versionNo: 1, fileSize: '4.8 MB', uploadedBy: 'Karim Field Officer', uploadedAt: '2026-09-22' },
  { id: '3', title: 'Mangrove Sapling Procurement Contract', category: 'procurement', versionNo: 1, fileSize: '1.1 MB', uploadedBy: 'Kamal Procurement Specialist', uploadedAt: '2026-09-24' },
];

export default function DocumentLibraryPage({ params }: { params: { id: string } }) {
  const [docs] = useState<DocItem[]>(MOCK_DOCS);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:underline">Projects</Link> &rsaquo;
            <span className="font-semibold text-slate-800">P1-CLIMATE</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Project Document Library
          </h1>
          <p className="text-xs text-slate-500">
            Secure, version-controlled document repository served via short-lived signed URLs.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-sm">
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Document Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Uploaded By</th>
                <th className="px-4 py-3 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">{doc.title}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {doc.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-blue-600">v{doc.versionNo}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono">{doc.fileSize}</td>
                  <td className="px-4 py-3 text-slate-700">{doc.uploadedBy}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-xs rounded-lg transition-colors">
                      <Download className="w-3.5 h-3.5" /> Signed Link
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
