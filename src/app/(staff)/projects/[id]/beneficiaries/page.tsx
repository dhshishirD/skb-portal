import { BeneficiariesPanel } from '@/components/projects/BeneficiariesPanel';
import { FileRecordsPanel } from '@/components/projects/FileRecordsPanel';
import { HeadcountPanel } from '@/components/projects/HeadcountPanel';

export default async function BeneficiariesTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-5">
      <BeneficiariesPanel projectId={id} />
      <HeadcountPanel projectId={id} />
      <FileRecordsPanel projectId={id} />
    </div>
  );
}
