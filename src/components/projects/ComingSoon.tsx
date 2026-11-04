import { Construction } from 'lucide-react';

/**
 * Shown on project tabs that are not yet connected to the database.
 * No sample data, no browser-only forms: this screen says plainly that the tab is not ready.
 */
export function ComingSoon({ title, next }: { title: string; next: string }) {
  return (
    <section
      aria-labelledby="coming-soon-title"
      className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center space-y-3"
    >
      <Construction className="w-8 h-8 text-amber-500 mx-auto" aria-hidden="true" />
      <h2 id="coming-soon-title" className="text-lg font-bold text-slate-900">
        {title}: coming soon
      </h2>
      <p className="text-sm text-slate-600 max-w-xl mx-auto">
        This tab is not connected to the shared database yet, so it does not save or show anything.
        {' '}{next}
      </p>
      <p className="text-xs text-slate-500">Nothing you enter elsewhere is lost. Please do not keep real data here until this tab is ready.</p>
    </section>
  );
}
