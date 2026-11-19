import { ReviewPanel } from '@/components/workspace/ReviewPanel';
import { WorkLogPanel } from '@/components/workspace/WorkLogPanel';

export const metadata = { title: 'My Work Log' };

export default function WorkLogPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My Work Log</h1>
        <p className="text-sm text-slate-600">Record where you worked and what you did each day. At the end of the month, submit it as your Work Statement.</p>
      </div>
      <ReviewPanel />
      <WorkLogPanel />
    </div>
  );
}
