import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The signed-in user's id, with the session token verified on the server.
 *
 * getClaims() checks the token's signature locally against Supabase's published signing keys
 * (cached), so it does not call Supabase Auth on every request. If the project still uses the
 * legacy shared secret, the library falls back to asking Supabase Auth, so this is never less
 * strict than before. It refreshes an expiring session as getUser() did.
 *
 * Use it where the account is ALSO checked against the database (profiles.is_active, roles):
 * a person who is deactivated is refused immediately, whatever their token says.
 * Keep getUser() for flows that must see a revoked session at once (password / MFA changes).
 */
export async function getVerifiedUserId(supabase: SupabaseClient<any, any, any>): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) return null;
    const sub = data.claims.sub;
    return typeof sub === 'string' && sub.length > 0 ? sub : null;
  } catch {
    return null;
  }
}
