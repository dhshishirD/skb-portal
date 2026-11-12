import { UserRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/auth/verifiedUser';

/*
 * My profile: read-only, from the portal database (name, designation, contact, roles).
 * The old page kept profile edits and a demo approved-user list in the browser; it was removed.
 * Name, designation and roles are set by an administrator (Admin > Users).
 */
export const dynamic = 'force-dynamic';

const roleLabel = (r: string) => r.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export default async function MyProfilePage() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) {
    return <p className="text-sm text-slate-600">Please sign in again.</p>;
  }
  const { data: authData } = await supabase.auth.getUser();
  const email = authData.user?.email ?? '';
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('full_name, designation, phone, language')
    .eq('id', userId)
    .maybeSingle();
  const { data: roleRows } = await (supabase.from('user_roles') as any).select('role').eq('user_id', userId);
  const roles: string[] = (roleRows ?? []).map((r: { role: string }) => r.role);

  const rows: Array<[string, string]> = [
    ['Name', profile?.full_name || '—'],
    ['Designation', profile?.designation || '—'],
    ['Email', email || '—'],
    ['Phone', profile?.phone || '—'],
    ['Language', profile?.language === 'bn' ? 'Bangla' : 'English'],
    ['Roles', roles.length ? roles.map(roleLabel).join(', ') : 'No role yet'],
  ];

  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3">
        <UserRound className="w-6 h-6 text-blue-600" aria-hidden="true" />
        <div>
          <h1 className="text-xl font-black text-slate-900">My profile</h1>
          <p className="text-xs text-slate-500">Your name, designation and roles are set by an administrator (Admin &gt; Users).</p>
        </div>
      </div>
      <dl className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3 px-5 py-3 text-sm">
            <dt className="text-slate-500">{k}</dt>
            <dd className="sm:col-span-2 font-medium text-slate-900 break-words">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
