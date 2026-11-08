import { CharterPanel } from '@/components/projects/CharterPanel';

export default async function CharterTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CharterPanel projectId={id} />;
}
