import { BeneficiariesPanel } from '@/components/projects/BeneficiariesPanel';

export default async function BeneficiariesTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BeneficiariesPanel projectId={id} />;
}
