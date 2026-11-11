import { Building2 } from 'lucide-react';
import { MyProjectsPanel } from '@/components/dashboard/MyProjectsPanel';
import { ExecutiveOverview } from '@/components/dashboard/ExecutiveOverview';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/auth/verifiedUser';
import { getActor } from '@/server/services/projectsData';
import { loadExecutiveOverview } from '@/server/services/executiveOverviewData';

export const dynamic = 'force-dynamic';

/*
 * Staff dashboard, from the portal database only (Row Level Security decides what each person sees).
 *   - Executive Director: the whole-portfolio overview.
 *   - Everyone else: their own projects and tasks.
 * Nothing is kept in the browser and no demo data is shown.
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

  const actor = await getActor();
  if (actor?.roles.includes('executive')) {
    try {
      const data = await loadExecutiveOverview();
      return <ExecutiveOverview data={data} name={name} />;
    } catch {
      return (
        <p role="alert" className="text-sm text-red-700 bg-white p-5 rounded-2xl border border-slate-200">
          Could not load the overview. Please refresh the page. If it keeps failing, tell the programmer.
        </p>
      );
    }
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
