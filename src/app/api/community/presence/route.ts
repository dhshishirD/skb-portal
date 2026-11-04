import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireActiveRole } from '@/lib/auth/guards';
import { isStaff } from '@/lib/apiAccess';
import { PRESENCE_TIMEOUT_MS } from '@/lib/polling';

// In-memory cache for fast response
const activeHeartbeats: Map<string, { role: string; lastSeen: number }> = new Map();
const SYSTEM_PROFILE_ID = 'd963309c-1da4-4a4a-947c-c10785d43f1e';

function getCleanName(name: string): string {
  return (name || '').split('(')[0].trim().toLowerCase();
}

export async function GET() {
  const guard = await requireActiveRole(isStaff);
  if (!guard.ok) return guard.response;

  const now = Date.now();

  // 1. Purge expired in-memory heartbeats
  for (const [name, data] of Array.from(activeHeartbeats.entries())) {
    if (now - data.lastSeen > PRESENCE_TIMEOUT_MS) {
      activeHeartbeats.delete(name);
    }
  }

  // 2. Fetch active heartbeats from Supabase to support cross-instance serverless deployments
  try {
    const supabase = createAdminClient();
    const cutoffIso = new Date(now - PRESENCE_TIMEOUT_MS).toISOString();
    
    const { data: dbRecords } = await (supabase.from('notifications') as any)
      .select('id, payload, created_at')
      .eq('kind', 'community_presence')
      .gte('created_at', cutoffIso)
      .order('created_at', { ascending: false });

    if (dbRecords && dbRecords.length > 0) {
      for (const row of dbRecords) {
        const payload = row.payload;
        if (payload && payload.officerName) {
          const clean = getCleanName(payload.officerName);
          const time = new Date(row.created_at).getTime();
          if (now - time <= PRESENCE_TIMEOUT_MS) {
            if (!activeHeartbeats.has(clean) || (activeHeartbeats.get(clean)?.lastSeen || 0) < time) {
              activeHeartbeats.set(clean, {
                role: payload.role || 'Staff Member',
                lastSeen: time,
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Presence DB fetch fallback:', err);
  }

  // Extract clean active officer list
  const activeOfficers = Array.from(activeHeartbeats.keys());

  return NextResponse.json({
    success: true,
    activeOfficers,
    timestamp: now,
  });
}

// Last time each person's heartbeat was written to the database (limits table growth).
const lastDbWrite: Map<string, number> = new Map();
const DB_WRITE_MIN_GAP_MS = 30_000;

export async function POST(request: Request) {
  const guard = await requireActiveRole(isStaff);
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const { role, action } = body;
    // Who is "here" comes from the signed-in profile, never from the request body.
    const officerName = guard.fullName;

    if (!officerName) {
      return NextResponse.json({ success: false, error: 'Your profile has no name' }, { status: 400 });
    }

    const clean = getCleanName(officerName);
    const now = Date.now();

    if (action === 'leave') {
      activeHeartbeats.delete(clean);
      return NextResponse.json({ success: true, activeOfficers: Array.from(activeHeartbeats.keys()) });
    }

    // Record heartbeat
    activeHeartbeats.set(clean, {
      role: role || 'Staff Member',
      lastSeen: now,
    });

    // Write to Supabase DB so other serverless instances can read it (at most every 30 s each)
    const lastWrite = lastDbWrite.get(clean) ?? 0;
    if (now - lastWrite >= DB_WRITE_MIN_GAP_MS) try {
      lastDbWrite.set(clean, now);
      const supabase = createAdminClient();
      await (supabase.from('notifications') as any).insert({
        user_id: SYSTEM_PROFILE_ID,
        kind: 'community_presence',
        payload: {
          officerName: clean,
          displayName: officerName,
          role: role || 'Staff Member',
          timestamp: now,
        },
      });
    } catch (e) {
      console.warn('Presence DB write error:', e);
    }

    // Clean up expired entries
    for (const [name, data] of Array.from(activeHeartbeats.entries())) {
      if (now - data.lastSeen > PRESENCE_TIMEOUT_MS) {
        activeHeartbeats.delete(name);
      }
    }

    return NextResponse.json({
      success: true,
      activeOfficers: Array.from(activeHeartbeats.keys()),
    });
  } catch (err: any) {
    console.error('Presence POST error:', err);
    return NextResponse.json({ success: false, error: 'Could not update presence' }, { status: 500 });
  }
}
