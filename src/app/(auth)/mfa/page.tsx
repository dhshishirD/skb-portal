'use client';

import { useState } from 'react';
import { ShieldAlert, KeyRound } from 'lucide-react';
import Link from 'next/link';

export default function MfaPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Please enter a valid 6-digit TOTP verification code.');
      return;
    }
    setError('');
    window.location.href = '/dashboard';
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">MFA Verification Required</h2>
        <p className="text-xs text-slate-600">
          Your role (Super Admin, Executive, Finance, or PM) requires Multi-Factor Authentication (TOTP).
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
        <p className="text-xs font-semibold text-slate-700">1. Scan QR Code in Authenticator App</p>
        <div className="w-36 h-36 bg-slate-200 rounded-lg mx-auto flex items-center justify-center text-slate-400 text-xs font-mono">
          [TOTP QR Code]
        </div>
        <p className="text-[11px] text-slate-500 text-center">
          Use Google Authenticator, Authy, or 1Password.
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            2. Enter 6-Digit Code
          </label>
          <div className="relative">
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="w-full px-3 py-2 text-center text-lg font-mono tracking-widest border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          </div>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
        >
          Verify & Continue
        </button>
      </form>

      <div className="text-center pt-2">
        <Link href="/login" className="text-xs text-slate-500 hover:underline">
          Cancel & Return to Login
        </Link>
      </div>
    </div>
  );
}
