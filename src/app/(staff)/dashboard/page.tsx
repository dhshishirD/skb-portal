import { Building2 } from 'lucide-react';
import { MyProjectsPanel } from '@/components/dashboard/MyProjectsPanel';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/auth/verifiedUser';

/*
 * Staff dashboard: the signed-in person's own projects and tasks, from the portal database.
 * Everything on this page comes from the database through Row Level Security; nothing is kept
 * in the browser and no demo data is shown.
 */
export default async function StaffDashboardPage() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  let name = '';
  let designation = '';
  if (userId) {
    const { data } = await (supabase.from('profiles') as any).select('full_name, designation').eq('id', userId).maybeSingle();
    name = data?.full_name ?? '';
    designation = data?.designation ?? '';
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
          <Building2 className="w-3.5 h-3.5" aria-hidden /> SKB Operations Desk{designation ? ` • ${designation}` : ''}
        </div>
        <h1 className="text-2xl font-black text-slate-900">{name ? `${name} — My workspace` : 'My workspace'}</h1>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">Your projects and tasks. You see only the projects you were added to.</p>
      </div>
      <MyProjectsPanel />
    </div>
  );
}
