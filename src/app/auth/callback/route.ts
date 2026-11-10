import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeRedirectPath } from '@/lib/auth/safeRedirect';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeRedirectPath(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // No usable one-time code: the link may carry its tokens after "#" (emails sent from the Admin
  // screen). The server cannot see that part, so the browser finishes the sign-in on /auth/finish.
  return NextResponse.redirect(new URL(`/auth/finish?next=${encodeURIComponent(next)}`, origin));
}
