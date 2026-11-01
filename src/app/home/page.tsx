import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { homeForRoles, NO_ACCESS_PATH } from '@/lib/desks';
import type { AppRole } from '@/lib/database.types';

/**
 * "Take me to my desk". The middleware normally redirects /home before this renders;
 * this page is the server-side fallback and does the same lookup.
 */
export const dynamic = 'force-dynamic';

export default async function HomeRedirect() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
  if (error) redirect(`${NO_ACCESS_PATH}?reason=error`);

  const roles = ((data ?? []) as Array<{ role: AppRole }>).map((r) => r.role);
  const home = homeForRoles(roles);
  redirect(home === NO_ACCESS_PATH ? `${NO_ACCESS_PATH}?reason=no-role` : home);
}
