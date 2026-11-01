import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { homeForRoles } from '@/lib/desks';
import type { AppRole } from '@/lib/database.types';

/**
 * The signed-in person as the database knows them: name, designation, roles, active flag
 * and landing desk. Read with the user's own session, so RLS applies.
 * The UI uses this instead of any hard-coded staff list.
 */
export const dynamic = 'force-dynamic';

export interface MeResponse {
  id: string;
  email: string | null;
  fullName: string;
  designation: string | null;
  roles: AppRole[];
  isActive: boolean;
  home: string;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [profileRes, rolesRes] = await Promise.all([
    supabase.from('profiles').select('full_name, designation, is_active').eq('id', user.id).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', user.id),
  ]);

  if (profileRes.error || rolesRes.error) {
    return NextResponse.json({ error: 'Could not load profile' }, { status: 500 });
  }

  const profile = profileRes.data as { full_name: string; designation: string | null; is_active: boolean } | null;
  const roles = ((rolesRes.data ?? []) as Array<{ role: AppRole }>).map((r) => r.role);

  const body: MeResponse = {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name || (user.email ? user.email.split('@')[0] : 'SKB staff'),
    designation: profile?.designation ?? null,
    roles,
    isActive: profile?.is_active ?? false,
    home: homeForRoles(roles),
  };
  return NextResponse.json(body, { headers: { 'Cache-Control': 'private, no-store' } });
}
