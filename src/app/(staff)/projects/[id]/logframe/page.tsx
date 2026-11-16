import { LogframePanel } from '@/components/projects/LogframePanel';
import { getProjectById, isUuid } from '@/server/services/projectsData';

export default async function LogframeTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = isUuid(id) ? await getProjectById(id) : null;
  return <LogframePanel projectId={id} projectTitle={project?.title ?? undefined} />;
}
