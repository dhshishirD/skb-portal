'use server';

import { createClient } from '@/lib/supabase/server';
import {
  PAGE_SIZE,
  SYSTEM_TABLES,
  canViewAuditLog,
  changedFields,
  cleanFilter,
  dhakaNextDayStart,
  dhakaStart,
  headline,
  tableLabel,
  type AuditEntry,
  type AuditFilter,
  type AuditPage,
} from '@/lib/auditLog';
import { getActor } from '@/server/services/projectsData';

/*
 * Audit log viewer (read only). Row Level Security already limits who can read audit_log; this checks
 * the role too, and turns each row into plain words on the server so raw old/new data (which may hold
 * personal details) never reaches the browser.
 */

export type AuditLogResult = { ok: true; data: AuditPage } | { ok: false; error: string };

interface Db {
  id: number;
  occurred_at: string;
  actor_id: string | null;
  table_name: string;
  record_id: string | null;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

const SUBJECT_TABLES = new Set(['user_roles', 'user_project_access', 'user_location_access', 'profiles']);

export async function getAuditLogAction(rawFilter: Partial<Record<keyof AuditFilter, unknown>>): Promise<AuditLogResult> {
  try {
    const actor = await getActor();
    if (!actor) return { ok: false, error: 'Please sign in again.' };
    if (!canViewAuditLog(actor.roles)) return { ok: false, error: 'You do not have access to the audit log.' };
    const f = cleanFilter(rawFilter);

    const supabase = await createClient();
    let q = (supabase.from('audit_log') as any)
      .select('id, occurred_at, actor_id, table_name, record_id, action, old_data, new_data', { count: 'exact' })
      .order('occurred_at', { ascending: false })
      .order('id', { ascending: false });
    if (f.table) q = q.eq('table_name', f.table);
    else if (!f.includeSystem) q = q.not('table_name', 'in', `(${SYSTEM_TABLES.join(',')})`);
    if (f.action) q = q.eq('action', f.action);
    if (f.actorId) q = q.eq('actor_id', f.actorId);
    if (f.from) q = q.gte('occurred_at', dhakaStart(f.from));
    if (f.to) q = q.lt('occurred_at', dhakaNextDayStart(f.to));
    const start = (f.page - 1) * PAGE_SIZE;
    const { data, error, count } = await q.range(start, start + PAGE_SIZE - 1);
    if (error) return { ok: false, error: 'Could not load the audit log. Please refresh the page.' };
    const rows = (data ?? []) as Db[];

    const subjectOf = (r: Db): string | null => {
      if (!SUBJECT_TABLES.has(r.table_name)) return null;
      const src = r.new_data ?? r.old_data;
      return r.table_name === 'profiles' ? (r.record_id ?? null) : ((src?.user_id as string | undefined) ?? null);
    };
    const personIds = [...new Set(rows.flatMap((r) => [r.actor_id, subjectOf(r)]).filter((x): x is string => !!x))];
    const names = new Map<string, string>();
    if (personIds.length > 0) {
      const { data: people } = await (supabase.from('profiles') as any).select('id, full_name').in('id', personIds);
      for (const p of (people ?? []) as Array<{ id: string; full_name: string | null }>) if (p.full_name) names.set(p.id, p.full_name);
    }

    const entries: AuditEntry[] = rows.map((r) => {
      const fields = changedFields(r.table_name, r.action, r.old_data, r.new_data);
      const sid = subjectOf(r);
      const actorName = r.actor_id ? (names.get(r.actor_id) ?? 'Unknown person') : null;
      return {
        id: r.id,
        occurredAt: r.occurred_at,
        actorId: r.actor_id,
        actorName,
        table: r.table_name,
        tableLabel: tableLabel(r.table_name),
        action: r.action,
        recordId: r.record_id,
        headline: headline({ actorName, table: r.table_name, action: r.action, subjectName: sid ? (names.get(sid) ?? null) : null, fields, newData: r.new_data }),
        fields,
      };
    });
    return { ok: true, data: { entries, total: count ?? entries.length, page: f.page, pageSize: PAGE_SIZE } };
  } catch {
    return { ok: false, error: 'Could not load the audit log. Please refresh the page.' };
  }
}
