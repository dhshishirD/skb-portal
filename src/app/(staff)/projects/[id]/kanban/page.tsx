import { StageGates } from '@/components/projects/StageGates';

export default async function StageGatesTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StageGates projectId={id} />;
}
