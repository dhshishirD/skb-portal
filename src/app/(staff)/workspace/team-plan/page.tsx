import { TeamPlanPanel } from '@/components/workspace/TeamPlanPanel';

export const metadata = { title: 'Team Plan' };

export default function TeamPlanPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Team Plan</h1>
        <p className="text-sm text-slate-600">See who plans which tasks each day, and give a task to a staff member.</p>
      </div>
      <TeamPlanPanel />
    </div>
  );
}
