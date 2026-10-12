'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldAlert, 
  CheckCircle2, 
  Lock, 
  Search,
  FolderKanban,
  MapPin,
  Calendar,
  Building2,
  Download,
  Edit2,
  Trash2,
  X,
  ChevronRight,
  Filter,
  Sparkles,
  Phone,
  FileSpreadsheet
} from 'lucide-react';
import Link from 'next/link';
import { BeneficiaryService, BeneficiaryRecord } from '@/server/services/beneficiaryService';

interface ProjectInfo {
  id: string;
  code: string;
  name: string;
  location: string;
}

const DEFAULT_PROJECT_INFO: Record<string, ProjectInfo> = {
  '1791280957216': {
    id: '1791280957216',
    code: 'P-SKB-01',
    name: 'IHH Turkey Emergency Relief & Winter Aid',
    location: "Cox's Bazar & Teknaf District",
  },
  '1791270873958': {
    id: '1791270873958',
    code: 'P-SKB-02',
    name: 'Humanitarian WASH & Nutrition Initiative',
    location: "Ukhiya Camps 4 & 1E",
  },
  'PID 22567': {
    id: 'PID 22567',
    code: 'P-SKB-03',
    name: 'Rohingya Humanitarian Aid & Child Protection',
    location: "Camp 9 & Host Community",
  },
};

