import Link from 'next/link';

/**
 * The old form here kept names and ID numbers in the browser. Registration now happens inside the
 * project (Beneficiaries tab), where the data is encrypted before it is stored.
 */
export default function NewBeneficiaryMovedPage() {
  return (
    <div className="p-5 space-y-4 text-white">
      <Link href="/field-dashboard" className="text-xs text-emerald-300 hover:text-white">Back to field dashboard</Link>
      <h1 className="text-lg font-bold">Register a beneficiary</h1>
      <p className="text-sm text-slate-300">
        Beneficiaries are now registered inside each project. Open your project, then choose the <strong>Beneficiaries</strong> tab and press the register button.
        Names, ID numbers and phone numbers are encrypted when you save.
      </p>
      <Link href="/projects" className="inline-block px-4 py-2 text-sm font-bold rounded-xl bg-emerald-500 text-slate-900">Open my projects</Link>
    </div>
  );
}
