'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  MapPin, 
  CheckCircle2, 
  FolderKanban, 
  Search,
  Lock,
  Plus
} from 'lucide-react';

interface BeneficiaryRecord {
  id: string;
  fullName: string;
  nidMasked: string;
  phoneMasked: string;
  genderYear: string;
  locationCode: string;
  consentVerified: boolean;
}

const INITIAL_BENEFICIARIES: BeneficiaryRecord[] = [
  {
    id: 'b1',
    fullName: 'Fatema Begum',
    nidMasked: '********1234',
    phoneMasked: '******5678',
    genderYear: 'Female (1992)',
    locationCode: 'UP-TEKNAF-01',
    consentVerified: true
  },
  {
    id: 'b2',
    fullName: 'Abdul Karim',
    nidMasked: '********9876',
    phoneMasked: '******4321',
    genderYear: 'Male (1988)',
    locationCode: 'UP-UKHIYA-04',
    consentVerified: true
  },
  {
    id: 'b3',
    fullName: 'Rashida Sultana',
    nidMasked: '********5543',
    phoneMasked: '******8890',
    genderYear: 'Female (1995)',
    locationCode: 'UP-KURIGRAM-02',
    consentVerified: true
  }
];

export default function ProjectBeneficiariesPage({ params }: { params: { id: string } }) {
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryRecord[]>(INITIAL_BENEFICIARIES);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [nid, setNid] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('Female');
  const [birthYear, setBirthYear] = useState('1996');
  const [upazila, setUpazila] = useState('Teknaf Upazila');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: BeneficiaryRecord = {
      id: `b_${Date.now()}`,
      fullName: name,
      nidMasked: nid.length > 4 ? `********${nid.slice(-4)}` : '********7788',
      phoneMasked: phone.length > 4 ? `******${phone.slice(-4)}` : '******9911',
      genderYear: `${gender} (${birthYear})`,
      locationCode: upazila.toUpperCase().replace(/\s+/g, '-'),
      consentVerified: true
    };

    setBeneficiaries([newRecord, ...beneficiaries]);
    setShowRegisterModal(false);
    setStatusMsg(`Beneficiary ${name} successfully registered for this project! NID consent verified.`);
    setName('');
    setNid('');
    setPhone('');
  };

  const filtered = beneficiaries.filter(b => 
    b.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.locationCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/projects" className="hover:underline text-blue-600 font-semibold">Projects</Link>
            <span>&rsaquo;</span>
            <span>Project {params.id}</span>
            <span>&rsaquo;</span>
            <span className="font-bold text-slate-900">Beneficiaries</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Project Beneficiary Register & Consent Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Encrypted personal records, NID duplicate protection, and consent logs for Project #{params.id}.
          </p>
        </div>

        <button
          onClick={() => setShowRegisterModal(true)}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition"
        >
          <UserPlus className="w-4 h-4" />
          Register New Beneficiary
        </button>
      </div>

      {/* Project Navigation Sub-Tabs Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-2 text-xs font-semibold">
        <Link 
          href={`/projects/${params.id}/kanban`}
          className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
        >
          📋 Kanban Lifecycle
        </Link>
        <Link 
          href={`/projects/${params.id}/logframe`}
          className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
        >
          🎯 Logframe Targets
        </Link>
        <Link 
          href={`/projects/${params.id}/tasks`}
          className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
        >
          📝 Work Plan & Tasks
        </Link>
        <Link 
          href={`/projects/${params.id}/beneficiaries`}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white shadow-sm transition"
        >
          👥 Project Beneficiaries ({beneficiaries.length})
        </Link>
        <Link 
          href={`/projects/${params.id}/documents`}
          className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
        >
          📄 Documents
        </Link>
      </div>

      {statusMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {statusMsg}
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search beneficiary name or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Lock className="w-3.5 h-3.5 text-blue-600" />
          <span>Column Encryption Active</span>
        </div>
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
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {b.fullName}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-700">{b.nidMasked}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">{b.phoneMasked}</td>
                  <td className="px-4 py-3">{b.genderYear}</td>
                  <td className="px-4 py-3 font-semibold text-blue-600">{b.locationCode}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Consent Verified
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Beneficiary Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              Register Project Beneficiary
            </h3>

            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Official Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahima Khatun"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">National ID (10/17 Digits)</label>
                <input
                  type="text"
                  required
                  placeholder="199215167..."
                  value={nid}
                  onChange={(e) => setNid(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Birth Year</label>
                  <input
                    type="text"
                    required
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="01712..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Upazila / Location</label>
                <input
                  type="text"
                  required
                  value={upazila}
                  onChange={(e) => setUpazila(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Informed Consent Recorded
                </p>
                <p>Beneficiary has signed the informed consent form for project participation & data privacy protection.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                >
                  Register Beneficiary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
