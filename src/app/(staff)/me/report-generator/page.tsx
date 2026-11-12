import { redirect } from 'next/navigation';

/*
 * The old "Donor Report Generator" was a demo: typed-in project data, invented vendor quotes and a
 * made-up "9-document package" with false statuses. It was removed.
 * Form-7 is made from real data inside each project (Closing tab). A donor pack builder that uses
 * real project data is planned for after launch.
 */
export default function ReportGeneratorMovedPage() {
  redirect('/projects');
}
