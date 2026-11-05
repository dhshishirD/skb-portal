import { FundReceiptsPanel } from '@/components/projects/FundReceiptsPanel';

export default async function FundReceiptsTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FundReceiptsPanel projectId={id} />;
}
