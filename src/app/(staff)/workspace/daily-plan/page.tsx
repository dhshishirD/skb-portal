import { DailyPlanPanel } from '@/components/workspace/DailyPlanPanel';

export const metadata = { title: 'My Daily Plan' };

export default function DailyPlanPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My Daily Plan</h1>
        <p className="text-sm text-slate-600">List the tasks you will do each day, change them as the day goes, and mark each one at the end of the day.</p>
      </div>
      <DailyPlanPanel />
    </div>
  );
}
