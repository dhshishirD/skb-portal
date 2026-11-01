'use client';

import { useState } from 'react';
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
import { safeRedirectPath } from '@/lib/auth/safeRedirect';

function nextPathFromUrl(): string {
  if (typeof window === 'undefined') return '/home';
  return safeRedirectPath(new URLSearchParams(window.location.search).get('next'));
}

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'CREDENTIALS' | 'JOIN_SKB'>('CREDENTIALS');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Email & Password Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // New Officer Onboarding Form State

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
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPathFromUrl())}`
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

      setSuccessMsg('Authentication successful! Navigating to your workspace...');
      setTimeout(() => {
        window.location.href = nextPathFromUrl();
      }, 600);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid email or password. Please verify credentials.');
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
          <span>New staff? How to get access</span>
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
                placeholder="name@skb.org.bd"
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
                <Link href="/reset-password" className="text-[10px] font-bold text-blue-600 hover:underline">
                  Forgot password?
                </Link>
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

      {/* TAB: JOINING SKB (accounts are invite-only) */}
      {activeTab === 'JOIN_SKB' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-3 text-sm text-slate-700">
          <h2 className="text-base font-extrabold text-slate-900">New to SKB?</h2>
          <p>
            Portal accounts are created by invitation only. Ask HR &amp; Admin or the Executive Director to invite you.
            They will set your role, and you will receive an email to choose your own password.
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-600">
            <li>Open the invitation email and click the link.</li>
            <li>Choose a password (at least 10 characters, with upper-case, lower-case and a number).</li>
            <li>You land on your own desk. Leadership accounts also set up two-step verification.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
