'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { authCallbackUrl, getSiteUrl } from '@/lib/siteUrl';
import { validatePassword } from '@/lib/auth/passwordPolicy';

// NOTE: Next.js `redirect()` works by throwing. Every redirect below is therefore called
// OUTSIDE try/catch blocks; a redirect inside `try` would be swallowed by `catch` and the
// user would be sent to the success page even when the action failed.

export async function signOutAction(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Signing out is best-effort; the user is sent to /login either way.
  }
  redirect('/login');
}

export async function setPasswordAction(formData: FormData): Promise<void> {
  const password = String(formData.get('password') ?? '');

  const policyError = validatePassword(password);
  if (policyError) {
    redirect(`/set-password?error=${encodeURIComponent(policyError)}`);
  }

  let errorMessage: string | null = null;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) errorMessage = error.message;
  } catch {
    errorMessage = 'Could not update the password. Please open the reset link again.';
  }

  if (errorMessage) {
    redirect(`/set-password?error=${encodeURIComponent(errorMessage)}`);
  }
  redirect('/dashboard');
}

export async function resetPasswordAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email) {
    redirect('/reset-password?error=Email+address+is+required');
  }

  let failed = false;
  try {
    const siteUrl = getSiteUrl(headers());
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authCallbackUrl(siteUrl, '/set-password'),
    });
    if (error) {
      // Rate limits and config problems are logged server-side only. The user always sees
      // the same message so the form cannot be used to discover which emails have accounts.
      console.error('resetPasswordForEmail failed:', error.message);
      // Only rate limits and outages are shown; "unknown email" style errors are not.
      failed = error.status === 429 || !error.status || error.status >= 500;
    }
  } catch (err) {
    console.error('resetPasswordAction error:', err);
    failed = true;
  }

  if (failed) {
    redirect('/reset-password?error=Could+not+send+the+email+right+now.+Please+try+again+in+a+few+minutes.');
  }
  redirect(
    '/reset-password?success=If+that+address+has+a+portal+account%2C+a+reset+link+is+on+its+way.'
  );
}
