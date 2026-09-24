import { useTranslations } from 'next-intl';

export default function StaffDashboardPage() {
  const navT = useTranslations('Navigation');
  const roleT = useTranslations('RoleAreas');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{roleT('staff')} {navT('dashboard')}</h1>
          <p className="text-xs text-slate-500">HQ Operations & Program Management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Active Projects</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">4</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Pending Approvals</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">3</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Active Grants</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">3</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 mb-2">Phase 1 Foundation Dashboard</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          The permissions layer, auth integration, and database RLS policies will populate this workspace during Phase 1 tasks.
        </p>
      </div>
    </div>
  );
}
