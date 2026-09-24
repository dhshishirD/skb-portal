import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'healthy';
  let latencyMs = 0;

  try {
    const supabase = await createClient();
    const { error } = await supabase.from('organizations').select('id').limit(1);
    latencyMs = Date.now() - startTime;

    if (error) {
      dbStatus = 'degraded';
    }
  } catch {
    dbStatus = 'unreachable';
  }

  return NextResponse.json(
    {
      status: dbStatus === 'healthy' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        latencyMs,
      },
      environment: process.env.NODE_ENV || 'development',
    },
    { status: dbStatus === 'healthy' ? 200 : 503 }
  );
}
