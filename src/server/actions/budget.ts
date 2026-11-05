'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_SETTINGS,
  budgetItemSchema,
  budgetSettingsSchema,
  canEditBudget,
  canSetExchangeRate,
  exchangeRateSchema,
  friendlyBudgetError,
  type BudgetData,
  type BudgetItem,
  type BudgetItemFormValues,
  type BudgetSettingsFormValues,
  type ExchangeRateFormValues,
} from '@/lib/budget';
import { getActor, getProjectById, isUuid } from '@/server/services/projectsData';

/*
 * Projects & Grants: budget and packages (migration 0016).
 *
 * Everything runs as the signed-in user, so Row Level Security and the database guards decide.
 * The checks below only give clearer messages and fail fast. Totals are calculated in
 * src/lib/budget.ts and never stored.
 */

type Failure = { ok: false; error: string };
export type BudgetActionResult = { ok: true; message?: string } | Failure;
export type BudgetDataResult<T> = { ok: true; data: T } | Failure;

const fail = (error: string): Failure => ({ ok: false, error });
const firstIssue = (e: { issues: Array<{ message: string }> }) => e.issues[0]?.message ?? 'Please check the values.';

interface ItemRow {
  id: string;
  kind: 'per_package' | 'one_off';
  group_name: string | null;
  position: number;
  name: string;
  measure: string;
  quantity: number | string;
  unit_price_bdt: number | string;
}

interface SettingsRow {
  packages_count: number;
  admin_percent: number | string;
  exchange_rate: number | string | null;
  rate_date: string | null;
  rate_note: string | null;
  rate_set_by: string | null;
  rate_set_at: string | null;
}

/** Items, settings, the donor amount and what this user may do. */
export async function getBudgetAction(projectId: string): Promise<BudgetDataResult<BudgetData>> {
  try {
    if (!isUuid(projectId)) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const project = await getProjectById(projectId);
    if (!project) return fail('Project not found.');

    const supabase = await createClient();
    const [itemsRes, settingsRes] = await Promise.all([
      (supabase.from('project_budget_items') as any)
        .select('id, kind, group_name, position, name, measure, quantity, unit_price_bdt')
        .eq('project_id', projectId)
        .order('position', { ascending: true }),
      (supabase.from('project_budget_settings') as any)
        .select('packages_count, admin_percent, exchange_rate, rate_date, rate_note, rate_set_by, rate_set_at')
        .eq('project_id', projectId)
        .maybeSingle(),
    ]);
    if (itemsRes.error || settingsRes.error) return fail('Could not load the budget. Please refresh the page.');

    const row = settingsRes.data as SettingsRow | null;
    let rateSetByName: string | null = null;
    if (row?.rate_set_by) {
      const { data: profile } = await (supabase.from('profiles') as any)
        .select('full_name')
        .eq('id', row.rate_set_by)
        .maybeSingle();
      rateSetByName = (profile as { full_name: string | null } | null)?.full_name ?? null;
    }

    const items: BudgetItem[] = ((itemsRes.data ?? []) as ItemRow[]).map((r) => ({
      id: r.id,
      kind: r.kind,
      groupName: r.group_name,
      position: r.position,
      name: r.name,
      measure: r.measure,
      quantity: Number(r.quantity),
      unitPriceBdt: Number(r.unit_price_bdt),
    }));
    const closed = project.stage === 'closed';

    return {
      ok: true,
      data: {
        projectId,
        stage: project.stage,
        donorAmount: project.budget_amount === null || project.budget_amount === '' ? null : Number(project.budget_amount),
        currency: project.budget_currency,
        settings: row
          ? {
              packagesCount: row.packages_count,
              adminPercent: Number(row.admin_percent),
              exchangeRate: row.exchange_rate === null ? null : Number(row.exchange_rate),
              rateDate: row.rate_date,
              rateNote: row.rate_note,
              rateSetByName,
              rateSetAt: row.rate_set_at,
            }
          : DEFAULT_SETTINGS,
        items,
        closed,
        canEdit: !closed && canEditBudget(actor.roles),
        canSetRate: !closed && canSetExchangeRate(actor.roles),
      },
    };
  } catch {
    return fail('Could not load the budget. Please refresh the page.');
  }
}

async function guard(projectId: string, need: 'edit' | 'rate'): Promise<Failure | null> {
  if (!isUuid(projectId)) return fail('Project not found.');
  const actor = await getActor();
  if (!actor) return fail('Please sign in again.');
  if (need === 'rate' ? !canSetExchangeRate(actor.roles) : !canEditBudget(actor.roles)) {
    return fail(need === 'rate' ? 'Only the Executive Director can set the exchange rate.' : 'You do not have permission to change the budget.');
  }
  const project = await getProjectById(projectId);
  if (!project) return fail('Project not found.');
  if (project.stage === 'closed') return fail('The budget of a closed project cannot be changed.');
  return null;
}

