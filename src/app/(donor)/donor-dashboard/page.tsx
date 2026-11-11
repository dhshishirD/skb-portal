import { Construction } from 'lucide-react';

/*
 * Donor view: not built on the shared database yet.
 * The old page showed browser-stored demo data, so it was removed. Until the real donor view is ready
 * (documents the Executive Director released to this donor, plus acknowledge / ask a question),
 * this page says so plainly and shows nothing else.
 */
export default function DonorDashboardPage() {
  return (
    <section className="max-w-xl mx-auto mt-16 bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
      <Construction className="w-8 h-8 text-amber-500 mx-auto" aria-hidden="true" />
      <h1 className="text-lg font-bold text-slate-900">Donor view: coming soon</h1>
      <p className="text-sm text-slate-600">
        This page is not connected to the shared database yet, so it shows no project information.
        Reports and documents released to you will appear here once it is ready.
      </p>
      <p className="text-xs text-slate-500">Please contact Small Kindness Bangladesh if you need a report now.</p>
    </section>
  );
}
