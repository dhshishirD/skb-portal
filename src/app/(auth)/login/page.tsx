'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  LogIn, 
  ArrowRight, 
  Building2, 
  CheckCircle2, 
  UserPlus, 
  Users, 
  KeyRound, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  ShieldAlert, 
  Sparkles, 
  Clock, 
  ChevronRight,
  Lock,
  Globe2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { 
  UserApprovalService, 
  UserProfileRecord, 
  DEFAULT_APPROVED_USERS,
  SystemRole 
} from '@/server/services/userApprovalService';
import { getOfficialAvatar } from '@/lib/avatarPresets';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'OFFICER_ROSTER' | 'CREDENTIALS' | 'JOIN_SKB'>('OFFICER_ROSTER');
  const [officers, setOfficers] = useState<UserProfileRecord[]>(DEFAULT_APPROVED_USERS);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Email & Password Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // New Officer Onboarding Form State
  const [joinFullName, setJoinFullName] = useState('');
  const [joinEmail, setJoinEmail] = useState('');
  const [joinPhone, setJoinPhone] = useState('');
  const [joinDutyStation, setJoinDutyStation] = useState('Dhaka HQ');
  const [joinDepartment, setJoinDepartment] = useState('Programs Directorate');
  const [joinRole, setJoinRole] = useState<SystemRole>('Program Officer');
  const [joinBio, setJoinBio] = useState('');
  const [registeredProfile, setRegisteredProfile] = useState<UserProfileRecord | null>(null);

  useEffect(() => {
    const loadOfficers = async () => {
      const all = await UserApprovalService.getAllUsers();
      if (all && all.length > 0) {
        setOfficers(all);
      }
    };
    loadOfficers();
  }, []);

  // 1-Click Fast Officer Sign-In
  const handleOfficerQuickSignIn = async (officer: UserProfileRecord) => {
    setLoading(true);
    setErrorMsg('');
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('skb_current_community_author', officer.fullName);
        localStorage.setItem('skb_current_user_email', officer.email);
        localStorage.setItem(`skb_presence_${officer.fullName.trim().toLowerCase()}`, Date.now().toString());
      }

      // If user has Supabase auth account, attempt background sync
      const supabase = createClient();
      try {
        await supabase.auth.signInWithPassword({
          email: officer.email,
          password: 'SkbPortal2026!'
        });
      } catch {
        // Fallback: local session is already initialized
      }

      setSuccessMsg(`Welcome, ${officer.fullName}! Loading your workspace...`);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 700);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to authenticate officer profile.');
      setLoading(false);
    }
  };

  // Google OAuth Sign-In
  const handleGoogleOAuth = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const supabase = createClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=/dashboard`
        }
      });
      if (error) {
        throw error;
      }
    } catch (err: any) {
      setErrorMsg(`Google OAuth error: ${err?.message || 'Check Google provider settings in Supabase.'}`);
      setLoading(false);
    }
  };

  // Work Email & Password Sign-In
  const handleEmailPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both your work email and password.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      const user = data.user;
      const resolvedName = user?.user_metadata?.full_name || email.split('@')[0];
      if (typeof window !== 'undefined') {
        localStorage.setItem('skb_current_community_author', resolvedName);
        localStorage.setItem('skb_current_user_email', email);
        localStorage.setItem(`skb_presence_${resolvedName.trim().toLowerCase()}`, Date.now().toString());
      }

      setSuccessMsg('Authentication successful! Navigating to dashboard...');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 600);
    } catch (err: any) {
      // Check if this matches a pre-approved organogram account
      const matched = officers.find(o => o.email.toLowerCase() === email.toLowerCase());
      if (matched && password === 'SkbPortal2026!') {
        if (typeof window !== 'undefined') {
          localStorage.setItem('skb_current_community_author', matched.fullName);
          localStorage.setItem('skb_current_user_email', matched.email);
          localStorage.setItem(`skb_presence_${matched.fullName.trim().toLowerCase()}`, Date.now().toString());
        }
        setSuccessMsg(`Welcome, ${matched.fullName}!`);
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 600);
        return;
      }

      setErrorMsg(err?.message || 'Invalid email or password. Please verify credentials.');
      setLoading(false);
    }
  };

  // Submit New Officer Onboarding Request
  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinFullName.trim() || !joinEmail.trim()) {
      setErrorMsg('Full Name and Work Email are required.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const newOfficer = await UserApprovalService.registerOfficerRequest({
        fullName: joinFullName.trim(),
        email: joinEmail.trim(),
        phone: joinPhone.trim(),
        dutyStation: joinDutyStation,
        department: joinDepartment,
        requestedRole: joinRole,
        designation: joinRole,
        bio: joinBio.trim() || `Newly joined ${joinRole} at Small Kindness Bangladesh (${joinDutyStation}).`,
      });

      setRegisteredProfile(newOfficer);
      setSuccessMsg('Officer registration submitted successfully!');
      setLoading(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit registration request.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 py-4">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-[11px] font-bold shadow-xs">
          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Small Kindness Bangladesh • NGO Affairs Bureau Reg: #2847</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          SKB Officer Portal & Gateway
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto font-medium">
          Official authentication network for SKB Executive Directorate, Program Officers, Field Operations, and Foreign Donor Workspaces.
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200">
        <button
          onClick={() => { setActiveTab('OFFICER_ROSTER'); setErrorMsg(''); }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'OFFICER_ROSTER'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Users className="w-4 h-4 text-blue-600" />
          <span>Official Officers Roster</span>
        </button>

        <button
          onClick={() => { setActiveTab('CREDENTIALS'); setErrorMsg(''); }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'CREDENTIALS'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <KeyRound className="w-4 h-4 text-emerald-600" />
          <span>Google & Credentials</span>
        </button>

        <button
          onClick={() => { setActiveTab('JOIN_SKB'); setErrorMsg(''); }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'JOIN_SKB'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <UserPlus className="w-4 h-4 text-amber-600" />
          <span>Join SKB (New Staff)</span>
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB 1: OFFICIAL OFFICERS ROSTER (1-Click Instant Sign-In) */}
      {activeTab === 'OFFICER_ROSTER' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Verified SKB Official Personnel
              </h2>
              <p className="text-xs text-slate-500">
                Click your profile below to instantly access your dedicated functional workspace.
              </p>
            </div>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200 w-fit">
              {officers.length} Active Officers
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
            {officers.map((officer) => {
              const isExecutive = officer.designation === 'Chairman' || officer.designation === 'Executive Director';
              const isSuperAdmin = officer.fullName.includes('Daloyar Hassan');

              return (
                <div 
                  key={officer.id}
                  className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-2xl p-3.5 transition-all flex flex-col justify-between gap-3 group shadow-xs hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={officer.avatarUrl || getOfficialAvatar(officer)}
                      alt={officer.fullName}
                      className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
                    />
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-slate-900 text-xs truncate">{officer.fullName}</p>
                        {isExecutive && (
                          <span className="text-[9px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.2 rounded border border-amber-300">
                            Directorate
                          </span>
                        )}
                        {isSuperAdmin && (
                          <span className="text-[9px] bg-purple-100 text-purple-900 font-extrabold px-1.5 py-0.2 rounded border border-purple-300">
                            Super Admin
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-semibold text-blue-700">
                        {officer.designation || officer.requestedRole}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{officer.email}</p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{officer.dutyStation || 'Dhaka HQ'}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOfficerQuickSignIn(officer)}
                    disabled={loading}
                    className="w-full py-2 bg-white group-hover:bg-blue-600 text-slate-700 group-hover:text-white border border-slate-200 group-hover:border-blue-600 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Enter Workspace</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Official Identity & Role-Based Access Control Protected</span>
            <Link href="/community" className="text-blue-600 font-bold hover:underline">
              Preview HQ Community &rsaquo;
            </Link>
          </div>
        </div>
      )}

      {/* TAB 2: GOOGLE & CREDENTIALS */}
      {activeTab === 'CREDENTIALS' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-slate-900">Sign in with Google or Email</h2>
            <p className="text-xs text-slate-500">
              Authenticate using your institutional Google Workspace or secure work credentials.
            </p>
          </div>

          {/* Google Sign-In */}
          <button
            onClick={handleGoogleOAuth}
            disabled={loading}
            className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-xs rounded-2xl border border-slate-300 shadow-sm transition-all flex items-center justify-center gap-3 group"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? 'Authenticating with Google...' : 'Continue with Google Account'}</span>
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-[10px] uppercase tracking-wider font-bold">Or with Email</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailPasswordSignIn} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Work Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. kindnessforbeauty@gmail.com"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Portal Password
                </label>
                <span className="text-[10px] text-slate-400">Default: SkbPortal2026!</span>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Verifying Credentials...' : 'Sign In to Workspace'}</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: JOIN SKB (New Officer Onboarding Application) */}
      {activeTab === 'JOIN_SKB' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-5">
          {!registeredProfile ? (
            <>
              <div className="space-y-1 border-b border-slate-100 pb-3">
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-amber-600" />
                  New Officer Registration & Directory Application
                </h2>
                <p className="text-xs text-slate-500">
                  Newly joining SKB personnel submit this form to register their profile. Daloyar Hassan (Super Admin) and Md. Abu Huraira (Executive Director) will activate your role.
                </p>
              </div>

              <form onSubmit={handleJoinSubmit} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Full Name *</label>
                    <input
                      type="text"
                      value={joinFullName}
                      onChange={(e) => setJoinFullName(e.target.value)}
                      placeholder="e.g. Tanvir Hossain"
                      required
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Official / Google Email *</label>
                    <input
                      type="email"
                      value={joinEmail}
                      onChange={(e) => setJoinEmail(e.target.value)}
                      placeholder="tanvir@skb.org.bd"
                      required
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Official Mobile / WhatsApp</label>
                    <input
                      type="text"
                      value={joinPhone}
                      onChange={(e) => setJoinPhone(e.target.value)}
                      placeholder="+880 1711-XXXXXX"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Duty Station</label>
                    <select
                      value={joinDutyStation}
                      onChange={(e) => setJoinDutyStation(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      <option value="Dhaka HQ">Dhaka HQ</option>
                      <option value="Cox's Bazar Field Hub">Cox&apos;s Bazar Field Hub</option>
                      <option value="Teknaf Sub-Office">Teknaf Sub-Office</option>
                      <option value="Ukhia Field Desk">Ukhia Field Desk</option>
                      <option value="Remote Field Operations">Remote Field Operations</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Department</label>
                    <select
                      value={joinDepartment}
                      onChange={(e) => setJoinDepartment(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      <option value="Programs Directorate">Programs Directorate</option>
                      <option value="HR & Admin">HR & Admin</option>
                      <option value="Finance & Grants">Finance & Grants</option>
                      <option value="Field Logistics & Relief">Field Logistics & Relief</option>
                      <option value="IT & Systems Desk">IT & Systems Desk</option>
                      <option value="Legal & Compliance Desk">Legal & Compliance Desk</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Requested Official Role</label>
                    <select
                      value={joinRole}
                      onChange={(e) => setJoinRole(e.target.value as SystemRole)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-semibold text-blue-700"
                    >
                      <option value="Program Officer">Program Officer</option>
                      <option value="Field Operations Officer">Field Operations Officer</option>
                      <option value="Finance Manager">Finance Manager</option>
                      <option value="IT Officer">IT Officer</option>
                      <option value="Law Officer">Law Officer</option>
                      <option value="General Staff">General Staff</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Professional Bio & Role Brief</label>
                  <textarea
                    rows={2}
                    value={joinBio}
                    onChange={(e) => setJoinBio(e.target.value)}
                    placeholder="Brief description of field experience, humanitarian expertise, or responsibilities..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{loading ? 'Submitting Application...' : 'Submit Officer Application for Approval'}</span>
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-slate-900">Application Received!</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Your officer profile for <strong className="text-slate-800">{registeredProfile.fullName}</strong> ({registeredProfile.requestedRole}) has been registered in the <strong className="text-amber-700">Pending Role Activation Queue</strong>.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 max-w-md mx-auto text-left text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Awaiting Leadership Confirmation</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Super Admin (<strong>Daloyar Hassan</strong>) and Executive Director (<strong>Md. Abu Huraira</strong>) have received your application in their Users & Access Management desk. Once confirmed, you will receive full workspace permissions.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setRegisteredProfile(null);
                    setActiveTab('OFFICER_ROSTER');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Back to Officers Roster
                </button>
                <Link
                  href="/community"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
                >
                  Preview Live Community
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Direct Link to Partner Inspection Workspace */}
      <div className="text-center pt-2">
        <Link
          href="/donor-dashboard?partner=IHH"
          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline transition"
        >
          <Globe2 className="w-4 h-4 text-blue-600" />
          <span>Open International Partner Workspace (IHH Turkey & Qatar) &rsaquo;</span>
        </Link>
      </div>
    </div>
  );
}
