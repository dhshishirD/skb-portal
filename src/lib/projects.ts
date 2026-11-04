import { z } from 'zod';
import type { AppRole, ProjectStage } from './database.types';

/**
 * Projects: stages, currencies, who may do what, and the form <-> database mapping.
 *
 * The permission helpers here only drive what the screen shows. Row Level Security
 * (supabase/migrations/0012_projects_core.sql) is what actually allows or blocks a change.
 */

// ===== Stages =====
export const PROJECT_STAGES: ProjectStage[] = [
  'concept',
  'proposal',
  'approved',
  'implementation',
  'monitoring_evaluation',
  'closed',
];

export const STAGE_LABELS: Record<ProjectStage, string> = {
  concept: 'Concept',
  proposal: 'Proposal',
  approved: 'Approved',
  implementation: 'Implementation',
  monitoring_evaluation: 'Monitoring & evaluation',
  closed: 'Closed',
};

// ===== Money =====
export const CURRENCIES = ['BDT', 'EUR', 'USD', 'GBP', 'TRY', 'QAR', 'SAR', 'AED'] as const;
export type Currency = (typeof CURRENCIES)[number];
export const DEFAULT_CURRENCY: Currency = 'BDT';

/** "EUR 150,000.50". Shows nothing invented: no amount gives a plain dash. */
export function formatMoney(amount: number | string | null | undefined, currency: string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) return '—';
  const code = currency && /^[A-Z]{3}$/.test(currency) ? currency : DEFAULT_CURRENCY;
  const text = n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${code} ${text}`;
}

// ===== Who may do what =====
const hasAny = (roles: AppRole[], allowed: AppRole[]) => roles.some((r) => allowed.includes(r));

/** Executive Director, Programme Manager and Program Officers create and edit projects. */
const PROJECT_WRITERS: AppRole[] = ['executive', 'programme_manager', 'project_officer'];

export const canCreateProjects = (roles: AppRole[]) => hasAny(roles, PROJECT_WRITERS);
export const canEditProjects = (roles: AppRole[]) => hasAny(roles, PROJECT_WRITERS);
/** Only the Executive Director archives a project. */
export const canArchiveProjects = (roles: AppRole[]) => roles.includes('executive');
/** Only the Executive Director changes a project's stage. */
export const canChangeStage = (roles: AppRole[]) => roles.includes('executive');
/** A Super Admin or Programme Manager assigns officers to projects. */
export const canAssignOfficers = (roles: AppRole[]) => hasAny(roles, ['super_admin', 'programme_manager']);

// ===== Form input =====
const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_./-]{1,59}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((v) => (v === '' ? null : v));

export const projectInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(CODE_PATTERN, 'Code: 2–60 letters, numbers, dash, dot, slash or underscore (start with a letter or number)'),
    title: z.string().trim().min(3, 'Title must be at least 3 characters').max(300, 'Title must be 300 characters or fewer'),
    description: optionalText(5000, 'Description'),
    location: optionalText(200, 'Location'),
    donor_name: optionalText(200, 'Donor'),
    ngoab_ref: optionalText(100, 'NGOAB reference'),
    budget_amount: z
      .string()
      .trim()
      .transform((v, ctx) => {
        if (v === '') return null;
        const n = Number(v.replace(/,/g, ''));
        if (!Number.isFinite(n) || n < 0 || n > 999_999_999_999.99) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Budget must be a number, zero or more' });
          return z.NEVER;
        }
        return Math.round(n * 100) / 100;
      }),
    budget_currency: z.enum(CURRENCIES, { errorMap: () => ({ message: 'Choose a currency from the list' }) }),
    beneficiary_target: z
      .string()
      .trim()
      .transform((v, ctx) => {
        if (v === '') return null;
        const n = Number(v.replace(/,/g, ''));
        if (!Number.isInteger(n) || n < 0 || n > 100_000_000) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Beneficiary target must be a whole number, zero or more' });
          return z.NEVER;
        }
        return n;
      }),
    start_date: z
      .string()
      .trim()
      .refine((v) => v === '' || ISO_DATE.test(v), 'Use a valid date')
      .transform((v) => (v === '' ? null : v)),
    end_date: z
      .string()
      .trim()
      .refine((v) => v === '' || ISO_DATE.test(v), 'Use a valid date')
      .transform((v) => (v === '' ? null : v)),
  })
  .refine((v) => !v.start_date || !v.end_date || v.end_date >= v.start_date, {
    message: 'End date must be on or after the start date',
    path: ['end_date'],
  });

/** What the form holds: every field is text. */
export type ProjectFormValues = z.input<typeof projectInputSchema>;
/** What passes validation: empty text becomes null, numbers become numbers. */
export type ProjectInput = z.output<typeof projectInputSchema>;

export const EMPTY_PROJECT_FORM: ProjectFormValues = {
  code: '',
  title: '',
  description: '',
  location: '',
  donor_name: '',
  ngoab_ref: '',
  budget_amount: '',
  budget_currency: DEFAULT_CURRENCY,
  beneficiary_target: '',
  start_date: '',
  end_date: '',
};

// ===== Database rows =====
export interface ProjectRow {
  id: string;
  code: string;
  title: string;
  description: string | null;
  stage: ProjectStage;
  location: string | null;
  donor_name: string | null;
  ngoab_ref: string | null;
  budget_amount: number | string | null;
  budget_currency: string;
  beneficiary_target: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

/** Columns the portfolio and overview pages read. Never select * on a table that may grow. */
export const PROJECT_COLUMNS =
  'id, code, title, description, stage, location, donor_name, ngoab_ref, budget_amount, budget_currency, beneficiary_target, start_date, end_date, created_at, created_by, updated_at';

/** Validated input -> columns to write. created_by is set by the caller on insert only. */
export function projectInputToRow(input: ProjectInput) {
  return {
    code: input.code,
    title: input.title,
    description: input.description,
    location: input.location,
    donor_name: input.donor_name,
    ngoab_ref: input.ngoab_ref,
    budget_amount: input.budget_amount,
    budget_currency: input.budget_currency,
    beneficiary_target: input.beneficiary_target,
    start_date: input.start_date,
    end_date: input.end_date,
  };
}

/** Database row -> form values (for editing). */
export function projectRowToForm(row: ProjectRow): ProjectFormValues {
  const currency = (CURRENCIES as readonly string[]).includes(row.budget_currency)
    ? (row.budget_currency as Currency)
    : DEFAULT_CURRENCY;
  return {
    code: row.code,
    title: row.title,
    description: row.description ?? '',
    location: row.location ?? '',
    donor_name: row.donor_name ?? '',
    ngoab_ref: row.ngoab_ref ?? '',
    budget_amount: row.budget_amount === null || row.budget_amount === undefined ? '' : String(row.budget_amount),
    budget_currency: currency,
    beneficiary_target: row.beneficiary_target === null ? '' : String(row.beneficiary_target),
    start_date: row.start_date ?? '',
    end_date: row.end_date ?? '',
  };
}
