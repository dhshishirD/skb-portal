import { LettersPanel } from '@/components/workspace/LettersPanel';

export const metadata = { title: 'Letters' };

export default function LettersPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Letters</h1>
        <p className="text-sm text-slate-600">Write a letter, issue it with its Ref number, and download it on the SKB letterhead pad.</p>
      </div>
      <LettersPanel />
    </div>
  );
}
