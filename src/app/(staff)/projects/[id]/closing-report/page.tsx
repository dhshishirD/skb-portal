import { ClosingPanel } from '@/components/projects/ClosingPanel';

export default async function ClosingReportTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClosingPanel projectId={id} />;
}
