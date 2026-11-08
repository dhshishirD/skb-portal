import { z } from 'zod';
import type { AppRole } from './database.types';

/**
 * Logframe and indicators: goal > outcome > output > activity, each with indicators whose values
 * are entered per period and validated by a second person.
 *
 * The database (migration 0019) is what really enforces the rules. The helpers here drive what the
 * screen shows, build the tree, work out progress (whole numbers, no floating point drift for the
 * percentage) and turn database errors into plain words.
 */

export type LogframeKind = 'goal' | 'outcome' | 'output' | 'activity';
export const KINDS: LogframeKind[] = ['goal', 'outcome', 'output', 'activity'];
export const KIND_LABELS: Record<LogframeKind, string> = {
  goal: 'Goal',
  outcome: 'Outcome',
  output: 'Output',
  activity: 'Activity',
};
export const isKind = (v: unknown): v is LogframeKind => KINDS.includes(v as LogframeKind);
/** The level a child must have under a parent of the given level; null for an activity. */
export const childKind = (k: LogframeKind): LogframeKind | null => KINDS[KINDS.indexOf(k) + 1] ?? null;

export type IndicatorMeasure = 'cumulative' | 'latest';
export const MEASURE_LABELS: Record<IndicatorMeasure, string> = {
  cumulative: 'Add up all periods (e.g. people reached)',
  latest: 'Newest value counts (e.g. a percentage or rate)',
};

export interface IndicatorValue {
  id: string;
  periodStart: string;
  periodEnd: string;
  value: number;
  validatedAt: string | null;
  validatedByName: string | null;
  createdByName: string | null;
  createdBy: string | null;
}

export interface Indicator {
  id: string;
  nodeId: string;
  name: string;
  unit: string;
  baseline: number;
  target: number;
  frequency: string | null;
  meansOfVerification: string | null;
  measure: IndicatorMeasure;
  values: IndicatorValue[];
}

export interface LogframeNode {
  id: string;
  parentId: string | null;
  kind: LogframeKind;
  code: string;
  title: string;
  description: string | null;
}

export interface LogframeData {
  projectId: string;
  nodes: LogframeNode[];
  indicators: Indicator[];
  /** The signed-in user (used to explain why they cannot validate their own entry). */
  userId: string;
  closed: boolean;
  canEditStructure: boolean;
  canEditIndicators: boolean;
  canEnterValues: boolean;
  canValidate: boolean;
}

// ===== Who may do what =====
const STRUCTURE: AppRole[] = ['executive', 'programme_manager', 'project_officer'];
const INDICATORS: AppRole[] = ['executive', 'programme_manager', 'project_officer', 'me_officer'];
const VALIDATORS: AppRole[] = ['executive', 'programme_manager', 'me_officer'];
export const canEditStructure = (roles: AppRole[]) => roles.some((r) => STRUCTURE.includes(r));
export const canEditIndicators = (roles: AppRole[]) => roles.some((r) => INDICATORS.includes(r));
export const canValidateValues = (roles: AppRole[]) => roles.some((r) => VALIDATORS.includes(r));

// ===== Tree =====
export interface TreeNode {
  node: LogframeNode;
  children: TreeNode[];
}

const sortNodes = (a: LogframeNode, b: LogframeNode) => a.code.localeCompare(b.code, 'en', { numeric: true });

/** Nodes as a forest ordered by code; a node whose parent is missing is shown at the top. */
export function buildTree(nodes: LogframeNode[]): TreeNode[] {
  const byId = new Map(nodes.map((n) => [n.id, { node: n, children: [] as TreeNode[] }]));
  const roots: TreeNode[] = [];
  for (const n of [...nodes].sort(sortNodes)) {
    const t = byId.get(n.id)!;
    const parent = n.parentId ? byId.get(n.parentId) : undefined;
    (parent ? parent.children : roots).push(t);
  }
  return roots;
}

/** Everything under a node, including itself (used to warn before deleting). */
export function descendantCount(tree: TreeNode): number {
  return 1 + tree.children.reduce((s, c) => s + descendantCount(c), 0);
}

// ===== Progress (validated values only) =====
const cents = (n: number) => Math.round(n * 100);

export interface Progress {
  /** Achieved so far from VALIDATED values, in hundredths. */
  achievedHundredths: number;
  /** Percent of the way to the target, in hundredths of a percent; null when it cannot be worked out. */
  percentBp: number | null;
  validatedCount: number;
  pendingCount: number;
}

