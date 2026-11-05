import { z } from 'zod';
import type { AppRole, ProjectStage } from './database.types';

/**
 * Project budget and packages: the rules the screen and the server actions share.
 *
 * The database (migration 0016) is what really enforces who may change what. The helpers here
 * only drive what the screen shows, check typed values, calculate the totals and turn database
 * errors into plain words.
 *
 * MONEY IS CALCULATED WITH WHOLE NUMBERS (BigInt), never with floating point:
 *   BDT in "cents" (1/100), converted amounts in "milli" (1/1000 of the donor currency),
 *   quantity in 1/1000, exchange rate in 1/10000. Halves round up.
 *
 * The EUR (donor currency) figures are worked out the way SKB's donor documents do it today:
 *   - each item line: line BDT / rate, rounded to 3 decimals
 *   - cost of one package: the sum of its line figures
 *   - cost of all packages: cost of one package x number of packages
 *   - one-off lines are added once
 *   - administration cost: what is left of the donor amount after the project cost
 */

// ===== Types =====
export type BudgetItemKind = 'per_package' | 'one_off';

export interface BudgetItem {
  id: string;
  kind: BudgetItemKind;
  groupName: string | null;
  position: number;
  name: string;
  measure: string;
  quantity: number;
  unitPriceBdt: number;
}

export interface BudgetSettings {
  packagesCount: number;
  adminPercent: number;
  exchangeRate: number | null;
  rateDate: string | null;
  rateNote: string | null;
  rateSetByName: string | null;
  rateSetAt: string | null;
}

export interface BudgetData {
  projectId: string;
  stage: ProjectStage;
  /** The donor amount on the project record (projects.budget_amount), or null if not set. */
  donorAmount: number | null;
  /** The project's currency (projects.budget_currency). BDT means nothing to convert. */
  currency: string;
  settings: BudgetSettings;
  items: BudgetItem[];
  closed: boolean;
  /** Role may edit items and settings, and the project is not closed. */
  canEdit: boolean;
  /** Executive Director, and the project is not closed. */
  canSetRate: boolean;
}

export const DEFAULT_SETTINGS: BudgetSettings = {
  packagesCount: 0,
  adminPercent: 5,
  exchangeRate: null,
  rateDate: null,
  rateNote: null,
  rateSetByName: null,
  rateSetAt: null,
};

// ===== Who may do what =====
const EDITORS: AppRole[] = ['executive', 'programme_manager', 'project_officer'];
export const canEditBudget = (roles: AppRole[]) => roles.some((r) => EDITORS.includes(r));
/** Only the Executive Director enters the exchange rate. */
export const canSetExchangeRate = (roles: AppRole[]) => roles.includes('executive');

export const MEASURES = ['Pcs', 'Kg', 'Litre', 'Set', 'Pair', 'Meter', 'Packet', 'Box', 'Month', 'Day', 'Person', 'Lump sum'] as const;

// ===== Whole-number arithmetic =====
function roundDiv(numerator: bigint, denominator: bigint): bigint {
  // half up; every value here is zero or positive
  return (2n * numerator + denominator) / (2n * denominator);
}
const scaled = (n: number, scale: number): bigint => BigInt(Math.round(n * scale));

export interface LineCalc {
  /** Price of one unit in the donor currency, 3 decimals (milli); null while no rate is set. */
  unitConvertedMilli: number | null;
  lineBdtCents: number;
  lineConvertedMilli: number | null;
}

export interface GroupCalc {
  /** null = items without a group name */
  name: string | null;
  itemIds: string[];
  bdtCents: number;
  convertedMilli: number | null;
}

export type BudgetWarning =
  | 'missing_rate'
  | 'missing_donor_amount'
  | 'packages_missing'
  | 'overspent'
  | 'admin_above_target';

export interface BudgetCalc {
  currency: string;
  /** The project is not in BDT, so a rate is needed to convert. */
  needsRate: boolean;
  /** Converted figures can be shown (BDT project, or a rate is set). */
  canConvert: boolean;
  lines: Record<string, LineCalc>;
  groups: GroupCalc[];
  oneOffIds: string[];
  packagesCount: number;
  packageBdtCents: number;
  packageConvertedMilli: number | null;
  allPackagesBdtCents: number;
  allPackagesConvertedMilli: number | null;
  oneOffBdtCents: number;
  oneOffConvertedMilli: number | null;
  projectBdtCents: number;
  projectConvertedMilli: number | null;
  donorAmountMilli: number | null;
  /** Donor amount minus project cost = the administration cost. Can be negative (overspent). */
  adminConvertedMilli: number | null;
  /** Administration cost as basis points (1/100 of a percent) of the project cost. */
  adminBp: number | null;
  targetBp: number;
  warnings: BudgetWarning[];
}

