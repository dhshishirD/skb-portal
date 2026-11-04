import 'server-only';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type { AppRole } from '@/lib/database.types';

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

export type StaffGuardResult =
  | { ok: true; user: User; roles: AppRole[]; fullName: string }
  | { ok: false; response: NextResponse };

/**
 * For API routes that use the service-role client (which bypasses Row Level Security):
 * the caller must be signed in AND an active person AND hold an allowed role.
 * Deactivated accounts, donors, partners and people with no role are refused.
 *
 *   const guard = await requireActiveRole(isStaff);
 *   if (!guard.ok) return guard.response;
 */
export async function requireActiveRole(allowed: (roles: AppRole[]) => boolean): Promise<StaffGuardResult> {
  const deny = (status: 401 | 403, error: string): StaffGuardResult => ({
    ok: false,
    response: NextResponse.json({ error }, { status }),
  });
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return deny(401, 'Unauthorized');

    const [{ data: profile }, { data: roleRows }] = await Promise.all([
      supabase.from('profiles').select('full_name, is_active').eq('id', user.id).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', user.id),
    ]);
    const p = profile as { full_name?: string; is_active?: boolean } | null;
    const roles = ((roleRows ?? []) as Array<{ role: AppRole }>).map((r) => r.role);
    if (!p?.is_active || !allowed(roles)) return deny(403, 'Forbidden');

    return { ok: true, user, roles, fullName: p.full_name ?? '' };
  } catch {
    return deny(401, 'Unauthorized');
  }
}
