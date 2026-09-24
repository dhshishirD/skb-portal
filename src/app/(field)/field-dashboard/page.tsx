import { useTranslations } from 'next-intl';

export default function FieldDashboardPage() {
  const roleT = useTranslations('RoleAreas');

  return (
    <div className="space-y-4">
      <div className="bg-emerald-900/60 border border-emerald-800 p-4 rounded-xl">
        <h2 className="text-base font-bold text-emerald-100">{roleT('field')} Dashboard</h2>
        <p className="text-xs text-emerald-300 mt-1">
          Designed for low-end Android phones & offline field data collection in rural Bangladesh.
        </p>
      </div>

      <div className="space-y-2">
        <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-md transition-colors">
          + New Field Progress Report
        </button>
        <button className="w-full py-3 bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 font-medium rounded-xl text-sm border border-emerald-700 transition-colors">
          Submit Expense Claim (Receipt Photo)
        </button>
      </div>

      <div className="border border-emerald-800 bg-emerald-900/40 p-4 rounded-xl space-y-1">
        <p className="text-xs font-semibold text-emerald-200">Local Storage Queue (Dexie / IndexedDB)</p>
        <p className="text-[11px] text-emerald-400">0 pending reports waiting for internet connection.</p>
      </div>
    </div>
  );
}