/** Number of packages and the target administration percentage. Never touches the exchange rate. */
export async function saveBudgetSettingsAction(projectId: string, values: BudgetSettingsFormValues): Promise<BudgetActionResult> {
  try {
    const denied = await guard(projectId, 'edit');
    if (denied) return denied;
    const parsed = budgetSettingsSchema.safeParse(values);
    if (!parsed.success) return fail(firstIssue(parsed.error));

    const supabase = await createClient();
    const { error } = await (supabase.from('project_budget_settings') as any).upsert(
      { project_id: projectId, packages_count: parsed.data.packagesCount, admin_percent: parsed.data.adminPercent },
      { onConflict: 'project_id' },
    );
    if (error) return fail(friendlyBudgetError(error));
    revalidatePath(`/projects/${projectId}/budget`);
    return { ok: true, message: 'Saved.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

/** Exchange rate with its date and an optional note. Executive Director only. */
export async function setExchangeRateAction(projectId: string, values: ExchangeRateFormValues): Promise<BudgetActionResult> {
  try {
    const denied = await guard(projectId, 'rate');
    if (denied) return denied;
    const parsed = exchangeRateSchema.safeParse(values);
    if (!parsed.success) return fail(firstIssue(parsed.error));

    const supabase = await createClient();
    const { error } = await (supabase.from('project_budget_settings') as any).upsert(
      { project_id: projectId, exchange_rate: parsed.data.rate, rate_date: parsed.data.rateDate, rate_note: parsed.data.note },
      { onConflict: 'project_id' },
    );
    if (error) return fail(friendlyBudgetError(error));
    revalidatePath(`/projects/${projectId}/budget`);
    return { ok: true, message: 'Exchange rate saved.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

/** Add an item. It goes to the end of the list. */
export async function addBudgetItemAction(projectId: string, values: BudgetItemFormValues): Promise<BudgetActionResult> {
  try {
    const denied = await guard(projectId, 'edit');
    if (denied) return denied;
    const parsed = budgetItemSchema.safeParse(values);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');

    const supabase = await createClient();
    const { data: last } = await (supabase.from('project_budget_items') as any)
      .select('position')
      .eq('project_id', projectId)
      .order('position', { ascending: false })
      .limit(1);
    const position = ((last?.[0]?.position as number | undefined) ?? 0) + 10;

    const { error } = await (supabase.from('project_budget_items') as any).insert({
      project_id: projectId,
      kind: parsed.data.kind,
      group_name: parsed.data.kind === 'one_off' ? null : parsed.data.groupName,
      position,
      name: parsed.data.name,
      measure: parsed.data.measure,
      quantity: parsed.data.quantity,
      unit_price_bdt: parsed.data.unitPriceBdt,
      created_by: actor.userId,
    });
    if (error) return fail(friendlyBudgetError(error));
    revalidatePath(`/projects/${projectId}/budget`);
    return { ok: true, message: 'Item added.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

export async function updateBudgetItemAction(projectId: string, itemId: string, values: BudgetItemFormValues): Promise<BudgetActionResult> {
  try {
    if (!isUuid(itemId)) return fail('Invalid request.');
    const denied = await guard(projectId, 'edit');
    if (denied) return denied;
    const parsed = budgetItemSchema.safeParse(values);
    if (!parsed.success) return fail(firstIssue(parsed.error));

    const supabase = await createClient();
    const { data, error } = await (supabase.from('project_budget_items') as any)
      .update({
        kind: parsed.data.kind,
        group_name: parsed.data.kind === 'one_off' ? null : parsed.data.groupName,
        name: parsed.data.name,
        measure: parsed.data.measure,
        quantity: parsed.data.quantity,
        unit_price_bdt: parsed.data.unitPriceBdt,
      })
      .eq('id', itemId)
      .eq('project_id', projectId)
      .select('id');
    if (error) return fail(friendlyBudgetError(error));
    if (!data || data.length === 0) return fail('Item not found, or you are not assigned to this project.');
    revalidatePath(`/projects/${projectId}/budget`);
    return { ok: true, message: 'Item saved.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

export async function deleteBudgetItemAction(projectId: string, itemId: string): Promise<BudgetActionResult> {
  try {
    if (!isUuid(itemId)) return fail('Invalid request.');
    const denied = await guard(projectId, 'edit');
    if (denied) return denied;

    const supabase = await createClient();
    const { data, error } = await (supabase.from('project_budget_items') as any)
      .delete()
      .eq('id', itemId)
      .eq('project_id', projectId)
      .select('id');
    if (error) return fail(friendlyBudgetError(error));
    if (!data || data.length === 0) return fail('Item not found, or you are not assigned to this project.');
    revalidatePath(`/projects/${projectId}/budget`);
    return { ok: true, message: 'Item removed.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}
