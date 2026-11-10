'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { safeRedirectPath } from '@/lib/auth/safeRedirect';

/**
 * Finishes a sign-in link that comes back with the tokens in the part of the address after "#".
 * That happens for invite and password-reset emails sent from the Admin screen (no browser started
 * the request, so the usual one-time code cannot be exchanged on the server). A server cannot see
 * the part after "#", so the browser reads it here, starts the session and moves on.
 */
export default function FinishAuthPage() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const next = safeRedirectPath(new URLSearchParams(window.location.search).get('next'), '/set-password');
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');
    const linkError = hash.get('error_description');

    if (!accessToken || !refreshToken) {
      setMessage(linkError ? 'This link has expired or was already used.' : 'This link is not valid any more.');
      return;
    }
    createClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          setMessage('This link has expired or was already used.');
          return;
        }
        // Remove the tokens from the address bar and history before leaving.
        window.history.replaceState(null, '', window.location.pathname);
        window.location.assign(next);
      })
      .catch(() => setMessage('Could not finish signing in. Please try again.'));
  }, []);

  if (!message) return <p className="p-8 text-sm text-slate-600 text-center">Signing you in…</p>;
  return (
    <div className="max-w-sm mx-auto p-8 text-center space-y-3">
      <p role="alert" className="text-sm text-red-700">{message}</p>
      <p className="text-xs text-slate-500">
        Ask for a new link on the <Link href="/reset-password" className="text-blue-600 underline">reset password</Link> page, or <Link href="/login" className="text-blue-600 underline">sign in</Link> with your password.
      </p>
    </div>
  );
}