export function indicatorProgress(ind: Pick<Indicator, 'baseline' | 'target' | 'measure' | 'values'>): Progress {
  const validated = ind.values.filter((v) => v.validatedAt);
  const pendingCount = ind.values.length - validated.length;
  if (validated.length === 0) {
    return { achievedHundredths: 0, percentBp: null, validatedCount: 0, pendingCount };
  }
  let achieved: number;
  let denominator: number;
  if (ind.measure === 'cumulative') {
    achieved = validated.reduce((s, v) => s + cents(v.value), 0);
    denominator = cents(ind.target);
  } else {
    const newest = [...validated].sort((a, b) => b.periodEnd.localeCompare(a.periodEnd) || b.periodStart.localeCompare(a.periodStart))[0];
    achieved = cents(newest.value) - cents(ind.baseline);
    denominator = cents(ind.target) - cents(ind.baseline);
  }
  const percentBp = denominator > 0 ? Math.round((achieved * 10000) / denominator) : null;
  return {
    achievedHundredths: ind.measure === 'cumulative' ? achieved : achieved + cents(ind.baseline),
    percentBp,
    validatedCount: validated.length,
    pendingCount,
  };
}

export const formatNumber = (hundredths: number): string =>
  (hundredths / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const formatPercent = (bp: number | null): string => (bp === null ? '—' : `${(bp / 100).toFixed(1)}%`);

// ===== Typed values (forms hold text) =====
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((v) => (v === '' ? null : v));

const amount = (label: string) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      const text = value.replace(/,/g, '');
      const bad = (message: string) => {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });
        return z.NEVER;
      };
      if (text === '') return bad(`${label} is required`);
      if (!/^\d+(\.\d+)?$/.test(text)) return bad(`${label} must be a number, zero or more`);
      if ((text.split('.')[1]?.length ?? 0) > 2) return bad(`${label} can have at most 2 decimal places`);
      const n = Number(text);
      if (n > 999_999_999_999) return bad(`${label} is too large`);
      return n;
    });

export const nodeSchema = z.object({
  kind: z.enum(['goal', 'outcome', 'output', 'activity'], { errorMap: () => ({ message: 'Choose a level' }) }),
  code: z.string().trim().min(1, 'Code is required').max(20, 'Code must be 20 characters or fewer'),
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(300, 'Title must be 300 characters or fewer'),
  description: optionalText(2000, 'Description'),
});
export type NodeFormValues = z.input<typeof nodeSchema>;

export const indicatorSchema = z.object({
  name: z.string().trim().min(2, 'Indicator name must be at least 2 characters').max(300, 'Indicator name must be 300 characters or fewer'),
  unit: z.string().trim().min(1, 'Unit is required').max(40, 'Unit must be 40 characters or fewer'),
  baseline: amount('Baseline'),
  target: amount('Target'),
  frequency: optionalText(100, 'Frequency'),
  meansOfVerification: optionalText(1000, 'Means of verification'),
  measure: z.enum(['cumulative', 'latest'], { errorMap: () => ({ message: 'Choose how progress is counted' }) }),
});
export type IndicatorFormValues = z.input<typeof indicatorSchema>;

const isoDate = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)), `Choose the ${label}`);

export const valueSchema = z
  .object({
    periodStart: isoDate('start of the period'),
    periodEnd: isoDate('end of the period'),
    value: amount('Value'),
  })
  .refine((v) => v.periodEnd >= v.periodStart, { message: 'The period cannot end before it starts', path: ['periodEnd'] });
export type ValueFormValues = z.input<typeof valueSchema>;

/** Plain-words version of a database error from migration 0019. */
export function friendlyLogframeError(error: { code?: string | null; message?: string | null }): string {
  const message = error.message ?? '';
  const code = error.code ?? '';
  if (/closed project/i.test(message)) return 'The logframe of a closed project cannot be changed.';
  if (/validated value cannot/i.test(message)) return 'A validated value cannot be changed or removed.';
  if (/cannot validate a value you entered/i.test(message)) return 'Someone else must validate a value you entered.';
  if (/only the Programme Manager, M&E Officer/i.test(message)) return 'Only the Programme Manager, M&E Officer or Executive Director can validate a value.';
  if (/wrong level|same project|has no parent/i.test(message)) return 'That item does not fit under this parent. Goal, then outcome, then output, then activity.';
  if (/cannot be moved|cannot move/i.test(message)) return 'This item cannot be moved. Remove it and add it again where you want it.';
  if (code === '23505') return 'That code is already used in this project. Choose another.';
  if (/row-level security|violates row-level|permission denied/i.test(message) || code === '42501') {
    return 'You do not have permission to do this.';
  }
  if (code === '23514' || /violates check constraint/i.test(message)) return 'Some values are not allowed. Please check them and try again.';
  return 'The database could not save this. Please try again.';
}
