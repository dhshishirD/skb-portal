import type { AppRole } from './database.types';

/*
 * Audit log viewer rules. The database writes the log (triggers) and nobody in the app can change it.
 * This file turns a raw log row into plain words and HIDES personal values: the raw old/new JSON never
 * leaves the server.
 */

const VIEWERS: AppRole[] = ['super_admin', 'executive', 'auditor', 'board', 'legal_officer', 'it_officer'];
export const canViewAuditLog = (roles: readonly AppRole[]) => roles.some((r) => VIEWERS.includes(r));

export const PAGE_SIZE = 20;

/** Automatic system messages: hidden unless asked for, so real changes are easy to find. */
export const SYSTEM_TABLES = ['notifications'];

export const TABLE_LABELS: Record<string, string> = {
  organizations: 'Organisation',
  profiles: 'User profile',
  user_roles: 'User role',
  user_project_access: 'Project access',
  user_location_access: 'Location access',
  locations: 'Location',
  grants: 'Grant',
  projects: 'Project',
  project_budget_items: 'Budget item',
  project_budget_settings: 'Budget settings',
  project_fund_receipts: 'Fund receipt',
  project_charter_versions: 'Charter',
  logframe_nodes: 'Logframe item',
  indicators: 'Indicator',
  indicator_values: 'Indicator value',
  tasks: 'Task',
  beneficiaries: 'Beneficiary',
  project_headcounts: 'Head count',
  project_file_records: 'File record',
  project_closing_checks: 'Closing checklist',
  project_closing_reports: 'Closing report',
  expenses: 'Expense claim',
  vendors: 'Vendor',
  purchase_requests: 'Purchase request',
  quotations: 'Quotation',
  purchase_orders: 'Purchase order',
  donor_reports: 'Donor report',
  donor_report_templates: 'Report template',
  ai_report_narratives: 'Report narrative',
  notifications: 'System notification',
};

export const TABLE_OPTIONS = Object.keys(TABLE_LABELS);
export const tableLabel = (t: string) => TABLE_LABELS[t] ?? t.replace(/_/g, ' ');

/** For these tables no value is shown at all, only which fields changed. */
const FIELDS_ONLY_TABLES = new Set(['beneficiaries', 'profiles', 'ai_report_narratives']);
/** Field names whose value is never shown, in any table. */
const HIDDEN_FIELD = /(phone|email|nid|national|password|token|secret|key|_enc|cipher|iv$|tag$|address|dob|birth|name_search|file_path|storage_path)/i;
/** Fields that change on every save and say nothing. */
const NOISE_FIELD = new Set(['updated_at', 'created_at', 'updated_by']);

export interface ChangedField {
  name: string;
  /** null when the value is hidden or not applicable. */
  from: string | null;
  to: string | null;
  hidden: boolean;
}

type Row = Record<string, unknown> | null;

const show = (v: unknown): string => {
  if (v === null || v === undefined) return '(empty)';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return s.length > 120 ? `${s.slice(0, 117)}…` : s;
};

export function changedFields(table: string, action: string, oldData: Row, newData: Row): ChangedField[] {
  const keys = [...new Set([...Object.keys(oldData ?? {}), ...Object.keys(newData ?? {})])].filter((k) => !NOISE_FIELD.has(k));
  const fieldsOnly = FIELDS_ONLY_TABLES.has(table);
  const out: ChangedField[] = [];
  for (const k of keys) {
    const a = oldData?.[k];
    const b = newData?.[k];
    if (action === 'UPDATE' && JSON.stringify(a) === JSON.stringify(b)) continue;
    const hidden = fieldsOnly || HIDDEN_FIELD.test(k);
    out.push({
      name: k,
      from: hidden || action === 'INSERT' ? null : show(a),
      to: hidden || action === 'DELETE' ? null : show(b),
      hidden,
    });
  }
  return out;
}

const VERB: Record<string, string> = { INSERT: 'added', UPDATE: 'changed', DELETE: 'deleted' };

/** "Daloyar Hassan changed Expense claim: status pending → paid" */
export function headline(args: {
  actorName: string | null;
  table: string;
  action: string;
  subjectName: string | null;
  fields: ChangedField[];
  newData: Row;
}): string {
  const who = args.actorName ?? 'The system (no signed-in person)';
  const verb = VERB[args.action] ?? args.action.toLowerCase();
  let what = tableLabel(args.table);
  if (args.table === 'user_roles' && typeof args.newData?.role === 'string') what = `role "${args.newData.role}"`;
  const target = args.subjectName ? ` for ${args.subjectName}` : '';
  let tail = '';
  const status = args.fields.find((f) => f.name === 'status' && !f.hidden && args.action === 'UPDATE');
  if (status) tail = `: status ${status.from} → ${status.to}`;
  return `${who} ${verb} ${what}${target}${tail}`;
}

export interface AuditFilter {
  table?: string;
  action?: 'INSERT' | 'UPDATE' | 'DELETE';
  actorId?: string;
  /** yyyy-mm-dd in Bangladesh time */
  from?: string;
  to?: string;
  /** Also show automatic system notifications. */
  includeSystem?: boolean;
  page: number;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Clean the filter from the browser; anything odd is dropped. */
export function cleanFilter(raw: Partial<Record<keyof AuditFilter, unknown>>): AuditFilter {
  const table = typeof raw.table === 'string' && /^[a-z_]{1,60}$/.test(raw.table) ? raw.table : undefined;
  const action = raw.action === 'INSERT' || raw.action === 'UPDATE' || raw.action === 'DELETE' ? raw.action : undefined;
  const actorId = typeof raw.actorId === 'string' && UUID.test(raw.actorId) ? raw.actorId : undefined;
  const ok = (d: unknown) => (typeof d === 'string' && DATE.test(d) && !Number.isNaN(Date.parse(d + 'T00:00:00Z')) ? d : undefined);
  const page = Number.isInteger(raw.page) && (raw.page as number) >= 1 && (raw.page as number) <= 100000 ? (raw.page as number) : 1;
  return { table, action, actorId, from: ok(raw.from), to: ok(raw.to), includeSystem: raw.includeSystem === true, page };
}

/** Bangladesh midnight (UTC+6) as an ISO instant. */
export const dhakaStart = (d: string) => new Date(`${d}T00:00:00+06:00`).toISOString();
export const dhakaNextDayStart = (d: string) => new Date(new Date(`${d}T00:00:00+06:00`).getTime() + 86_400_000).toISOString();

export interface AuditEntry {
  id: number;
  occurredAt: string;
  actorId: string | null;
  actorName: string | null;
  table: string;
  tableLabel: string;
  action: string;
  recordId: string | null;
  headline: string;
  fields: ChangedField[];
}

export interface AuditPage {
  entries: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}
