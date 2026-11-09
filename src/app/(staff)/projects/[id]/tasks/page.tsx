import { TasksPanel } from '@/components/projects/TasksPanel';

export default async function TasksTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TasksPanel projectId={id} />;
}
