import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../database.types';
import { getSupabaseServiceRoleKey, getSupabaseUrl } from './env';

/**
 * Server-only Admin Supabase Client using the SERVICE_ROLE_KEY.
 * It BYPASSES Row Level Security. NEVER import it in browser components, and only call
 * it after the caller has been authenticated and authorised (see src/lib/auth/guards.ts).
 */
export function createAdminClient() {
  return createClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
