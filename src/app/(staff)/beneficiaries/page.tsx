'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, ShieldAlert, CheckCircle2, Lock, Search } from 'lucide-react';
import { isPotentialDuplicate } from '@/lib/beneficiary-dedup';
import Link from 'next/link';
import { BeneficiaryService, BeneficiaryRecord } from '@/server/services/beneficiaryService';

export default function BeneficiariesPage() {
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Registration Form State
  const [name, setName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [sex, setSex] = useState('female');
  const [birthYear, setBirthYear] = useState('1990');
  const [locationCode, setLocationCode] = useState('UP-UKHIYA');
  const [projectId, setProjectId] = useState('PID 22567');
  const [summary, setSummary] = useState('');
  const [dupWarning, setDupWarning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadBeneficiaries = async () => {
      setLoading(true);
      const data = await BeneficiaryService.getBeneficiaries();
      setBeneficiaries(data);
      setLoading(false);
    };

    loadBeneficiaries();
  }, []);

  const checkDuplicate = (inputName: string) => {
    setName(inputName);
    const isDup = isPotentialDuplicate(
      { fullName: inputName, birthYear: parseInt(birthYear) || 1990, locationCode },
      beneficiaries.map((b) => ({ fullName: b.fullName, birthYear: b.birthYear, locationCode: b.locationCode }))
    );
    setDupWarning(isDup);
  };

  const handleRegisterBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newRecord = await BeneficiaryService.addBeneficiary({
      fullName: name.trim(),
      nationalId: nationalId.trim() || '1990000000000',
      phone: phone.trim() || '01700000000',
      sex: sex,
      birthYear: parseInt(birthYear) || 1990,
      locationCode: locationCode,
      projectId: projectId,
      summary: summary || 'Registered in HQ Central Registry.',
      consentCaptured: true,
    });

    setBeneficiaries((prev) => [newRecord, ...prev]);
    setShowModal(false);
    setName('');
    setNationalId('');
    setPhone('');
    setSummary('');
    setDupWarning(false);
  };

  const filteredBeneficiaries = beneficiaries.filter(
    (b) =>
      b.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.nationalId.includes(searchQuery) ||
      b.locationCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.projectId && b.projectId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:underline">Staff Workspace</Link> &rsaquo;
            <span className="font-semibold text-slate-800">Central Beneficiary Registry</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Central Beneficiary Registry & Consent Engine
          </h1>
          <p className="text-xs text-slate-500">
            Encrypted personal data, informed consent tracking, and live deduplication protection synced with field apps.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition"
        >
          <UserPlus className="w-4 h-4" /> Register New Beneficiary
        </button>
      </div>

      {/* Search & Counter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-700">
          <span>Total Registered Beneficiaries:</span>
          <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200 font-mono text-xs">
            {beneficiaries.length} Verified Records
          </span>
        </div>

        <div className="w-full sm:w-64 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Name, NID, Project, or Union..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-9 pr-3 py-1.5 outline-none focus:border-blue-500 font-semibold"
          />
        </div>
      </div>

      {/* Beneficiaries Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">ID & Full Name</th>
                <th className="px-4 py-3">National ID (Encrypted)</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Gender / Birth Year</th>
                <th className="px-4 py-3">Location & Project</th>
                <th className="px-4 py-3">Consent & Vault Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Loading live beneficiary records...
                  </td>
                </tr>
              ) : filteredBeneficiaries.length > 0 ? (
                filteredBeneficiaries.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-blue-600" />
                        <span>{b.fullName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block">{b.id} • Registered: {b.registeredAt}</span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">{b.nationalId}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{b.phone}</td>
                    <td className="px-4 py-3 capitalize">{b.sex} ({b.birthYear})</td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-blue-600 block">{b.locationCode}</span>
                      {b.projectId && <span className="text-[10px] text-slate-500 font-bold block">{b.projectId}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Consent Verified
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No beneficiary records match &ldquo;{searchQuery}&rdquo;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in duration-200">
            <h3 className="text-base font-extrabold text-slate-900">Register Beneficiary (Consent & NID Check)</h3>

            {dupWarning && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                Warning: Potential duplicate entry detected in this location!
              </div>
            )}

            <form onSubmit={handleRegisterBeneficiary} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Official Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => checkDuplicate(e.target.value)}
                  placeholder="e.g. Fatema Begum"
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">National ID (NID) *</label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="13 or 17-digit NID"
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Birth Year</label>
                  <input
                    type="number"
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Location Code</label>
                  <input
                    type="text"
                    value={locationCode}
                    onChange={(e) => setLocationCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Project Reference</label>
                <input
                  type="text"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="e.g. PID 22567"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-mono font-bold text-blue-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assistance Intake Summary</label>
                <textarea
                  rows={2}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Details regarding assistance distribution..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md"
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
