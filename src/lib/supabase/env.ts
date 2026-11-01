/**
 * Central Supabase configuration.
 *
 * Values come ONLY from environment variables (Vercel → Project Settings → Environment
 * Variables, or .env.local for development). There are deliberately no hard-coded
 * fallbacks: a missing variable must fail loudly instead of silently connecting to
 * some other database with a leaked key.
 *
 * NEXT_PUBLIC_* values are inlined into the browser bundle at build time, so they must
 * be referenced literally (process.env.NEXT_PUBLIC_X), not via dynamic lookup.
 */

export class MissingSupabaseConfigError extends Error {
  constructor(name: string) {
    super(
      `Missing required environment variable ${name}. ` +
        'Set it in .env.local (development) or in the Vercel project settings (production).'
    );
    this.name = 'MissingSupabaseConfigError';
  }
}

export function getSupabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) throw new MissingSupabaseConfigError('NEXT_PUBLIC_SUPABASE_URL');
  return value;
}

export function getSupabaseAnonKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) throw new MissingSupabaseConfigError('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return value;
}

/** Server-only. Never import this from a client component. */
export function getSupabaseServiceRoleKey(): string {
  if (typeof window !== 'undefined') {
    throw new Error('The Supabase service role key must never be used in the browser.');
  }
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new MissingSupabaseConfigError('SUPABASE_SERVICE_ROLE_KEY');
  return value;
}

/** True when the public Supabase settings are present (used by optional offline fallbacks). */
export function hasSupabaseConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
