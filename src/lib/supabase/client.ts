import { createBrowserClient } from '@supabase/ssr';
import { Database } from '../database.types';

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://vfozkewdnelkgsluntex.supabase.co';

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    'sb_publishable_0N-bsiW8Zxqiri5FEEoRoQ_x0naDUwt';

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
