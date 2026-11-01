import { createBrowserClient } from '@supabase/ssr';
import { Database } from '../database.types';
import { getSupabaseAnonKey, getSupabaseUrl } from './env';

export function createClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
}
