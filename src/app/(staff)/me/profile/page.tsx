'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  User, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Building2, 
  Save, 
  Camera, 
  Phone, 
  MapPin, 
  Briefcase, 
  Award, 
  Users, 
  RefreshCw, 
  Upload, 
  ChevronRight,
  Globe2,
  FileCheck2,
  QrCode
} from 'lucide-react';
import { 
  UserApprovalService, 
  UserProfileRecord, 
  DEFAULT_APPROVED_USERS,
  SystemRole 
} from '@/server/services/userApprovalService';

const DESIGNATION_PRESETS = [
  'Executive Director & General Secretariat',
  'Medical Lead & Health Programs Consultant',
  'Senior Program & Operations Coordinator',
  'Field Operations & Logistics Lead',
  'Lead IT & Systems Administrator',
  'Finance & Compliance Specialist',
  'Monitoring, Evaluation & Learning (MEL) Officer',
  'Child Protection & Safeguarding Specialist',
  'Emergency Logistics Coordinator'
];

const DEPARTMENT_PRESETS = [
  'Directorate General HQ',
  'Health, Nutrition & Emergency Relief',
  'Programs & International Donors Desk',
  'Field Logistics & Emergency Response',
  'Finance, Grants & Audits',
  'IT & Super Admin',
  'Community Outreach & Protection'
];

const DUTY_STATION_PRESETS = [
  'Dhaka HQ',
  'Cox\'s Bazar Field Hub',
  'Teknaf Sub-Office',
  'Ukhia Field Desk',
  'Cox\'s Bazar & Dhaka HQ',
  'Remote / Field Desk'
];

