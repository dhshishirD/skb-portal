import 'server-only';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export type GuardResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

/**
 * Verifies the caller's Supabase session on the server (getUser() re-validates the JWT
 * with Supabase Auth; never trust getSession() or client-side state for authorisation).
 *
 * Use at the top of every API route handler that is not a public webhook:
 *   const guard = await requireUser();
 *   if (!guard.ok) return guard.response;
 */
export async function requireUser(): Promise<GuardResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      };
    }
    return { ok: true, user };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
}
