import { BudgetExportButton } from '@/components/projects/BudgetExportButton';
import { BudgetExcelImport } from '@/components/projects/BudgetExcelImport';
import { BudgetPanel } from '@/components/projects/BudgetPanel';
import { BudgetVsActualPanel } from '@/components/projects/BudgetVsActualPanel';
import { getBudgetVsActualAction } from '@/server/actions/budgetVsActual';
import { getProjectById } from '@/server/services/projectsData';

export default async function BudgetTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [actual, project] = await Promise.all([getBudgetVsActualAction(id), getProjectById(id)]);
  return (
    <div className="space-y-6">
      {project && <BudgetExportButton projectId={id} title={project.title} code={project.code ?? null} />}
      {actual.ok && <BudgetVsActualPanel data={actual.data} />}
      <BudgetExcelImport projectId={id} />
      <BudgetPanel projectId={id} />
    </div>
  );
}