const AVATAR_PRESETS = [
  { label: 'Executive Lead', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { label: 'Doctor / Medical', url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80' },
  { label: 'Program Officer', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { label: 'Field Logistics', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
  { label: 'IT Systems', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
  { label: 'Finance Specialist', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' }
];

export default function UserProfilePage() {
  const [allUsers, setAllUsers] = useState<UserProfileRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [profile, setProfile] = useState<UserProfileRecord | null>(null);
  
  // Editable form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dutyStation, setDutyStation] = useState('Dhaka HQ');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('Programs & International Donors Desk');
  const [requestedRole, setRequestedRole] = useState<SystemRole>('Program Officer');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  
  const [saveToast, setSaveToast] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load all profiles on mount
  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async (targetId?: string) => {
    const users = await UserApprovalService.getAllUsers();
    setAllUsers(users);

    const active = targetId 
      ? users.find(u => u.id === targetId || u.email === targetId)
      : (users.find(u => u.fullName.includes('Jannat')) || users[0]);

    if (active) {
      applyProfileToState(active);
    }
  };

  const applyProfileToState = (u: UserProfileRecord) => {
    setSelectedUserId(u.id);
    setProfile(u);
    setFullName(u.fullName || '');
    setPhone(u.phone || '+880 1711-000000');
    setDutyStation(u.dutyStation || 'Dhaka HQ');
    setDesignation(u.designation || 'Humanitarian Specialist');
    setDepartment(u.department || 'Operations & Projects');
    setRequestedRole(u.requestedRole || 'Program Officer');
    setAvatarUrl(u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80');
    setBio(u.bio || '');
    setEmployeeId(u.employeeId || `SKB-STAFF-${u.id.slice(-3)}`);
  };

  const handleSelectOfficer = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const uid = e.target.value;
    const found = allUsers.find(u => u.id === uid);
    if (found) {
      applyProfileToState(found);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Photo must be smaller than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    const updated = await UserApprovalService.updateFullProfile(profile.id, {
      fullName,
      phone,
      dutyStation,
      designation,
      department,
      requestedRole,
      avatarUrl,
      bio,
      employeeId,
    });

    setSaving(false);
    if (updated) {
      setProfile(updated);
      setSaveToast(`Official profile for ${updated.fullName} saved! Desk and Staff ID badge updated successfully.`);
      // Refresh list to update any directory views
      loadProfiles(updated.id);
      setTimeout(() => setSaveToast(''), 5000);
    }
  };

  if (!profile) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="text-sm font-semibold">Loading officer profile desk...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <Link href="/dashboard" className="hover:underline">Staff Workspace</Link> &rsaquo;
          <span className="font-semibold text-slate-800">Officer Profile & Desk Setup</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Officer Profile & Official Desk Customizer
            </h1>
            <p className="text-xs text-slate-500">
              Each humanitarian officer can define their official designation, photo, duty station, and role permissions.
            </p>
          </div>

          {/* Quick Desk Identity Switcher */}
          <div className="bg-slate-100 border border-slate-300 rounded-2xl p-2 flex items-center gap-2 self-start md:self-auto shadow-sm">
            <span className="text-[11px] font-bold text-slate-600 uppercase pl-2 flex items-center gap-1.5 shrink-0">
              <Users className="w-3.5 h-3.5 text-blue-600" /> Active Desk:
            </span>
            <select
              value={selectedUserId}
              onChange={handleSelectOfficer}
              className="bg-white border border-slate-300 text-xs font-black text-slate-800 rounded-xl px-3 py-1.5 outline-none focus:border-blue-500 cursor-pointer shadow-sm"
            >
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.designation || u.requestedRole})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Account Verification & Authorization Banner */}
      {profile.status === 'PENDING_APPROVAL' ? (
        <div className="bg-amber-50 border border-amber-300 p-5 rounded-2xl text-amber-950 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-black text-amber-900 text-sm">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Account Pending Administrator Activation</span>
            </div>
            <span className="text-[10px] bg-amber-200 text-amber-900 font-black px-3 py-1 rounded-full uppercase border border-amber-300">
              Pending Activation
            </span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Your Google account is registered. You can configure your official badge, designation, and phone details below. Once saved, leadership will finalize your role authorization.
          </p>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-emerald-950 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-emerald-950">Active Authorized Humanitarian Officer</span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 font-extrabold px-2 py-0.5 rounded-full uppercase">
                  Verified
                </span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Accreditation authorized by <strong>{profile.approvedBy || 'Directorate General'}</strong> on {profile.approvedAt || '2026-01-01'}.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold bg-white/80 px-3 py-1 rounded-xl text-emerald-900 border border-emerald-200 self-start md:self-auto">
            ID: {employeeId}
          </span>
        </div>
      )}

      {saveToast && (
        <div className="bg-blue-50 border border-blue-300 text-blue-950 p-4 rounded-2xl text-xs font-black flex items-center gap-3 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Main Grid: Form on Left, Official ID Card on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Profile Setup Form (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              Official Desk & Identity Parameters
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">Self-Service Setup</span>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5 text-xs">
            {/* Section 1: Basic Identity */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">1. Officer Identity & Contact</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Legal / Professional Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Orakatul Jannat"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-black text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Official Staff Email (Registered)</label>
                  <input
                    type="email"
                    value={profile.email}
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-medium text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> Contact Phone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 1711-xxxxxx"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5 text-slate-400" /> Employee / Staff Badge ID
                  </label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="e.g. SKB-MED-002"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Role & Designation */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">2. Professional Designation & Role Assignment</h3>
              
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Official Designation / Title *
                </label>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="Type or select designation below..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-black text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
                    required
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {DESIGNATION_PRESETS.slice(0, 5).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setDesignation(p)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition ${
                          designation === p 
                            ? 'bg-blue-50 border-blue-400 text-blue-800' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department / Division *</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                  >
                    {DEPARTMENT_PRESETS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Primary System Role *</label>
                  <select
                    value={requestedRole}
                    onChange={(e) => setRequestedRole(e.target.value as SystemRole)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-black text-slate-900 outline-none focus:border-blue-500"
                  >
                    <option value="Executive Director">Executive Director (Directorate Approvals)</option>
                    <option value="Program Officer">Program Officer (Logframe, Form-3, Form-7)</option>
                    <option value="Field Operations Officer">Field Operations Officer (Field PWA & Logistics)</option>
                    <option value="Finance Manager">Finance Manager (Requisitions & Budgets)</option>
                    <option value="Medical / Health Officer">Medical / Health Officer (Relief & Health)</option>
                    <option value="IT & Admin Officer">IT & Admin Officer (Super Admin Access)</option>
                    <option value="General Staff">General Staff (Observer / Collaborator)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> Duty Station / Operating Base *
                </label>
                <select
                  value={dutyStation}
                  onChange={(e) => setDutyStation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                >
                  {DUTY_STATION_PRESETS.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Section 3: Profile Photo / Avatar */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">3. Official Staff Photo</h3>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-600 shadow-sm shrink-0"
                  onError={(e) => {
                    // Fallback to placeholder if broken link
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                  }}
                />
                
                <div className="space-y-2 flex-1 w-full">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl font-black text-slate-800 text-[11px] flex items-center gap-1.5 shadow-sm transition"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-600" /> Upload from Computer
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <span className="text-[10px] text-slate-400">PNG or JPG, max 2MB</span>
                  </div>

                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="Or paste external image URL..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-[11px] font-mono text-slate-700 outline-none focus:border-blue-500"
                  />

                  {/* Preset Quick Avatars */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-500 font-bold">Presets:</span>
                    {AVATAR_PRESETS.map((av) => (
                      <button
                        key={av.label}
                        type="button"
                        onClick={() => setAvatarUrl(av.url)}
                        className="text-[10px] font-semibold bg-white border border-slate-200 hover:border-blue-400 px-2 py-0.5 rounded text-slate-600 transition"
                      >
                        {av.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Professional Bio / Humanitarian Statement */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block font-bold text-slate-700">Brief Humanitarian Background & Scope</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                placeholder="Brief summary of duties, mission background, or emergency specializations..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            {/* Submit Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">
                All changes reflect across projects, vouchers & donor reports immediately.
              </span>
              <button
                type="submit"
                disabled={saving}
                className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-2 group disabled:opacity-50"
              >
                <Save className="w-4 h-4 group-hover:scale-110 transition" />
                {saving ? 'Saving...' : 'Save Desk Profile & ID Badge'}
              </button>
            </div>
          </form>
        </div>

        {/* Official Staff ID Card Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" /> Live Official ID Card Preview
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded">
              ISO 9001 Format
            </span>
          </div>

          {/* Physical Badge Simulator */}
          <div className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 shadow-2xl border-4 border-slate-700/60 relative overflow-hidden">
            {/* Top Lanyard Slot Graphic */}
            <div className="w-16 h-2 bg-slate-950 rounded-full mx-auto mb-4 border border-slate-700" />

            {/* Header / Org Brand */}
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-4 mb-5">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">Humanitarian Mission</span>
                <h4 className="text-sm font-black tracking-tight text-white">SMALL KINDNESS BANGLADESH</h4>
                <p className="text-[9px] text-slate-400">Registration: FDSR-Govt / Partner Portal</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center font-black text-white text-base">
                SKB
              </div>
            </div>

            {/* Photo & Identity Core */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="relative">
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                  }}
                />
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1 rounded-full border-2 border-slate-900 shadow">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>

              <div>
                <h3 className="text-base font-black text-white tracking-wide">{fullName || 'Staff Member'}</h3>
                <p className="text-xs font-bold text-amber-400 mt-0.5">{designation || 'Humanitarian Specialist'}</p>
                <div className="flex items-center justify-center gap-1.5 mt-1 text-[11px] text-slate-300">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>{department}</span>
                </div>
              </div>
            </div>

            {/* Badges & Meta Details */}
            <div className="mt-5 pt-4 border-t border-slate-700/80 space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> System Role:
                </span>
                <span className="font-black text-white text-[11px] bg-blue-600/40 px-2 py-0.5 rounded border border-blue-500/30">
                  {requestedRole}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-400" /> Duty Station:
                </span>
                <span className="font-bold text-slate-200 text-[11px]">{dutyStation}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                  <Phone className="w-3 h-3 text-cyan-400" /> Contact Phone:
                </span>
                <span className="font-mono text-slate-300 text-[11px]">{phone}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Staff ID:</span>
                <span className="font-mono font-bold text-amber-400 text-xs">{employeeId}</span>
              </div>
            </div>

            {/* Card Footer with Security Barcode */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-8 h-8 text-slate-400" />
                <div className="text-[8px] text-slate-400 leading-tight">
                  <p className="font-bold text-slate-300">AUTHORIZED ACCREDITATION</p>
                  <p>Small Kindness Bangladesh • 2026</p>
                </div>
              </div>
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-1 rounded border border-emerald-800">
                STATUS: ACTIVE
              </span>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-1">
            <span className="font-black text-slate-800 flex items-center gap-1.5">
              <Globe2 className="w-4 h-4 text-blue-600" /> Official Transparency Guarantee
            </span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              When international donors (such as IHH, UMUT OL, Mavi Marmara, or QWCQP) inspect project charters or financial vouchers, this badge verified data is displayed on the audit trail.
            </p>
          </div>
        </div>
      </div>

      {/* Core Team Roster Quick-Switch Cards */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" /> Core Executive & Humanitarian Team Directory
            </h3>
            <p className="text-[11px] text-slate-500">
              Click any team member below to immediately inspect or configure their official desk.
            </p>
          </div>
          <span className="text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            6 Officers Registered
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {allUsers.map((officer) => (
            <div
              key={officer.id}
              onClick={() => applyProfileToState(officer)}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center gap-3 group ${
                selectedUserId === officer.id 
                  ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20' 
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <img
                src={officer.avatarUrl}
                alt={officer.fullName}
                className="w-12 h-12 rounded-xl object-cover border border-slate-300 shrink-0 group-hover:scale-105 transition"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 truncate group-hover:text-blue-600 transition">
                    {officer.fullName}
                  </h4>
                  {selectedUserId === officer.id && (
                    <span className="text-[9px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-600 truncate font-semibold">
                  {officer.designation || officer.requestedRole}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-400">
                  <span className="truncate">{officer.dutyStation || 'Dhaka HQ'}</span>
                  <span>•</span>
                  <span className="text-emerald-600 font-bold">Approved</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
