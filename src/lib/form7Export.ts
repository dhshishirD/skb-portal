import { buildForm3Data, moneyWithCurrency, type Form3Data, type Form3CostRow } from './form3Export';

/**
 * Form 7 (project feedback report) export: the pure part. The first sections are the same as Form 3; this adds
 * the real spending (approved expense claims and issued purchase orders), the money received from the donor,
 * the administration share, the unspent amount and the invoice list. The portal does not record the shop,
 * invoice number or quantity of a claim, so those boxes stay empty for the person to fill in Word.
 */

export interface ActualClaim {
  id: string;
  description: string;
  /** Amount in its own currency. */
  amount: number;
  fxRateToBdt: number;
  expenseDate: string;
}
export interface ActualOrder {
  id: string;
  description: string;
  vendorName: string | null;
  totalBdt: number;
  issuedOn: string;
}
export interface ActualReceipt {
  receivedOn: string;
  amount: number;
  currency: string;
}

export interface Form7Invoice {
  no: number;
  date: string;
  store: string;
  goods: string;
  totalLocal: number;
  totalDonor: number | null;
}

export interface Form7Data {
  base: Form3Data;
  startDate: string;
  endDate: string;
  families: number;
  individuals: number;
  fundsReceivedText: string;
  rateText: string;
  spend: { rows: Form3CostRow[]; totalLocal: number; totalDonor: number | null };
  admin: { percent: number; local: number; donor: number | null };
  totalExpenditureText: string;
  unspentText: string;
  invoices: Form7Invoice[];
  notes: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const longDate = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};
export const shortDate = (iso: string): string => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
};

export function buildForm7Data(input: Parameters<typeof buildForm3Data>[0] & { claims: ActualClaim[]; orders: ActualOrder[]; receipts: ActualReceipt[] }): Form7Data {
  const base = buildForm3Data(input);
  const { facts, settings } = input;
  const currency = base.project.currency;
  const rate = base.cost.rate;
  const toDonor = (local: number): number | null => (rate && rate > 0 ? round2(local / rate) : null);
  const notes = [...base.cost.notes.filter((n) => !n.includes('donor amount'))];

  type Spent = { date: string; store: string; goods: string; local: number };
  const spent: Spent[] = [
    ...input.orders.map((o) => ({ date: o.issuedOn, store: o.vendorName ?? '', goods: o.description, local: round2(o.totalBdt) })),
    ...input.claims.map((c) => ({ date: c.expenseDate, store: '', goods: c.description, local: round2(c.amount * c.fxRateToBdt) })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const rows: Form3CostRow[] = spent.map((s) => ({ name: s.goods, quantity: 1, unitLocal: s.local, unitDonor: toDonor(s.local), totalLocal: s.local, totalDonor: toDonor(s.local) }));
  const spentLocal = round2(spent.reduce((s, x) => s + x.local, 0));
  const adminLocal = round2((spentLocal * settings.adminPercent) / 100);
  const totalLocal = round2(spentLocal + adminLocal);

  let received = 0;
  let skipped = 0;
  for (const r of input.receipts) {
    if (r.currency === currency) received += r.amount;
    else if (r.currency === 'BDT' && rate) received += r.amount / rate;
    else skipped += 1;
  }
  received = round2(received);
  if (skipped > 0) notes.push(`${skipped} fund receipt(s) are in another currency and were not added to "funds received".`);
  if (input.receipts.length === 0) notes.push('No fund receipt is recorded for this project, so "funds received" and "unspent" are blank.');
  if (spent.length === 0) notes.push('No approved expense claim or issued purchase order was found, so the expenditure tables are empty.');
  notes.push('The portal does not record the shop name, invoice number or quantity of an expense claim. Fill those boxes in Word from the invoices.');

  const totalDonor = toDonor(totalLocal);
  const hasReceived = input.receipts.length > 0;

  const families = base.areaTotals.families || (facts.beneficiaryTarget ?? 0);
  return {
    base,
    startDate: longDate(facts.startDate),
    endDate: longDate(facts.endDate),
    families,
    individuals: families * 5,
    fundsReceivedText: hasReceived ? moneyWithCurrency(received, currency) : '',
    rateText: rate && currency !== 'BDT' ? `1 ${currency} = ${rate} BDT` : '',
    spend: { rows, totalLocal: spentLocal, totalDonor: toDonor(spentLocal) },
    admin: { percent: settings.adminPercent, local: adminLocal, donor: toDonor(adminLocal) },
    totalExpenditureText: totalDonor === null ? '' : moneyWithCurrency(totalDonor, currency),
    unspentText: hasReceived && totalDonor !== null ? moneyWithCurrency(round2(received - totalDonor), currency) : '',
    invoices: spent.map((s, i) => ({ no: i + 1, date: shortDate(s.date), store: s.store, goods: s.goods, totalLocal: s.local, totalDonor: toDonor(s.local) })),
    notes,
  };
}

