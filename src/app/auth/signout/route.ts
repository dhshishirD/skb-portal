import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Ends the Supabase session (clears auth cookies) and returns to the login page. */
async function signOut(request: Request) {
  const { origin } = new URL(request.url);
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Even if the remote sign-out fails, send the user to the login page.
  }
  const response = NextResponse.redirect(new URL('/login', origin), { status: 303 });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export const GET = signOut;
export const POST = signOut;