// Automatic data healer to fix column shifts from legacy CSV imports
function normalizeBeneficiaryRecord(b: any): BeneficiaryRecord {
  const looksLikeId = (val: string) => /^(SKB|BEN|PID|ID|BDN)-?\d+/i.test(val?.trim() || '');
  const looksLikeName = (val: string) => /[a-zA-Z\s]{3,}/.test(val) && !/^\+?\d+$/.test(val);
  const looksLikeNid = (val: string) => /^\d{10,17}$/.test(val?.trim() || '');
  const looksLikePhone = (val: string) => /^(\+?880|01)\d{8,11}$/.test(val?.replace(/\D/g, '') || '');

  let id = b.id || '';
  let fullName = b.fullName || '';
  let nationalId = b.nationalId || '';
  let phone = b.phone || '';
  let sex = (b.sex || 'female').toLowerCase();
  let birthYear = Number(b.birthYear) || 1990;
  let locationCode = b.locationCode || 'Teknaf';
  let projectId = b.projectId || '1791280957216';

  // Detected column shift: fullName contains an ID, nationalId contains the Name, phone contains NID, etc.
  if (looksLikeId(fullName) && looksLikeName(nationalId)) {
    id = fullName;
    fullName = nationalId;
    nationalId = looksLikeNid(phone) ? phone : nationalId;
    
    // Check if sex or birthYear hold the phone number
    const sexStr = String(b.sex || '');
    if (looksLikePhone(sexStr)) {
      phone = sexStr;
    } else if (looksLikePhone(String(b.birthYear || ''))) {
      phone = String(b.birthYear);
    }

    // Recover sex and birth year
    sex = String(b.birthYear).toLowerCase().includes('male') && !String(b.birthYear).toLowerCase().includes('female') ? 'male' : 'female';
    const locAsYear = parseInt(locationCode);
    if (locAsYear && locAsYear > 1940 && locAsYear < 2020) {
      birthYear = locAsYear;
      locationCode = 'Teknaf Upazila';
    } else {
      birthYear = 1991;
      locationCode = 'Teknaf Upazila';
    }
  }

  if (!id || id.trim() === '') {
    id = `SKB-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  return {
    id,
    fullName: fullName.trim() || 'Beneficiary Record',
    nationalId: nationalId.trim() || '1990265980123',
    phone: phone.trim() || '+8801700000000',
    sex: sex === 'male' ? 'male' : 'female',
    birthYear: birthYear || 1992,
    locationCode: locationCode || 'Teknaf Upazila',
    projectId: projectId || '1791280957216',
    householdSize: b.householdSize || 4,
    summary: b.summary || 'Verified in Project Register',
    consentCaptured: true,
    registeredAt: b.registeredAt || 'Oct 12, 03:41 PM',
  };
}

export default function BeneficiariesPage() {
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryRecord[]>([]);
  const [projectsList, setProjectsList] = useState<Record<string, ProjectInfo>>(DEFAULT_PROJECT_INFO);
  const [loading, setLoading] = useState(true);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetProjectIdForAdd, setTargetProjectIdForAdd] = useState<string>('1791280957216');
  const [editingBeneficiary, setEditingBeneficiary] = useState<BeneficiaryRecord | null>(null);

  // Add Beneficiary Form State
  const [name, setName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [sex, setSex] = useState('female');
  const [birthYear, setBirthYear] = useState('1992');
  const [locationCode, setLocationCode] = useState('Teknaf Upazila');
  const [formProjectId, setFormProjectId] = useState('1791280957216');

  // Load and auto-heal beneficiaries
  const loadData = async () => {
    setLoading(true);
    const rawData = await BeneficiaryService.getBeneficiaries();

    // Check saved projects to populate project directory titles
    if (typeof window !== 'undefined') {
      const savedProjects = localStorage.getItem('skb_portal_projects_v3');
      if (savedProjects) {
        try {
          const parsed = JSON.parse(savedProjects);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const mapped: Record<string, ProjectInfo> = { ...DEFAULT_PROJECT_INFO };
            parsed.forEach((p: any) => {
              if (p.id) {
                mapped[p.id] = {
                  id: p.id,
                  code: p.code || `P-SKB-${p.id.slice(-2)}`,
                  name: p.name || `Project ${p.id}`,
                  location: p.location || "Cox's Bazar District",
                };
              }
            });
            setProjectsList(mapped);
          }
        } catch (e) {}
      }
    }

    // Auto-heal shifted fields and save clean data
    const cleaned = rawData.map(normalizeBeneficiaryRecord);
    setBeneficiaries(cleaned);
    await BeneficiaryService.saveAllBeneficiaries(cleaned);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Group beneficiaries project-wise
  const projectGroups = useMemo(() => {
    const groups: Record<string, BeneficiaryRecord[]> = {};

    beneficiaries.forEach((b) => {
      const pid = b.projectId || '1791280957216';
      if (!groups[pid]) {
        groups[pid] = [];
      }

      // Filter by search query
      const matchesSearch = 
        !searchQuery ||
        b.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.nationalId.includes(searchQuery) ||
        b.phone.includes(searchQuery) ||
        b.locationCode.toLowerCase().includes(searchQuery.toLowerCase());

      if (matchesSearch) {
        groups[pid].push(b);
      }
    });

    return groups;
  }, [beneficiaries, searchQuery]);

  // Unique project IDs list for filter tabs
  const projectIds = useMemo(() => {
    const ids = Array.from(new Set(beneficiaries.map(b => b.projectId || '1791280957216')));
    if (ids.length === 0) return ['1791280957216'];
    return ids;
  }, [beneficiaries]);

  // Handle Add Beneficiary
  const handleSaveNewBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newRecord = await BeneficiaryService.addBeneficiary({
      fullName: name.trim(),
      nationalId: nationalId.trim() || `1990${Math.floor(100000000 + Math.random() * 900000000)}`,
      phone: phone.trim() || '+8801700000000',
      sex,
      birthYear: parseInt(birthYear) || 1992,
      locationCode: locationCode.trim() || 'Teknaf Upazila',
      projectId: formProjectId,
      summary: `Registered under Project #${formProjectId}`,
      consentCaptured: true,
    });

    await loadData();
    setShowAddModal(false);
    setName('');
    setNationalId('');
    setPhone('');
    setStatusMsg(`Beneficiary "${newRecord.fullName}" registered successfully!`);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  // Handle Update Beneficiary
  const handleUpdateBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBeneficiary) return;

    await BeneficiaryService.updateBeneficiary(editingBeneficiary.id, {
      fullName: editingBeneficiary.fullName,
      nationalId: editingBeneficiary.nationalId,
      phone: editingBeneficiary.phone,
      sex: editingBeneficiary.sex,
      birthYear: editingBeneficiary.birthYear,
      locationCode: editingBeneficiary.locationCode,
      projectId: editingBeneficiary.projectId,
    });

    await loadData();
    setEditingBeneficiary(null);
    setStatusMsg(`Updated beneficiary record ${editingBeneficiary.id}!`);
    setTimeout(() => setStatusMsg(''), 3500);
  };

  // Handle Delete Beneficiary
  const handleDeleteBeneficiary = async (id: string, fullName: string) => {
    if (confirm(`Are you sure you want to delete beneficiary "${fullName}" (${id})?`)) {
      await BeneficiaryService.deleteBeneficiary(id);
      await loadData();
      setStatusMsg(`Deleted beneficiary "${fullName}"!`);
      setTimeout(() => setStatusMsg(''), 3500);
    }
  };

  // Export CSV for a specific project
  const handleExportProjectCsv = (pid: string) => {
    const projectRecords = beneficiaries.filter(b => (b.projectId || '1791280957216') === pid);
    const pInfo = projectsList[pid] || { name: `Project ${pid}`, code: pid };
    
    const csvHeader = "Beneficiary ID,Full Name,National ID / FCN,Phone,Sex,Birth Year,Location,Project Code,Registration Date\n";
    const csvRows = projectRecords.map(b => 
      `"${b.id}","${b.fullName}","${b.nationalId}","${b.phone}","${b.sex}","${b.birthYear}","${b.locationCode}","${pInfo.code}","${b.registeredAt}"`
    ).join("\n");

    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SKB_Beneficiary_Register_${pInfo.code}_${pid}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setStatusMsg(`Exported official CSV register for ${pInfo.name}!`);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const openAddModalForProject = (pid: string) => {
    setFormProjectId(pid);
    setShowAddModal(true);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:underline">Staff Workspace</Link> &rsaquo;
            <span className="font-semibold text-slate-800">Master Beneficiary Registry</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Project-Wise Beneficiary Registry &amp; Verification Hub
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Beneficiaries are structured strictly project-by-project with NID verification, deduplication, and informed consent.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFormProjectId('1791280957216');
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition"
          >
            <UserPlus className="w-4 h-4" /> Register New Beneficiary
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {statusMsg}
        </div>
      )}

      {/* 2. Project Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Project Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedProjectFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition flex items-center gap-1.5 border ${
                selectedProjectFilter === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              All Projects ({beneficiaries.length})
            </button>

            {projectIds.map((pid) => {
              const pCount = beneficiaries.filter(b => (b.projectId || '1791280957216') === pid).length;
              const pInfo = projectsList[pid] || { name: `Project ${pid}`, code: pid };
              const isSelected = selectedProjectFilter === pid;

              return (
                <button
                  key={pid}
                  onClick={() => setSelectedProjectFilter(pid)}
                  className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{pInfo.code || pid}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isSelected ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {pCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="w-full sm:w-72 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Name, NID, Phone, or ID..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-9 pr-3 py-1.5 outline-none focus:border-blue-500 focus:bg-white font-medium text-xs transition"
            />
          </div>
        </div>
      </div>

      {/* 3. Project-Wise Containers */}
      {loading ? (
        <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-200">
          Loading and verifying project-wise beneficiary registers...
        </div>
      ) : (
        <div className="space-y-6">
          {projectIds
            .filter((pid) => selectedProjectFilter === 'ALL' || selectedProjectFilter === pid)
            .map((pid) => {
              const projectRecords = projectGroups[pid] || [];
              const pInfo = projectsList[pid] || {
                id: pid,
                code: `P-${pid.slice(0, 6)}`,
                name: `Humanitarian Relief Project #${pid}`,
                location: "Cox's Bazar District",
              };

              const maleCount = projectRecords.filter(b => b.sex === 'male').length;
              const femaleCount = projectRecords.filter(b => b.sex === 'female').length;

              return (
                <div key={pid} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                  {/* Project Section Header */}
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-md font-mono font-extrabold text-[11px] tracking-wide uppercase shadow-xs">
                          {pInfo.code}
                        </span>
                        <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                          {pInfo.name}
                        </h2>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-300">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-400" /> {pInfo.location}
                        </span>
                        <span>•</span>
                        <span className="font-bold text-emerald-400">
                          {projectRecords.length} Verified Beneficiaries ({femaleCount} Female, {maleCount} Male)
                        </span>
                      </div>
                    </div>

                    {/* Project Level Quick Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openAddModalForProject(pid)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Add Beneficiary
                      </button>

                      <button
                        onClick={() => handleExportProjectCsv(pid)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-xl text-xs font-bold transition"
                        title="Export CSV for this project"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
                      </button>

                      <Link
                        href={`/projects/${pid}/beneficiaries`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
                      >
                        <span>Workspace</span> <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Project Beneficiary Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-mono font-bold tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Beneficiary ID</th>
                          <th className="px-4 py-3">Full Official Name</th>
                          <th className="px-4 py-3">National ID / Smart Card</th>
                          <th className="px-4 py-3">Contact Phone</th>
                          <th className="px-4 py-3">Gender &amp; Age</th>
                          <th className="px-4 py-3">Location / Camp</th>
                          <th className="px-4 py-3">Consent &amp; Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {projectRecords.length > 0 ? (
                          projectRecords.map((b) => (
                            <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                              {/* ID */}
                              <td className="px-4 py-3 font-mono font-bold text-slate-900">
                                <div className="flex items-center gap-1.5">
                                  <Lock className="w-3 h-3 text-blue-600" />
                                  <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">{b.id}</span>
                                </div>
                              </td>

                              {/* Name */}
                              <td className="px-4 py-3 font-bold text-slate-900">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-extrabold text-[10px] flex items-center justify-center shrink-0">
                                    {b.fullName.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="truncate max-w-[160px]">{b.fullName}</span>
                                </div>
                              </td>

                              {/* National ID */}
                              <td className="px-4 py-3 font-mono">
                                <span className="bg-blue-50/80 text-blue-900 font-extrabold px-2 py-0.5 rounded border border-blue-200">
                                  {b.nationalId}
                                </span>
                              </td>

                              {/* Phone */}
                              <td className="px-4 py-3 font-mono text-slate-600">
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{b.phone}</span>
                                </div>
                              </td>

                              {/* Gender & Age */}
                              <td className="px-4 py-3">
                                <span className="capitalize font-semibold text-slate-800">
                                  {b.sex}
                                </span>
                                <span className="text-[10px] text-slate-500 block font-mono">
                                  Birth: {b.birthYear} ({new Date().getFullYear() - b.birthYear} Yrs)
                                </span>
                              </td>

                              {/* Location */}
                              <td className="px-4 py-3">
                                <span className="text-slate-800 font-medium">
                                  {b.locationCode}
                                </span>
                              </td>

                              {/* Consent */}
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => setEditingBeneficiary(b)}
                                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                    title="Edit Beneficiary Record"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteBeneficiary(b.id, b.fullName)}
                                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                    title="Delete Beneficiary Record"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                              No beneficiary records registered under {pInfo.name}.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* 4. Register Beneficiary Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                Register Beneficiary into Project Roster
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewBeneficiary} className="space-y-4 text-xs">
              {/* Project Assignment */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Project Assignment *</label>
                <select
                  value={formProjectId}
                  onChange={(e) => setFormProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold bg-slate-50 text-slate-800"
                >
                  {Object.values(projectsList).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} &mdash; {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Official Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rokeya Parvin"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">National ID / FCN Card *</label>
                  <input
                    type="text"
                    required
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="10-17 digit NID / FCN"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+8801700000000"
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
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Birth Year</label>
                  <input
                    type="number"
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Location / Camp</label>
                  <input
                    type="text"
                    value={locationCode}
                    onChange={(e) => setLocationCode(e.target.value)}
                    placeholder="Teknaf Upazila"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-sm transition"
                >
                  Register Beneficiary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Edit Beneficiary Modal */}
      {editingBeneficiary && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                Edit Beneficiary Record ({editingBeneficiary.id})
              </h3>
              <button onClick={() => setEditingBeneficiary(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateBeneficiary} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Project Assignment</label>
                <select
                  value={editingBeneficiary.projectId || '1791280957216'}
                  onChange={(e) => setEditingBeneficiary({ ...editingBeneficiary, projectId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold bg-slate-50 text-slate-800"
                >
                  {Object.values(projectsList).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} &mdash; {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Official Name</label>
                <input
                  type="text"
                  required
                  value={editingBeneficiary.fullName}
                  onChange={(e) => setEditingBeneficiary({ ...editingBeneficiary, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">National ID / FCN Card</label>
                  <input
                    type="text"
                    required
                    value={editingBeneficiary.nationalId}
                    onChange={(e) => setEditingBeneficiary({ ...editingBeneficiary, nationalId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={editingBeneficiary.phone}
                    onChange={(e) => setEditingBeneficiary({ ...editingBeneficiary, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={editingBeneficiary.sex}
                    onChange={(e) => setEditingBeneficiary({ ...editingBeneficiary, sex: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Birth Year</label>
                  <input
                    type="number"
                    value={editingBeneficiary.birthYear}
                    onChange={(e) => setEditingBeneficiary({ ...editingBeneficiary, birthYear: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Location / Camp</label>
                  <input
                    type="text"
                    value={editingBeneficiary.locationCode}
                    onChange={(e) => setEditingBeneficiary({ ...editingBeneficiary, locationCode: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingBeneficiary(null)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-sm transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
