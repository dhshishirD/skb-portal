import { LetterEditor } from '@/components/workspace/LetterEditor';

export const metadata = { title: 'Letter' };

export default async function LetterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6 max-w-3xl">
      <LetterEditor id={id} />
    </div>
  );
}
