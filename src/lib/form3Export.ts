import type { BudgetItem, BudgetSettings } from './budget';
import type { CharterProjectFacts, CharterText } from './charter';
import type { ProjectArea } from './projectAreas';

/**
 * Form 3 export: the pure part. Turns what the portal knows about a project (facts, charter, areas, budget) and what
 * the person types about the applying organisation into the plain values of the donor's Form 3 (IHH layout).
 * The Word file itself is built in form3Docx.ts.
 */

export interface Form3Applicant {
  officialName: string;
  workName: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  managerMobile: string;
  chairmanTitle: string;
  generalManagerName: string;
}

export const EMPTY_APPLICANT: Form3Applicant = {
  officialName: 'Small Kindness Bangladesh',
  workName: 'SKB',
  address: '',
  phone: '',
  fax: '',
  email: '',
  website: '',
  managerName: '',
  managerPhone: '',
  managerEmail: '',
  managerMobile: '',
  chairmanTitle: 'Chairman of the Board of Directors',
  generalManagerName: '',
};

export interface Form3CostRow {
  name: string;
  quantity: number;
  unitLocal: number;
  unitDonor: number | null;
  totalLocal: number;
  totalDonor: number | null;
}

export interface Form3Data {
  applicant: Form3Applicant;
  project: {
    title: string;
    donorName: string;
    currency: string;
    totalCostText: string;
    requestedText: string;
    duration: string;
  };
  areas: Array<{ region: string; city: string; village: string; items: string; families: string }>;
  areaTotals: { families: number; text: string };
  geo: { regions: string; cities: string; villages: string };
  details: {
    brief: string;
    rationale: string;
    objectives: string;
    targetGroup: string;
    beneficiaries: string;
    negative: string;
    problems: string;
  };
  implementation: string;
  cost: {
    rows: Form3CostRow[];
    purchasedLocal: number;
    purchasedDonor: number | null;
    adminLocal: number;
    adminDonor: number | null;
    adminPercent: number;
    totalLocal: number;
    totalDonor: number | null;
    rate: number | null;
    fundRequestedText: string;
    notes: string[];
  };
}

const SYMBOL: Record<string, string> = { EUR: '€', USD: '$', GBP: '£' };
const round2 = (n: number) => Math.round(n * 100) / 100;

export const money = (n: number): string => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const moneyWithCurrency = (n: number, currency: string): string => {
  const s = SYMBOL[currency];
  return s ? `${s}${money(n)}` : `${currency} ${money(n)}`;
};