export function calculateBudget(input: {
  items: BudgetItem[];
  packagesCount: number;
  adminPercent: number;
  exchangeRate: number | null;
  donorAmount: number | null;
  currency: string;
}): BudgetCalc {
  const needsRate = input.currency !== 'BDT';
  const rateScaled = needsRate ? (input.exchangeRate ? scaled(input.exchangeRate, 10000) : 0n) : 10000n;
  const canConvert = rateScaled > 0n;

  const toMilli = (bdtCents: bigint): bigint | null => (canConvert ? roundDiv(bdtCents * 100000n, rateScaled) : null);
  const num = (v: bigint | null): number | null => (v === null ? null : Number(v));

  const sorted = [...input.items].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
  const lines: Record<string, LineCalc> = {};
  const lineBdt: Record<string, bigint> = {};
  const lineMilli: Record<string, bigint | null> = {};

  for (const item of sorted) {
    const cents = roundDiv(scaled(item.quantity, 1000) * scaled(item.unitPriceBdt, 100), 1000n);
    const milli = toMilli(cents);
    lineBdt[item.id] = cents;
    lineMilli[item.id] = milli;
    lines[item.id] = {
      unitConvertedMilli: num(toMilli(scaled(item.unitPriceBdt, 100))),
      lineBdtCents: Number(cents),
      lineConvertedMilli: num(milli),
    };
  }

  // per-package items, grouped in order of first appearance
  const groupOrder: Array<string | null> = [];
  const groupIds = new Map<string | null, string[]>();
  const oneOffIds: string[] = [];
  for (const item of sorted) {
    if (item.kind === 'one_off') {
      oneOffIds.push(item.id);
      continue;
    }
    const key = item.groupName?.trim() ? item.groupName.trim() : null;
    if (!groupIds.has(key)) {
      groupIds.set(key, []);
      groupOrder.push(key);
    }
    groupIds.get(key)!.push(item.id);
  }

  const sum = (ids: string[]) => ids.reduce((s, id) => s + lineBdt[id], 0n);
  const sumMilli = (ids: string[]): bigint | null =>
    canConvert ? ids.reduce((s, id) => s + (lineMilli[id] ?? 0n), 0n) : null;

  const groups: GroupCalc[] = groupOrder.map((name) => {
    const ids = groupIds.get(name)!;
    return { name, itemIds: ids, bdtCents: Number(sum(ids)), convertedMilli: num(sumMilli(ids)) };
  });

  const packageIds = groupOrder.flatMap((g) => groupIds.get(g)!);
  const count = BigInt(Math.max(0, Math.trunc(input.packagesCount)));

  const packageBdt = sum(packageIds);
  const packageMilli = sumMilli(packageIds);
  const oneOffBdt = sum(oneOffIds);
  const oneOffMilli = sumMilli(oneOffIds);

  const allPackagesBdt = packageBdt * count;
  const allPackagesMilli = packageMilli === null ? null : packageMilli * count;
  const projectBdt = allPackagesBdt + oneOffBdt;
  const projectMilli = allPackagesMilli === null || oneOffMilli === null ? null : allPackagesMilli + oneOffMilli;

  const donorMilli = input.donorAmount === null ? null : scaled(input.donorAmount, 1000);
  const adminMilli = donorMilli === null || projectMilli === null ? null : donorMilli - projectMilli;
  const targetBp = Number(scaled(input.adminPercent, 100));
  const adminBp =
    adminMilli !== null && projectMilli !== null && projectMilli > 0n && adminMilli >= 0n
      ? Number(roundDiv(adminMilli * 10000n, projectMilli))
      : null;

  const warnings: BudgetWarning[] = [];
  if (needsRate && !canConvert) warnings.push('missing_rate');
  if (input.donorAmount === null) warnings.push('missing_donor_amount');
  if (packageIds.length > 0 && count === 0n) warnings.push('packages_missing');
  if (adminMilli !== null && adminMilli < 0n) warnings.push('overspent');
  if (adminBp !== null && adminBp > targetBp) warnings.push('admin_above_target');

  return {
    currency: input.currency,
    needsRate,
    canConvert,
    lines,
    groups,
    oneOffIds,
    packagesCount: Number(count),
    packageBdtCents: Number(packageBdt),
    packageConvertedMilli: num(packageMilli),
    allPackagesBdtCents: Number(allPackagesBdt),
    allPackagesConvertedMilli: num(allPackagesMilli),
    oneOffBdtCents: Number(oneOffBdt),
    oneOffConvertedMilli: num(oneOffMilli),
    projectBdtCents: Number(projectBdt),
    projectConvertedMilli: num(projectMilli),
    donorAmountMilli: num(donorMilli),
    adminConvertedMilli: num(adminMilli),
    adminBp,
    targetBp,
    warnings,
  };
}

