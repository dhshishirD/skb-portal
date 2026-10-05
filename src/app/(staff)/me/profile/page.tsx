'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, ShieldCheck, Clock, CheckCircle2, Building2, Save, Sparkles, AlertCircle } from 'lucide-react';
import { UserApprovalService, UserProfileRecord } from '@/server/services/userApprovalService';

export default function UserProfilePage() {
  const [profile, setProfile] = useState<UserProfileRecord | null>(null);
  const [requestedRole, setRequestedRole] = useState<UserProfileRecord['requestedRole']>('Program Officer');
  const [department, setDepartment] = useState('Operations & Projects');
  const [saveToast, setSaveToast] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      // Default to currentUser or first pending user
      const allUsers = await UserApprovalService.getAllUsers();
      const currentUser = allUsers.find(u => u.status === 'PENDING_APPROVAL') || allUsers[0];
      if (currentUser) {
        setProfile(currentUser);
        setRequestedRole(currentUser.requestedRole);
        setDepartment(currentUser.department);
      }
    };
    loadProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const updated = await UserApprovalService.updateRequestedRole(profile.id, requestedRole, department);
    if (updated) {
      setProfile(updated);
      setSaveToast('Profile details updated! Administrator notified for role approval.');
      setTimeout(() => setSaveToast(''), 4000);
    }
  };

  if (!profile) {
    return (
      <div className="p-8 text-center text-slate-400">
        Loading user profile details...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <Link href="/dashboard" className="hover:underline">Staff Workspace</Link> &rsaquo;
          <span className="font-semibold text-slate-800">My Profile & Role Directory</span>
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          Officer Profile & Access Activation
        </h1>
        <p className="text-xs text-slate-500">
          Manage your personal details and request organizational roles & project access.
        </p>
      </div>

      {/* Account Status Banner */}
      {profile.status === 'PENDING_APPROVAL' ? (
        <div className="bg-amber-50 border border-amber-300 p-5 rounded-2xl text-amber-950 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-extrabold text-amber-900 text-sm">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Account Pending Administrator Approval</span>
            </div>
            <span className="text-[10px] bg-amber-200 text-amber-900 font-extrabold px-3 py-1 rounded-full uppercase border border-amber-300">
              Pending Activation
            </span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Your Google Account is registered! You can organize your profile details below. An Administrator will receive an instant notification to confirm your role and unlock full access to all portal features.
          </p>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl text-emerald-950 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-extrabold text-emerald-900 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Full Access Authorized & Active</span>
            </div>
            <span className="text-[10px] bg-emerald-200 text-emerald-900 font-extrabold px-3 py-1 rounded-full uppercase border border-emerald-300">
              Active Member
            </span>
          </div>
          <p className="text-xs text-emerald-800">
            Approved by <strong>{profile.approvedBy || 'System Administrator'}</strong> on {profile.approvedAt || '2026-01-01'}.
          </p>
        </div>
      )}

      {saveToast && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600" /> {saveToast}
        </div>
      )}

      {/* Profile Form Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.fullName} className="w-16 h-16 rounded-full object-cover border-2 border-blue-600" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-extrabold text-xl flex items-center justify-center">
              {profile.fullName.charAt(0)}
            </div>
          )}
          <div>
            <h2 className="text-base font-extrabold text-slate-900">{profile.fullName}</h2>
            <p className="text-xs text-slate-500 font-mono">{profile.email}</p>
            <span className="inline-block mt-1 text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded">
              Registered: {profile.createdAt}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Requested Organizational Role *</label>
              <select
                value={requestedRole}
                onChange={(e) => setRequestedRole(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
              >
                <option value="Program Officer">Program Officer (Projects, Logframe & Form-7)</option>
                <option value="Field Operations Officer">Field Operations Officer (Teknaf, Cox&apos;s Bazar PWA)</option>
                <option value="Finance Manager">Finance Manager (Approvals & Requisitions)</option>
                <option value="Executive Director">Executive Director (Directorate Approvals)</option>
                <option value="IT & Admin Officer">IT & Admin Officer (System Administrator)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Department / Division *</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Operations & Project Directorate"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Profile Details
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
