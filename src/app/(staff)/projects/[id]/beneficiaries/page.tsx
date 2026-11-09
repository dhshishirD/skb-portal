import { BeneficiariesPanel } from '@/components/projects/BeneficiariesPanel';
import { FileRecordsPanel } from '@/components/projects/FileRecordsPanel';

export default async function BeneficiariesTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-5">
      <BeneficiariesPanel projectId={id} />
      <FileRecordsPanel projectId={id} />
    </div>
  );
}
