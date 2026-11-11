import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/auth/verifiedUser';
import type { AppRole } from '@/lib/database.types';
import { CommunityApp } from '@/components/community/CommunityApp';
import type { Person } from '@/lib/community/model';

export const dynamic = 'force-dynamic';

/**
 * Staff community: posts, comments and private messages for SKB staff.
 * Everything comes from the database under Row Level Security; nothing is kept in the browser.
 */
export default async function CommunityPage() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) redirect('/login?next=/community');

  const [profileRes, rolesRes, staffRes] = await Promise.all([
    supabase.from('profiles').select('full_name, designation').eq('id', userId).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', userId),
    (supabase.from('profiles') as any)
      .select('id, full_name, designation')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('full_name', { ascending: true })
      .limit(500),
  ]);

  const profile = profileRes.data as { full_name: string; designation: string | null } | null;
  const roles = ((rolesRes.data ?? []) as Array<{ role: AppRole }>).map((r) => r.role);
  const people: Person[] = ((staffRes.data ?? []) as Array<{ id: string; full_name: string; designation: string | null }>)
    .filter((p) => p.full_name && p.full_name.trim() !== '')
    .map((p) => ({ id: p.id, fullName: p.full_name, designation: p.designation }));

  return (
    <CommunityApp
      me={{
        id: userId,
        fullName: profile?.full_name || 'You',
        designation: profile?.designation ?? null,
        canModerate: roles.includes('super_admin') || roles.includes('executive'),
      }}
      people={people}
    />
  );
}