// ===== Showing numbers =====
export const formatBdtCents = (cents: number | null): string =>
  cents === null ? '—' : (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Donor-currency amounts always show 3 decimals, as in the donor documents. */
export const formatMilli = (milli: number | null): string =>
  milli === null ? '—' : (milli / 1000).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export const formatBp = (bp: number | null): string => (bp === null ? '—' : `${(bp / 100).toFixed(2)}%`);

// ===== Typed values (the forms hold text) =====
function decimalText(label: string, opts: { decimals: number; max: number; positive?: boolean }) {
  return z
    .string()
    .trim()
    .transform((value, ctx) => {
      const text = value.replace(/,/g, '');
      const bad = (message: string) => {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });
        return z.NEVER;
      };
      if (text === '') return bad(`${label} is required`);
      if (!/^\d+(\.\d+)?$/.test(text)) return bad(`${label} must be a number`);
      const decimals = text.split('.')[1]?.length ?? 0;
      if (decimals > opts.decimals) return bad(`${label} can have at most ${opts.decimals} decimal places`);
      const n = Number(text);
      if (!Number.isFinite(n) || n > opts.max) return bad(`${label} is too large`);
      if (opts.positive && n <= 0) return bad(`${label} must be more than zero`);
      return n;
    });
}

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((v) => (v === '' ? null : v));

export const budgetItemSchema = z.object({
  kind: z.enum(['per_package', 'one_off'], { errorMap: () => ({ message: 'Choose per package or one-off' }) }),
  groupName: optionalText(120, 'Group'),
  name: z.string().trim().min(2, 'Item name must be at least 2 characters').max(200, 'Item name must be 200 characters or fewer'),
  measure: z.string().trim().min(1, 'Measure is required').max(30, 'Measure must be 30 characters or fewer'),
  quantity: decimalText('Quantity', { decimals: 3, max: 999_999_999, positive: true }),
  unitPriceBdt: decimalText('Unit price', { decimals: 2, max: 999_999_999_999.99 }),
});
export type BudgetItemFormValues = z.input<typeof budgetItemSchema>;
export type BudgetItemInput = z.output<typeof budgetItemSchema>;

export const EMPTY_ITEM_FORM: BudgetItemFormValues = {
  kind: 'per_package',
  groupName: '',
  name: '',
  measure: 'Pcs',
  quantity: '1',
  unitPriceBdt: '',
};

export const budgetSettingsSchema = z.object({
  packagesCount: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const text = v.replace(/,/g, '');
      if (!/^\d+$/.test(text) || Number(text) > 10_000_000) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Number of packages must be a whole number, 0 to 10,000,000' });
        return z.NEVER;
      }
      return Number(text);
    }),
  adminPercent: decimalText('Administration percentage', { decimals: 2, max: 30 }),
});
export type BudgetSettingsFormValues = z.input<typeof budgetSettingsSchema>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const exchangeRateSchema = z.object({
  rate: decimalText('Exchange rate', { decimals: 4, max: 99_999_999.9999, positive: true }),
  rateDate: z
    .string()
    .trim()
    .refine((v) => ISO_DATE.test(v) && !Number.isNaN(Date.parse(v)), 'Choose the date of the rate'),
  note: optionalText(500, 'Note'),
});
export type ExchangeRateFormValues = z.input<typeof exchangeRateSchema>;

/** Plain-words version of a database error from migration 0016. */
export function friendlyBudgetError(error: { code?: string | null; message?: string | null }): string {
  const message = error.message ?? '';
  const code = error.code ?? '';
  if (/only the Executive Director can set the exchange rate/i.test(message)) {
    return 'Only the Executive Director can set the exchange rate.';
  }
  if (/budget of a closed project/i.test(message)) return 'The budget of a closed project cannot be changed.';
  if (/row-level security|violates row-level|permission denied/i.test(message) || code === '42501') {
    return 'You do not have permission to do this.';
  }
  if (code === '23514' || /violates check constraint/i.test(message)) return 'Some values are not allowed. Please check the numbers and try again.';
  return 'The database could not save this. Please try again.';
}
