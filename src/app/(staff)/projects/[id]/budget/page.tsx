import { BudgetPanel } from '@/components/projects/BudgetPanel';

export default async function BudgetTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BudgetPanel projectId={id} />;
}
