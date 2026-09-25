import { createClient } from '@supabase/supabase-js';
import { Database } from '../database.types';

/**
 * Server-only Admin Supabase Client using the SERVICE_ROLE_KEY.
 * NEVER import or expose this client in browser components or public APIs.
 * Must only be invoked after explicit permission checks (e.g. requirePermission('user.manage')).
 */
export function createAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://vfozkewdnelkgsluntex.supabase.co';

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
