import { NextResponse } from 'next/server';

/**
 * Public uptime check. It touches no application data: anonymous users have no table
 * access (migrations 0001/0008), so it asks Supabase Auth's health endpoint instead.
 */
export const dynamic = 'force-dynamic';

async function ping(url: string, apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: { apikey: apiKey },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  const startTime = Date.now();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let dbStatus: 'healthy' | 'unreachable' = 'unreachable';
  if (supabaseUrl && anonKey) {
    // Supabase Auth's health endpoint; Auth itself depends on the database being up.
    const ok = await ping(`${supabaseUrl.replace(/\/+$/, '')}/auth/v1/health`, anonKey);
    dbStatus = ok ? 'healthy' : 'unreachable';
  }
  const latencyMs = Date.now() - startTime;

  return NextResponse.json(
    {
      status: dbStatus === 'healthy' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: { status: dbStatus, latencyMs },
    },
    { status: dbStatus === 'healthy' ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  );
}
