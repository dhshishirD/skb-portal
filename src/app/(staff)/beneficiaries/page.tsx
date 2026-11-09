import { redirect } from 'next/navigation';

/**
 * The old browser-stored beneficiary list was removed. Beneficiaries now live inside each project
 * (the Beneficiaries tab), where names and ID numbers are encrypted and every reveal is logged.
 */
export default function LegacyBeneficiariesPage() {
  redirect('/projects');
}
