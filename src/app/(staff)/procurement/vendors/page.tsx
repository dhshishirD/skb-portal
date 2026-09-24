'use client';

import { useState } from 'react';
import { Store, ShieldAlert, CheckCircle2, UserX } from 'lucide-react';
import Link from 'next/link';

interface VendorItem {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  isBlacklisted: boolean;
  blacklistReason?: string;
}

const MOCK_VENDORS: VendorItem[] = [
  { id: 'v1', name: 'Teknaf Nursery Supplies Ltd', contactPerson: 'Jamal Uddin', phone: '01711002233', isBlacklisted: false },
  { id: 'v2', name: 'Coastal Agro Traders', contactPerson: 'Hassan Ali', phone: '01811445566', isBlacklisted: false },
  { id: 'v3', name: 'Blacklisted Supplies Inc', contactPerson: 'Unknown', phone: '01911999999', isBlacklisted: true, blacklistReason: 'Fraudulent quotation prices' },
];

export default function VendorsPage() {
  const [vendors, setVendors] = useState<VendorItem[]>(MOCK_VENDORS);

  const toggleBlacklist = (id: string) => {
    setVendors((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, isBlacklisted: !v.isBlacklisted, blacklistReason: !v.isBlacklisted ? 'Administrative flag' : undefined } : v
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:underline">Procurement</Link> &rsaquo;
            <span className="font-semibold text-slate-800">Vendors</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-600" />
            Vendor Registry & Blacklist Management
          </h1>
          <p className="text-xs text-slate-500">
            Maintain approved vendor directory and enforce system-wide blacklist flags.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Vendor Name</th>
                <th className="px-4 py-3">Contact Person</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendors.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">{v.name}</td>
                  <td className="px-4 py-3 text-slate-700">{v.contactPerson}</td>
                  <td className="px-4 py-3 font-mono text-slate-500">{v.phone}</td>
                  <td className="px-4 py-3">
                    {v.isBlacklisted ? (
                      <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-200">
                        <ShieldAlert className="w-3 h-3 text-red-600" /> Blacklisted ({v.blacklistReason})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-medium border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved Vendor
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleBlacklist(v.id)}
                      className={`px-3 py-1 text-[11px] rounded-lg font-medium transition-colors ${
                        v.isBlacklisted
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                          : 'bg-red-50 hover:bg-red-100 text-red-700'
                      }`}
                    >
                      {v.isBlacklisted ? 'Remove Blacklist' : 'Blacklist Vendor'}
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
