/*
 * Checks before making the Form-7 PDF (pure functions, no database).
 *
 * "stop" = the PDF would show a wrong or empty key number; fix it first.
 * "warn" = the PDF can be made, but a donor may ask about it.
 * The messages say where to fix the problem (which tab).
 */

export type CheckLevel = 'stop' | 'warn';
export interface Form7Check {
  code: string;
  level: CheckLevel;
  message: string;
}

export interface Form7CheckInput {
  project: {
    startDate: string | null;
    endDate: string | null;
    donorName: string | null;
    location: string | null;
    beneficiaryTarget: number | null;
  };
  registrationNo: string | null;
  /** Budget, as calculated by calculateBudget (only the parts used here). */
  budget: {
    itemCount: number;
    packagesCount: number;
    warnings: string[];
    projectConvertedMilli: number | null;
    adminConvertedMilli: number | null;
    donorAmountMilli: number | null;
  };
  currency: string;
  receipts: Array<{ receivedOn: string; amount: number; currency: string }>;
  familiesCount: number | null;
  /** null = the beneficiaries could not be read. */
  peopleTotal: number | null;
  emptySections: string[];
  checklistDone: number;
  checklistTotal: number;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function form7Checks(i: Form7CheckInput): Form7Check[] {
  const out: Form7Check[] = [];
  const add = (level: CheckLevel, code: string, message: string) => out.push({ level, code, message });

  // ----- project facts -----
  const { startDate, endDate } = i.project;
  if (!startDate || !endDate) add('stop', 'dates_missing', 'Set the project start and end dates (Overview > Edit). Form-7 prints the project duration.');
  else if (ISO.test(startDate) && ISO.test(endDate) && endDate < startDate) add('stop', 'dates_reversed', 'The end date is before the start date (Overview > Edit).');
  if (!i.project.donorName?.trim()) add('warn', 'donor_missing', 'The donor name is empty (Overview > Edit).');
  if (!i.project.location?.trim()) add('warn', 'location_missing', 'The project location is empty (Overview > Edit).');
  if (!i.registrationNo?.trim()) add('warn', 'registration_missing', 'The organisation registration number is empty (Admin > Organisation). Form-7 Part 1 prints it.');

  // ----- budget -----
  const b = i.budget;
  if (b.itemCount === 0) add('stop', 'budget_empty', 'The Budget tab has no items, so the cost tables would be empty.');
  if (b.warnings.includes('packages_missing')) add('stop', 'packages_missing', 'The number of packages is 0 in the Budget tab, so the cost is 0.');
  if (b.warnings.includes('missing_donor_amount')) add('stop', 'donor_amount_missing', 'The donor amount is empty (Overview > Edit).');
  if (b.warnings.includes('missing_rate')) add('stop', 'rate_missing', 'The exchange rate is not set. The Executive Director sets it in the Budget tab.');
  if (b.warnings.includes('overspent')) add('stop', 'overspent', `The project cost is more than the ${i.currency} donor amount. Check the budget items, the number of packages and the exchange rate.`);
  if (b.warnings.includes('admin_above_target')) add('warn', 'admin_above_target', 'The administration cost (what is left of the donor amount) is above the target percentage. A donor may ask why.');

  // ----- money received -----
  if (i.receipts.length === 0) {
    add('warn', 'no_receipt', 'No fund receipt is recorded (Fund receipts tab). Form-7 would show 0 received.');
  } else {
    const other = i.receipts.filter((r) => r.currency !== i.currency);
    if (other.length > 0) add('warn', 'receipt_currency', `${other.length} receipt(s) are not in ${i.currency}. Only ${i.currency} receipts are added up in Form-7.`);
    const received = i.receipts.filter((r) => r.currency === i.currency).reduce((s, r) => s + Math.round(r.amount * 100), 0);
    if (b.donorAmountMilli !== null) {
      const donor = Math.round(b.donorAmountMilli / 10);
      if (received !== donor) {
        add('warn', 'receipt_total', `Fund received (${(received / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${i.currency}) is not the same as the donor amount (${(donor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${i.currency}).`);
      }
    }
    if (startDate && ISO.test(startDate)) {
      const late = i.receipts.some((r) => ISO.test(r.receivedOn) && endDate && ISO.test(endDate) && r.receivedOn > endDate);
      if (late) add('warn', 'receipt_after_end', 'A fund receipt is dated after the project end date.');
    }
  }

  // ----- people -----
  if (i.familiesCount === null && (i.project.beneficiaryTarget === null || i.project.beneficiaryTarget === 0)) {
    add('stop', 'families_missing', 'Number of families is empty. Fill it on the Closing tab or set the beneficiary target (Overview > Edit).');
  }
  if (i.peopleTotal === 0) {
    add('warn', 'people_none', 'No beneficiaries are registered, so the women, men, girls and boys counts in Form-7 are 0. Register them or explain it to the donor.');
  }

  // ----- written text and checklist -----
  if (i.emptySections.length > 0) add('warn', 'text_empty', `Not written yet: ${i.emptySections.join(', ')}. The PDF prints “not written” for these.`);
  if (i.checklistTotal > 0 && i.checklistDone < i.checklistTotal) {
    add('warn', 'checklist_open', `Closing checklist: ${i.checklistDone} of ${i.checklistTotal} items ticked. The Executive Director can sign off only when all are ticked.`);
  }
  return out;
}

export const hasStops = (checks: Form7Check[]) => checks.some((c) => c.level === 'stop');
