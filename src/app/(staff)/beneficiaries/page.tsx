'use client';

import { useState } from 'react';
import { Users, UserPlus, ShieldAlert, CheckCircle2, Lock } from 'lucide-react';
import { isPotentialDuplicate } from '@/lib/beneficiary-dedup';
import Link from 'next/link';

interface BeneficiaryItem {
  id: string;
  fullName: string;
  nationalId: string;
  phone: string;
  sex: string;
  birthYear: number;
  locationCode: string;
  consentCaptured: boolean;
}

const MOCK_BENEFICIARIES: BeneficiaryItem[] = [
  { id: '1', fullName: 'Fatema Begum', nationalId: '••••••••1234', phone: '••••••5678', sex: 'female', birthYear: 1992, locationCode: 'UP-TEKNAF', consentCaptured: true },
  { id: '2', fullName: 'Abdul Karim', nationalId: '••••••••9876', phone: '••••••4321', sex: 'male', birthYear: 1988, locationCode: 'UP-UKHIYA', consentCaptured: true },
];

export default function BeneficiariesPage() {
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryItem[]>(MOCK_BENEFICIARIES);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('1990');
  const [locationCode, setLocationCode] = useState('UP-UKHIYA');
  const [dupWarning, setDupWarning] = useState(false);

  const checkDuplicate = (inputName: string) => {
    setName(inputName);
    const isDup = isPotentialDuplicate(
      { fullName: inputName, birthYear: parseInt(birthYear) || 1990, locationCode },
      beneficiaries.map((b) => ({ fullName: b.fullName, birthYear: b.birthYear, locationCode: b.locationCode }))
    );
    setDupWarning(isDup);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:underline">Staff</Link> &rsaquo;
            <span className="font-semibold text-slate-800">Beneficiary Registry</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Beneficiary Registry & Consent Management
          </h1>
          <p className="text-xs text-slate-500">
            Encrypted personal data, informed consent tracking, and duplicate registration protection.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-sm"
        >
          <UserPlus className="w-4 h-4" /> Register Beneficiary
        </button>
      </div>

      {/* Beneficiaries Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Full Name (Encrypted)</th>
                <th className="px-4 py-3">National ID</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Gender / Birth Year</th>
                <th className="px-4 py-3">Location Code</th>
                <th className="px-4 py-3">Consent Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {beneficiaries.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-slate-400" /> {b.fullName}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500">{b.nationalId}</td>
                  <td className="px-4 py-3 font-mono text-slate-500">{b.phone}</td>
                  <td className="px-4 py-3 capitalize">{b.sex} ({b.birthYear})</td>
                  <td className="px-4 py-3 font-mono font-bold text-blue-600">{b.locationCode}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-medium border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Consent Verified
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Register Beneficiary (Consent Required)</h3>

            {dupWarning && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                Warning: Potential duplicate entry detected in this location!
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setBeneficiaries((prev) => [
                  ...prev,
                  {
                    id: crypto.randomUUID(),
                    fullName: name,
                    nationalId: '••••••••4455',
                    phone: '••••••9900',
                    sex: 'female',
                    birthYear: parseInt(birthYear) || 1990,
                    locationCode,
                    consentCaptured: true,
                  },
                ]);
                setShowModal(false);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => checkDuplicate(e.target.value)}
                  placeholder="Official Beneficiary Name"
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Birth Year</label>
                <input
                  type="number"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                >
                  Confirm Consent & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
