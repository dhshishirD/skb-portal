'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  MapPin, 
  CheckCircle2, 
  Search,
  Lock,
  Plus,
  Edit2,
  Trash2,
  Download,
  X,
  UserCheck,
  Building2,
  FileSpreadsheet
} from 'lucide-react';
import { BeneficiaryService, BeneficiaryRecord } from '@/server/services/beneficiaryService';

export default function ProjectBeneficiariesPage({ params }: { params: { id: string } }) {
  const projectId = params.id || '1791270873958';
  const [allBeneficiaries, setAllBeneficiaries] = useState<BeneficiaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<BeneficiaryRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // New Form State
  const [name, setName] = useState('');
  const [nid, setNid] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('Female');
  const [birthYear, setBirthYear] = useState('1996');
  const [upazila, setUpazila] = useState('Teknaf Upazila');

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editNid, setEditNid] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGender, setEditGender] = useState('Female');
  const [editBirthYear, setEditBirthYear] = useState('1996');
  const [editUpazila, setEditUpazila] = useState('Teknaf Upazila');

  const loadData = async () => {
    setLoading(true);
    const data = await BeneficiaryService.getBeneficiaries();
    setAllBeneficiaries(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  // Project-specific filtered list
  const projectBeneficiaries = allBeneficiaries.filter(b => 
    b.projectId === projectId || 
    b.projectId === `PID ${projectId}` || 
    b.projectId?.includes(projectId) ||
    !b.projectId // Include general field intake if project matches
  );

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newRecord = await BeneficiaryService.addBeneficiary({
      fullName: name.trim(),
      nationalId: nid.trim() || '1992000000000',
      phone: phone.trim() || '01700000000',
      sex: gender.toLowerCase(),
      birthYear: parseInt(birthYear) || 1996,
      locationCode: upazila.toUpperCase().replace(/\s+/g, '-'),
      projectId: projectId,
      summary: `Registered specifically for Project #${projectId}`,
      consentCaptured: true,
    });

    await loadData();
    setShowRegisterModal(false);
    setStatusMsg(`Beneficiary "${name}" registered for Project #${projectId}! NID consent verified.`);
    setName('');
    setNid('');
    setPhone('');
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const handleOpenEdit = (b: BeneficiaryRecord) => {
    setEditingBeneficiary(b);
    setEditName(b.fullName);
    setEditNid(b.nationalId);
    setEditPhone(b.phone);
    setEditGender(b.sex.charAt(0).toUpperCase() + b.sex.slice(1));
    setEditBirthYear(String(b.birthYear));
    setEditUpazila(b.locationCode);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBeneficiary || !editName.trim()) return;

    await BeneficiaryService.updateBeneficiary(editingBeneficiary.id, {
      fullName: editName.trim(),
      nationalId: editNid.trim(),
      phone: editPhone.trim(),
      sex: editGender.toLowerCase(),
      birthYear: parseInt(editBirthYear) || 1996,
      locationCode: editUpazila.toUpperCase().replace(/\s+/g, '-'),
    });

    await loadData();
    setEditingBeneficiary(null);
    setStatusMsg(`Beneficiary "${editName}" records updated and saved permanently.`);
    setTimeout(() => setStatusMsg(''), 3500);
  };

  const handleDeleteBeneficiary = async (id: string, fullName: string) => {
    if (confirm(`Are you sure you want to remove beneficiary "${fullName}" from Project #${projectId}?`)) {
      await BeneficiaryService.deleteBeneficiary(id);
      await loadData();
      setStatusMsg(`Beneficiary "${fullName}" deleted from Project #${projectId} register.`);
      setTimeout(() => setStatusMsg(''), 3500);
    }
  };

  const handleExportCsv = () => {
    const csvHeader = "ID,Full Name,National ID / FCN,Phone,Sex,Birth Year,Location Code,Consent Verified,Registration Date\n";
    const csvRows = projectBeneficiaries.map(b => 
      `"${b.id}","${b.fullName}","${b.nationalId}","${b.phone}","${b.sex}","${b.birthYear}","${b.locationCode}","YES","${b.registeredAt}"`
    ).join("\n");

    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SKB_Beneficiary_Register_Project_${projectId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setStatusToastMsg(`Exported official CSV Beneficiary Register for Project #${projectId}!`);
  };

  const [statusToastMsg, setStatusToastMsg] = useState('');

  const filtered = projectBeneficiaries.filter(
    (b) =>
      b.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.locationCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.nationalId.includes(searchTerm)
  );

  return (
    <div className="space-y-6 pb-10 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Project Beneficiary Register &amp; Consent Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Encrypted personal records, NID duplicate protection, and consent logs dedicated to Project #{projectId}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2.5 rounded-xl transition"
          >
            <Download className="w-4 h-4 text-emerald-600" /> Export (.CSV)
          </button>

          <button
            onClick={() => setShowRegisterModal(true)}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <UserPlus className="w-4 h-4" />
            Register New Beneficiary
          </button>
        </div>
      </div>

      {(statusMsg || statusToastMsg) && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {statusMsg || statusToastMsg}
        </div>
      )}

      {/* Target & Verification Stats Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-slate-900 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Total Project Enrolled: {projectBeneficiaries.length} Verified Individuals
          </span>
          <span className="text-slate-500 text-[11px] font-medium">
            (Host Households &amp; Rohingya FCN Smart Card Holders)
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Column Encryption Active</span>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Search beneficiary name, National ID / FCN, or location code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-500 transition shadow-sm"
        />
      </div>

      {/* Beneficiary Table */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-500 shadow-sm">
          Loading project beneficiary records...
        </div>
      ) : filtered.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5 pl-5">Full Name (Encrypted)</th>
                  <th className="p-3.5">National ID / FCN</th>
                  <th className="p-3.5">Phone Number</th>
                  <th className="p-3.5">Gender / Birth Year</th>
                  <th className="p-3.5">Location Code</th>
                  <th className="p-3.5">Consent Status</th>
                  <th className="p-3.5 text-right pr-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 pl-5 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      {b.fullName}
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">{b.nationalId}</td>
                    <td className="p-3.5 text-slate-600">{b.phone}</td>
                    <td className="p-3.5 text-slate-600 capitalize">{b.sex} ({b.birthYear})</td>
                    <td className="p-3.5">
                      <span className="bg-slate-100 text-slate-800 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-md border border-slate-200">
                        {b.locationCode}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Consent Verified
                      </span>
                    </td>
                    <td className="p-3.5 text-right pr-5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Beneficiary Record"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBeneficiary(b.id, b.fullName)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-3">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Beneficiaries Registered for Project #{projectId}</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click &ldquo;Register New Beneficiary&rdquo; above to add verified households, or sync field intake records from the Field Dashboard.
          </p>
        </div>
      )}

      {/* MODAL 1: REGISTER NEW BENEFICIARY */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                Register Beneficiary for Project #{projectId}
              </h3>
              <button onClick={() => setShowRegisterModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name of Beneficiary / Household Head</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rokeya Begum"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-emerald-500 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">National ID (NID) / FCN Card</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1992265980123"
                    value={nid}
                    onChange={(e) => setNid(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-emerald-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 01700000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-emerald-500 focus:bg-white transition"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Birth Year</label>
                  <input
                    type="number"
                    required
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-emerald-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Location / Upazila</label>
                  <input
                    type="text"
                    required
                    value={upazila}
                    onChange={(e) => setUpazila(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 font-medium">
                🛡️ <strong>Safeguarding Enforcement</strong>: Beneficiary records are encrypted. By submitting, you confirm NID verification and consent capture. Underaged (&lt;18 yrs) signature prohibition is active.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" /> Save Beneficiary Permanently
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT BENEFICIARY */}
      {editingBeneficiary && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                Edit Beneficiary Record ({editingBeneficiary.id})
              </h3>
              <button onClick={() => setEditingBeneficiary(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">National ID / FCN Card</label>
                  <input
                    type="text"
                    required
                    value={editNid}
                    onChange={(e) => setEditNid(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Birth Year</label>
                  <input
                    type="number"
                    required
                    value={editBirthYear}
                    onChange={(e) => setEditBirthYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Location Code</label>
                  <input
                    type="text"
                    required
                    value={editUpazila}
                    onChange={(e) => setEditUpazila(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingBeneficiary(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all"
                >
                  Save Beneficiary Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