const uniq = (parts: Array<string | null | undefined>): string[] => {
  const out: string[] = [];
  for (const p of parts) {
    for (const piece of (p ?? '').split(',')) {
      const t = piece.trim();
      if (t && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
    }
  }
  return out;
};

/** Whole months between two dates, at least 1 when both are set; '' when a date is missing. */
export function durationText(start: string | null, end: string | null): string {
  if (!start || !end) return '';
  const a = new Date(`${start}T00:00:00Z`);
  const b = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return '';
  const days = (b.getTime() - a.getTime()) / 86400000 + 1;
  const months = Math.max(1, Math.round(days / 30));
  return `${months} ${months === 1 ? 'Month' : 'Months'}`;
}

/** The charter's risks text may hold two labelled parts (written by the Form 3 import); split them back. */
export function splitRisks(risks: string): { negative: string; problems: string } {
  const neg = /Groups that may be negatively affected:\s*\n?([\s\S]*?)(?=\n\s*\n\s*Problems that may arise|$)/i.exec(risks);
  const prob = /Problems that may arise[^\n]*:\s*\n?([\s\S]*)$/i.exec(risks);
  if (neg || prob) return { negative: (neg?.[1] ?? '').trim(), problems: (prob?.[1] ?? '').trim() };
  return { negative: '', problems: risks.trim() };
}

/** A line "Target group: ..." that the Form 3 import wrote into "In scope". */
export function targetGroupOf(scopeIn: string): string {
  const m = /^Target group:\s*(.+)$/im.exec(scopeIn);
  return m ? m[1].trim() : '';
}

export function buildForm3Data(input: {
  applicant: Form3Applicant;
  facts: CharterProjectFacts;
  charter: CharterText | null;
  areas: ProjectArea[];
  items: BudgetItem[];
  settings: BudgetSettings;
}): Form3Data {
  const { applicant, facts, charter, areas, items, settings } = input;
  const currency = facts.currency || 'EUR';
  const rate = currency === 'BDT' ? 1 : settings.exchangeRate;
  const toDonor = (local: number): number | null => (rate && rate > 0 ? round2(local / rate) : null);

  const rows: Form3CostRow[] = items
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((i) => {
      const quantity = i.kind === 'per_package' ? i.quantity * Math.max(0, settings.packagesCount) : i.quantity;
      const totalLocal = round2(quantity * i.unitPriceBdt);
      return {
        name: i.name,
        quantity,
        unitLocal: i.unitPriceBdt,
        unitDonor: toDonor(i.unitPriceBdt),
        totalLocal,
        totalDonor: toDonor(totalLocal),
      };
    })
    .filter((r) => r.quantity > 0);
  const purchasedLocal = round2(rows.reduce((s, r) => s + r.totalLocal, 0));
  const adminLocal = round2((purchasedLocal * settings.adminPercent) / 100);
  const totalLocal = round2(purchasedLocal + adminLocal);

  const notes: string[] = [];
  if (!rate) notes.push(`No exchange rate is set on the Budget tab, so the ${currency} columns are empty.`);
  if (items.some((i) => i.kind === 'per_package') && settings.packagesCount <= 0) notes.push('The number of packages is not set on the Budget tab, so package lines have no quantity.');
  if (rows.length === 0) notes.push('The project has no budget lines yet.');

  const requested = facts.budgetAmount ?? toDonor(totalLocal);
  const budgetTotalDonor = toDonor(totalLocal);
  if (facts.budgetAmount !== null && budgetTotalDonor !== null && Math.abs(facts.budgetAmount - budgetTotalDonor) > Math.max(1, facts.budgetAmount * 0.005)) {
    notes.push(`The donor amount on the project (${moneyWithCurrency(facts.budgetAmount, currency)}) is not the same as the budget total (${moneyWithCurrency(budgetTotalDonor, currency)}). Please check before you send the form.`);
  }
  const requestedText = requested === null ? '' : moneyWithCurrency(requested, currency);
  const totalDonor = toDonor(totalLocal);
  const risks = splitRisks(charter?.risks ?? '');

  const areaRows = areas
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((a) => ({
      region: a.region,
      city: a.cities ?? '',
      village: a.villages ?? '',
      items: a.itemQuantity === null ? '' : String(a.itemQuantity),
      families: a.families === null ? '' : String(a.families),
    }));
  const families = areas.reduce((s, a) => s + (a.families ?? 0), 0);

  return {
    applicant,
    project: {
      title: facts.title,
      donorName: facts.donorName ?? 'the donor',
      currency,
      totalCostText: totalDonor === null ? '' : moneyWithCurrency(totalDonor, currency),
      requestedText,
      duration: durationText(facts.startDate, facts.endDate),
    },
    areas: areaRows,
    areaTotals: { families, text: families > 0 ? `${families} Families` : '' },
    geo: {
      regions: uniq(areas.map((a) => a.region)).join(', '),
      cities: uniq(areas.map((a) => a.cities)).join(', '),
      villages: uniq(areas.map((a) => a.villages)).join(', '),
    },
    details: {
      brief: charter?.background ?? '',
      rationale: '',
      objectives: charter?.objectives ?? '',
      targetGroup: targetGroupOf(charter?.scopeIn ?? ''),
      beneficiaries: families > 0 ? `${families} families` : facts.beneficiaryTarget ? `${facts.beneficiaryTarget}` : '',
      negative: risks.negative,
      problems: risks.problems,
    },
    implementation: charter?.deliverables ?? '',
    cost: {
      rows,
      purchasedLocal,
      purchasedDonor: toDonor(purchasedLocal),
      adminLocal,
      adminDonor: toDonor(adminLocal),
      adminPercent: settings.adminPercent,
      totalLocal,
      totalDonor,
      rate: rate ?? null,
      fundRequestedText: requestedText,
      notes,
    },
  };
}
