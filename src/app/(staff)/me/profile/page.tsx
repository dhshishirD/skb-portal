'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  Camera, 
  Upload, 
  QrCode, 
  Globe2, 
  ExternalLink, 
  Briefcase, 
  Award, 
  FolderKanban, 
  Receipt, 
  Users, 
  MessageSquare, 
  LayoutDashboard,
  Check,
  Shield,
  FileCheck2,
  Sparkles
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { 
  UserApprovalService, 
  UserProfileRecord, 
  DEFAULT_APPROVED_USERS,
  SystemRole 
} from '@/server/services/userApprovalService';
import { 
  HIJABI_CHAIRMAN_AVATAR, 
  MALE_EXECUTIVE_AVATAR, 
  MALE_OFFICER_AVATAR, 
  IT_OFFICER_AVATAR, 
  LAW_OFFICER_AVATAR,
  getOfficialAvatar 
} from '@/lib/avatarPresets';

const DUTY_STATIONS = [
  'Dhaka HQ',
  'Cox\'s Bazar Field Hub',
  'Teknaf Sub-Office',
  'Ukhia Field Desk',
  'Remote Field Operations'
];

const DEPARTMENTS = [
  'Directorate General HQ',
  'HR & Admin',
  'Programs Directorate',
  'Finance & Grants',
  'Field Logistics & Relief',
  'IT & Systems Desk',
  'Legal & Compliance Desk'
];

const AVATAR_PRESETS = [
  { label: 'Chairman (Hijabi)', url: HIJABI_CHAIRMAN_AVATAR },
  { label: 'Executive Director', url: MALE_EXECUTIVE_AVATAR },
  { label: 'Program Officer', url: MALE_OFFICER_AVATAR },
  { label: 'IT Officer', url: IT_OFFICER_AVATAR },
  { label: 'Law Officer', url: LAW_OFFICER_AVATAR }
];

