import { DocumentsPanel } from '@/components/projects/DocumentsPanel';

export default async function DocumentsTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DocumentsPanel projectId={id} />;
}
