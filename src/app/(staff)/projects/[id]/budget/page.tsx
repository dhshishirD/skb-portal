import { BudgetPanel } from '@/components/projects/BudgetPanel';
import { BudgetVsActualPanel } from '@/components/projects/BudgetVsActualPanel';
import { getBudgetVsActualAction } from '@/server/actions/budgetVsActual';

export default async function BudgetTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actual = await getBudgetVsActualAction(id);
  return (
    <div className="space-y-6">
      {actual.ok && <BudgetVsActualPanel data={actual.data} />}
      <BudgetPanel projectId={id} />
    </div>
  );
}