export default function MyProfilePage() {
  const [profile, setProfile] = useState<UserProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState('');

  // Form Fields (Editable for current user)
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dutyStation, setDutyStation] = useState('Dhaka HQ');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('Programs Directorate');
  const [requestedRole, setRequestedRole] = useState<SystemRole>('Program Officer');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const loadMyProfile = async () => {
      const users = await UserApprovalService.getAllUsers();
      const storedAuthor = typeof window !== 'undefined' ? localStorage.getItem('skb_current_community_author') : null;
      const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('skb_current_user_email') : null;

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      let active: UserProfileRecord | undefined;

      // Match Priority 1: Supabase Authenticated User
      if (user) {
        const email = user.email || '';
        const metaName = user.user_metadata?.full_name;
        active = users.find(
          u => u.email.toLowerCase() === email.toLowerCase() || (metaName && u.fullName.toLowerCase() === metaName.toLowerCase())
        );
      }

      // Match Priority 2: Stored Active Session
      if (!active && (storedAuthor || storedEmail)) {
        active = users.find(
          u => (storedAuthor && u.fullName.toLowerCase() === storedAuthor.toLowerCase()) ||
               (storedEmail && u.email.toLowerCase() === storedEmail.toLowerCase())
        );
      }

      // Default fallback to Daloyar Hassan (Super Admin / HR)
      if (!active) {
        active = users[2] || users[0];
      }

      if (active) {
        setProfile(active);
        setFullName(active.fullName);
        setPhone(active.phone || '+880 1711-000000');
        setDutyStation(active.dutyStation || 'Dhaka HQ');
        setDesignation(active.designation || active.requestedRole);
        setDepartment(active.department || 'Programs Directorate');
        setRequestedRole(active.requestedRole || 'Program Officer');
        setAvatarUrl(active.avatarUrl || getOfficialAvatar(active));
        setBio(active.bio || '');
        setEmployeeId(active.employeeId || 'SKB-001');
      }
      setLoading(false);
    };

    loadMyProfile();
  }, []);

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
    try {
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

      if (updated) {
        setProfile(updated);
        if (typeof window !== 'undefined') {
          localStorage.setItem('skb_current_community_author', updated.fullName);
          localStorage.setItem('skb_current_user_email', updated.email);
          localStorage.setItem(`skb_presence_${updated.fullName.trim().toLowerCase()}`, Date.now().toString());
        }
        setSaveToast('Your official profile & ID badge have been saved successfully!');
        setTimeout(() => setSaveToast(''), 4000);
      }
    } catch (err: any) {
      alert('Failed to save profile: ' + (err?.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-bold">Loading your official desk...</p>
      </div>
    );
  }

  // Determine responsible area gateways based on role
  const designationStr = (profile.designation || profile.requestedRole || '').toLowerCase();
  const departmentStr = (profile.department || '').toLowerCase();
  const nameStr = profile.fullName.toLowerCase();

  const isSuperAdmin = nameStr.includes('daloyar') || departmentStr.includes('hr') || designationStr.includes('admin');
  const isDirector = designationStr.includes('director') || nameStr.includes('huraira');
  const isChairman = designationStr.includes('chairman') || nameStr.includes('orakatul');
  const isIT = designationStr.includes('it') || departmentStr.includes('it');
  const isLaw = designationStr.includes('law') || departmentStr.includes('legal');

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Toast */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Top Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-500">
          <Link href="/dashboard" className="font-black text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 transition">
            <LayoutDashboard className="w-3.5 h-3.5" /> Staff Workspace
          </Link>
          <span className="text-slate-400">&rsaquo;</span>
          <span className="font-bold text-slate-800">My Profile & Responsible Desk</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Authorized Officer • Active Accreditation</span>
          </span>
        </div>
      </div>

      {/* Main Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
            <Building2 className="w-4 h-4" /> Small Kindness Bangladesh • Directorate General HQ
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{fullName}</span>
            <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-bold">
              {designation}
            </span>
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl">
            Official operational credentials and personal identity settings. Changes saved here reflect across project charters, compliance vouchers, and live community desks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/community"
            className="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span>Open HQ Community</span>
          </Link>
          <Link
            href="/dashboard"
            className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>My Workspace Desk</span>
          </Link>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: EDITABLE PARAMETERS & RESPONSIBLE WORK AREA (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Form: Personal Parameters */}
          <form onSubmit={handleSaveProfile} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  Personal Credentials & Contact Parameters
                </h2>
                <p className="text-xs text-slate-500">
                  Manage your personal contact details, staff photo, and station assignment.
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-400">ID: {employeeId}</span>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="image/png,image/jpeg,image/jpg"
            />

            {/* Photo Selection Row */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-blue-600" /> Official Staff Photo
              </label>
              
              <div className="flex flex-wrap items-center gap-4">
                <img
                  src={avatarUrl || getOfficialAvatar({ fullName, requestedRole, designation })}
                  alt={fullName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-sm bg-white shrink-0"
                />

                <div className="space-y-2 flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-600" />
                      <span>Upload from Device</span>
                    </button>
                    <span className="text-[10px] text-slate-400">Max 2MB (PNG/JPG)</span>
                  </div>

                  {/* Preset Quick Select */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400">Presets:</span>
                    {AVATAR_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setAvatarUrl(preset.url)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border font-semibold transition ${
                          avatarUrl === preset.url
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Name & Email Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Full Legal Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Registered Work Email</span>
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                </label>
                <input
                  type="email"
                  value={profile.email}
                  readOnly
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100/70 text-xs font-mono text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Phone & Duty Station Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" /> Contact Phone / WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+880 1711-XXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" /> Official Duty Station
                </label>
                <select
                  value={dutyStation}
                  onChange={(e) => setDutyStation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  {DUTY_STATIONS.map((station) => (
                    <option key={station} value={station}>{station}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Designation & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Official Designation / Title</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Department / Directorate</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Employee ID Badge */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Official Staff Badge Number</label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="SKB-PRG-001"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Bio / Humanitarian Scope */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Professional Background & Operational Scope</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => {
                  setBio(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                }}
                placeholder="Brief summary of humanitarian responsibilities, field coordination, and operational experience..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed resize-none min-h-[72px] max-h-[200px] overflow-y-auto whitespace-pre-wrap break-words [word-break:break-word]"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-[11px] text-slate-400">Changes reflect instantly across the portal</span>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'Saving Changes...' : 'Save My Desk Profile & ID Badge'}</span>
              </button>
            </div>
          </form>

          {/* Connected Responsible Operational Area */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  My Responsible Operational Mandate
                </h3>
                <p className="text-xs text-slate-500">
                  Direct portals and execution desks connected to your assigned role in SKB.
                </p>
              </div>
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full">
                Active Mandate
              </span>
            </div>

            {/* Dynamic Role Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Executive Director Mandate */}
              {isDirector && (
                <>
                  <Link
                    href="/dashboard"
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-2xl flex items-start gap-3 transition group shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600">Publication Gate Sign-Off</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Certify and publish compliance files to foreign partner workspaces.</p>
                    </div>
                  </Link>

                  <Link
                    href="/finance/approvals"
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-2xl flex items-start gap-3 transition group shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600">Finance & Grant Approvals</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Authorizations for project budget tranches and vendor vouchers.</p>
                    </div>
                  </Link>
                </>
              )}

              {/* Super Admin / HR Mandate (Daloyar Hassan) */}
              {isSuperAdmin && (
                <>
                  <Link
                    href="/admin/users"
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-2xl flex items-start gap-3 transition group shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600">Users & Access Management</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Approve new joining personnel and manage role credentials.</p>
                    </div>
                  </Link>

                  <Link
                    href="/admin/audit-log"
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-2xl flex items-start gap-3 transition group shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-800 flex items-center justify-center shrink-0">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600">System Audit Trail</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Inspect immutable security timestamps and access actions.</p>
                    </div>
                  </Link>
                </>
              )}

              {/* IT Officer Mandate */}
              {isIT && (
                <Link
                  href="/admin/audit-log"
                  className="p-3.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-2xl flex items-start gap-3 transition group shadow-xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600">IT Systems & Audit Trail</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Cloud storage, database synchronization, and system logs.</p>
                  </div>
                </Link>
              )}

              {/* Law Officer Mandate */}
              {isLaw && (
                <Link
                  href="/projects"
                  className="p-3.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-2xl flex items-start gap-3 transition group shadow-xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600">Legal Vetting & Compliance</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">FD-6/FD-7 regulatory vetting and government clearances.</p>
                  </div>
                </Link>
              )}

              {/* Program Officers Mandate */}
              <Link
                href="/projects"
                className="p-3.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-2xl flex items-start gap-3 transition group shadow-xs"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <FolderKanban className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600">Form-3 Master Charters</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Manage project scope, deliverables, and donor milestone tracking.</p>
                </div>
              </Link>

              <Link
                href="/beneficiaries"
                className="p-3.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-2xl flex items-start gap-3 transition group shadow-xs"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600">Beneficiary Registry</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Biometric & field validation of aid recipients across projects.</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE OFFICIAL ID BADGE PREVIEW (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-20 space-y-4">
            
            {/* ID Badge Container */}
            <div className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-700 text-white space-y-5">
              
              {/* Badge Top Header */}
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-4">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">Humanitarian Mission</span>
                  <h3 className="text-sm font-black tracking-tight text-white">SMALL KINDNESS BANGLADESH</h3>
                  <p className="text-[9px] text-slate-400">NGO Affairs Bureau Reg: #2847</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center font-black text-white text-sm shrink-0">
                  SKB
                </div>
              </div>

              {/* Officer Photo & Core Identity */}
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="relative">
                  <img
                    src={avatarUrl || getOfficialAvatar({ fullName, requestedRole, designation })}
                    alt={fullName}
                    className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-xl bg-white"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1 rounded-full border-2 border-slate-900 shadow">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <h4 className="text-base font-black text-white tracking-wide">{fullName || 'Staff Member'}</h4>
                  <p className="text-xs font-bold text-amber-400">{designation || requestedRole}</p>
                  <p className="text-[11px] text-slate-300 flex items-center justify-center gap-1.5 pt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>{department}</span>
                  </p>
                </div>
              </div>

              {/* ID Metadata Fields */}
              <div className="pt-3 border-t border-slate-700/80 space-y-2 text-xs">
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
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Staff ID Badge:</span>
                  <span className="font-mono font-bold text-amber-400 text-xs">{employeeId}</span>
                </div>
              </div>

              {/* Badge Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="w-8 h-8 text-slate-400 shrink-0" />
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

            {/* Transparency Note */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-1 shadow-xs">
              <span className="font-black text-slate-800 flex items-center gap-1.5">
                <Globe2 className="w-4 h-4 text-blue-600" /> Official Transparency Guarantee
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                When international donors (IHH Turkey, UMUT OL, Mavi Marmara, or QWCQP) inspect project charters or financial vouchers, this verified badge data is displayed on the audit trail.
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
