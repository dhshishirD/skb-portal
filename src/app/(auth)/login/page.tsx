'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, LogIn, ArrowRight, Building2, CheckCircle2 } from 'lucide-react';
import { UserApprovalService } from '@/server/services/userApprovalService';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);

    // Simulated 1-Click Google Auth Callback
    // Registers or fetches user profile from UserApprovalService
    const googleUser = {
      fullName: 'New Staff Member',
      email: 'new.staff@skb.org.bd',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      requestedRole: 'Program Officer' as const,
    };

    const userProfile = await UserApprovalService.registerGoogleUser(googleUser);

    setTimeout(() => {
      setLoading(false);
      if (userProfile.status === 'APPROVED') {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/me/profile';
      }
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-md mx-auto text-center">
      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">SKB Works Portal</h1>
        <p className="text-xs text-slate-500 font-medium">
          Small Kindness Bangladesh • Multi-Tenant Partner & Staff Portal
        </p>
      </div>

      {/* Primary 1-Click Google Sign-In Container */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="space-y-1">
          <h2 className="text-base font-extrabold text-slate-900">Staff & Partner Authentication</h2>
          <p className="text-xs text-slate-500">
            Sign in with your Google account to request directory access.
          </p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-xs rounded-2xl border border-slate-300 shadow-md transition-all flex items-center justify-center gap-3 group"
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

        <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1 text-left">
          <div className="flex items-center gap-1.5 text-slate-700 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Administrative Role Activation
          </div>
          <p className="text-[10px] text-slate-500">
            First-time sign-ins choose their dedicated directory & requested role. Administrators are notified to approve full feature access.
          </p>
        </div>
      </div>

      {/* Quick Direct Link to Partner Inspection Workspace */}
      <div className="pt-2">
        <Link
          href="/donor-dashboard?partner=IHH"
          className="text-xs text-blue-600 font-bold hover:underline flex items-center justify-center gap-1"
        >
          <span>🇹🇷</span> Open International Partner Workspace &rsaquo;
        </Link>
      </div>
    </div>
  );
}
