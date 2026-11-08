import { LogframePanel } from '@/components/projects/LogframePanel';

export default async function LogframeTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LogframePanel projectId={id} />;
}
