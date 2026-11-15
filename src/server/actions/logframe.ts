'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  canEditIndicators,
  canEditStructure,
  canValidateValues,
  childKind,
  friendlyLogframeError,
  indicatorSchema,
  isKind,
  KIND_LABELS,
  nextCode,
  nodeSchema,
  splitLines,
  valueSchema,
  type Indicator,
  type IndicatorFormValues,
  type IndicatorMeasure,
  type LogframeData,
  type LogframeKind,
  type LogframeNode,
  type NodeFormValues,
  type ValueFormValues,
} from '@/lib/logframe';
import { getActor, getProjectById, isUuid } from '@/server/services/projectsData';

/*
 * Projects & Grants: logframe and indicators (migration 0019).
 *
 * Everything runs as the signed-in user, so Row Level Security and the database guards decide.
 * The checks below only give clearer messages and fail fast.
 */

type Failure = { ok: false; error: string };
export type LogframeActionResult = { ok: true; message?: string } | Failure;
export type LogframeDataResult<T> = { ok: true; data: T } | Failure;

const fail = (error: string): Failure => ({ ok: false, error });
const firstIssue = (e: { issues: Array<{ message: string }> }) => e.issues[0]?.message ?? 'Please check the values.';
const path = (projectId: string) => `/projects/${projectId}/logframe`;

interface NodeRow {
  id: string;
  parent_id: string | null;
  kind: string;
  code: string;
  title: string;
  description: string | null;
  assumptions: string | null;
}
interface IndicatorRow {
  id: string;
  node_id: string;
  name: string;
  unit: string;
  baseline: number | string;
  target: number | string;
  frequency: string | null;
  means_of_verification: string | null;
  measure: string;
}
interface ValueRow {
  id: string;
  indicator_id: string;
  period_start: string;
  period_end: string;
  value: number | string;
  created_by: string | null;
  validated_by: string | null;
  validated_at: string | null;
}

export async function getLogframeAction(projectId: string): Promise<LogframeDataResult<LogframeData>> {
  try {
    if (!isUuid(projectId)) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const project = await getProjectById(projectId);
    if (!project) return fail('Project not found.');

    const supabase = await createClient();
    const nodesRes = await (supabase.from('logframe_nodes') as any)
      .select('id, parent_id, kind, code, title, description, assumptions')
      .eq('project_id', projectId);
    if (nodesRes.error) return fail('Could not load the logframe. Please refresh the page.');
    const nodeRows = (nodesRes.data ?? []) as NodeRow[];
    const nodeIds = nodeRows.map((n) => n.id);

    let indicatorRows: IndicatorRow[] = [];
    let valueRows: ValueRow[] = [];
    if (nodeIds.length > 0) {
      const indRes = await (supabase.from('indicators') as any)
        .select('id, node_id, name, unit, baseline, target, frequency, means_of_verification, measure')
        .in('node_id', nodeIds);
      if (indRes.error) return fail('Could not load the indicators. Please refresh the page.');
      indicatorRows = (indRes.data ?? []) as IndicatorRow[];
      const indIds = indicatorRows.map((i) => i.id);
      if (indIds.length > 0) {
        const valRes = await (supabase.from('indicator_values') as any)
          .select('id, indicator_id, period_start, period_end, value, created_by, validated_by, validated_at')
          .in('indicator_id', indIds)
          .order('period_start', { ascending: true });
        if (valRes.error) return fail('Could not load the indicator values. Please refresh the page.');
        valueRows = (valRes.data ?? []) as ValueRow[];
      }
    }

    const personIds = [...new Set(valueRows.flatMap((v) => [v.created_by, v.validated_by]).filter((x): x is string => !!x))];
    const names = new Map<string, string>();
    if (personIds.length > 0) {
      const { data } = await (supabase.from('profiles') as any).select('id, full_name').in('id', personIds);
      for (const p of (data ?? []) as Array<{ id: string; full_name: string | null }>) {
        if (p.full_name) names.set(p.id, p.full_name);
      }
    }

    const nodes: LogframeNode[] = nodeRows
      .filter((n) => isKind(n.kind))
      .map((n) => ({ id: n.id, parentId: n.parent_id, kind: n.kind as LogframeKind, code: n.code, title: n.title, description: n.description, assumptions: n.assumptions ?? null }));
    const indicators: Indicator[] = indicatorRows.map((i) => ({
      id: i.id,
      nodeId: i.node_id,
      name: i.name,
      unit: i.unit,
      baseline: Number(i.baseline),
      target: Number(i.target),
      frequency: i.frequency,
      meansOfVerification: i.means_of_verification,
      measure: (i.measure === 'latest' ? 'latest' : 'cumulative') as IndicatorMeasure,
      values: valueRows
        .filter((v) => v.indicator_id === i.id)
        .map((v) => ({
          id: v.id,
          periodStart: v.period_start,
          periodEnd: v.period_end,
          value: Number(v.value),
          validatedAt: v.validated_at,
          validatedByName: v.validated_by ? names.get(v.validated_by) ?? null : null,
          createdByName: v.created_by ? names.get(v.created_by) ?? null : null,
          createdBy: v.created_by,
        })),
    }));

    const closed = project.stage === 'closed';
    return {
      ok: true,
      data: {
        projectId,
        nodes,
        indicators,
        userId: actor.userId,
        closed,
        canEditStructure: !closed && canEditStructure(actor.roles),
        canEditIndicators: !closed && canEditIndicators(actor.roles),
        canEnterValues: !closed && canEditIndicators(actor.roles),
        canValidate: !closed && canValidateValues(actor.roles),
      },
    };
  } catch {
    return fail('Could not load the logframe. Please refresh the page.');
  }
}

type Guard = Failure | { ok: true; userId: string };
async function guard(projectId: string, need: 'structure' | 'indicators' | 'validate'): Promise<Guard> {
  if (!isUuid(projectId)) return fail('Project not found.');
  const actor = await getActor();
  if (!actor) return fail('Please sign in again.');
  const allowed =
    need === 'structure' ? canEditStructure(actor.roles) : need === 'validate' ? canValidateValues(actor.roles) : canEditIndicators(actor.roles);
  if (!allowed) {
    return fail(
      need === 'validate'
        ? 'Only the Programme Manager, M&E Officer or Executive Director can validate a value.'
        : 'You do not have permission to change the logframe.',
    );
  }
  const project = await getProjectById(projectId);
  if (!project) return fail('Project not found.');
  if (project.stage === 'closed') return fail('The logframe of a closed project cannot be changed.');
  return { ok: true, userId: actor.userId };
}
const denied = (g: Guard): g is Failure => g.ok === false;

/** Finds the parent, checks the level, and works out the next free code. */
async function prepareNode(
  supabase: any,
  projectId: string,
  parentId: string | null,
  kind: LogframeKind,
): Promise<{ ok: true; taken: Set<string>; parentCode: string | null; siblings: number } | Failure> {
  let expected: LogframeKind = 'goal';
  let parentCode: string | null = null;
  if (parentId) {
    const { data: parent, error } = await (supabase.from('logframe_nodes') as any)
      .select('id, kind, code')
      .eq('id', parentId)
      .eq('project_id', projectId)
      .maybeSingle();
    if (error) return fail('Could not check the parent. Please try again.');
    if (!parent || !isKind(parent.kind)) return fail('The parent was not found in this project.');
    const next = childKind(parent.kind);
    if (!next) return fail('An activity cannot have items under it.');
    expected = next;
    parentCode = parent.code as string;
  }
  if (kind !== expected) return fail(`Under this parent you can only add: ${KIND_LABELS[expected].toLowerCase()}.`);
  const { data: all, error: allErr } = await (supabase.from('logframe_nodes') as any).select('code, parent_id').eq('project_id', projectId);
  if (allErr) return fail('Could not check the existing items. Please try again.');
  const rows = (Array.isArray(all) ? all : []) as Array<{ code: string; parent_id: string | null }>;
  return { ok: true, taken: new Set(rows.map((r) => r.code)), parentCode, siblings: rows.filter((r) => r.parent_id === parentId).length };
}

/** Add a goal (parentId null) or a child one level below the parent. A blank code is numbered automatically. */
export async function addNodeAction(projectId: string, parentId: string | null, values: NodeFormValues): Promise<LogframeActionResult> {
  try {
    const g = await guard(projectId, 'structure');
    if (denied(g)) return g;
    if (parentId !== null && !isUuid(parentId)) return fail('Invalid request.');
    const parsed = nodeSchema.safeParse(values);
    if (!parsed.success) return fail(firstIssue(parsed.error));

    const supabase = await createClient();
    const prep = await prepareNode(supabase, projectId, parentId, parsed.data.kind);
    if (!prep.ok) return prep;
    const code = parsed.data.code ?? nextCode(parsed.data.kind, prep.parentCode, prep.siblings, prep.taken);

    const { error } = await (supabase.from('logframe_nodes') as any).insert({
      project_id: projectId,
      parent_id: parentId,
      kind: parsed.data.kind,
      code,
      title: parsed.data.title,
      description: parsed.data.description,
      assumptions: parsed.data.assumptions,
    });
    if (error) return fail(friendlyLogframeError(error));
    revalidatePath(path(projectId));
    return { ok: true, message: 'Added.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

/** Several items at once: one per line. Each gets the next number automatically. */
export async function addNodesFromLinesAction(projectId: string, parentId: string | null, kind: LogframeKind, text: string): Promise<LogframeActionResult> {
  try {
    const g = await guard(projectId, 'structure');
    if (denied(g)) return g;
    if (parentId !== null && !isUuid(parentId)) return fail('Invalid request.');
    if (!isKind(kind)) return fail('Invalid request.');
    const titles = splitLines(text);
    if (titles.length === 0) return fail('Write at least one line.');
    for (const t of titles) {
      const check = nodeSchema.safeParse({ kind, code: '', title: t, description: '' });
      if (!check.success) return fail(`"${t.slice(0, 40)}": ${firstIssue(check.error)}`);
    }
    const supabase = await createClient();
    const prep = await prepareNode(supabase, projectId, parentId, kind);
    if (!prep.ok) return prep;
    const taken = prep.taken;
    let siblings = prep.siblings;
    const rows = titles.map((title) => {
      const code = nextCode(kind, prep.parentCode, siblings, taken);
      taken.add(code);
      siblings += 1;
      return { project_id: projectId, parent_id: parentId, kind, code, title };
    });
    const { error } = await (supabase.from('logframe_nodes') as any).insert(rows);
    if (error) return fail(friendlyLogframeError(error));
    revalidatePath(path(projectId));
    return { ok: true, message: `${rows.length} added.` };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

export async function updateNodeAction(projectId: string, nodeId: string, values: Omit<NodeFormValues, 'kind'>): Promise<LogframeActionResult> {
  try {
    if (!isUuid(nodeId)) return fail('Invalid request.');
    const g = await guard(projectId, 'structure');
    if (denied(g)) return g;
    const parsed = nodeSchema.omit({ kind: true }).safeParse(values);
    if (!parsed.success) return fail(firstIssue(parsed.error));

    const supabase = await createClient();
    const changes: Record<string, unknown> = { title: parsed.data.title, description: parsed.data.description, assumptions: parsed.data.assumptions };
    if (parsed.data.code) changes.code = parsed.data.code; // a blank code keeps the current one
    const { data, error } = await (supabase.from('logframe_nodes') as any)
      .update(changes)
      .eq('id', nodeId)
      .eq('project_id', projectId)
      .select('id');
    if (error) return fail(friendlyLogframeError(error));
    if (!data || data.length === 0) return fail('Item not found, or you are not assigned to this project.');
    revalidatePath(path(projectId));
    return { ok: true, message: 'Saved.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

/** Removes the item and everything under it (children, indicators, values). Validated values block it. */
export async function deleteNodeAction(projectId: string, nodeId: string): Promise<LogframeActionResult> {
  try {
    if (!isUuid(nodeId)) return fail('Invalid request.');
    const g = await guard(projectId, 'structure');
    if (denied(g)) return g;

    const supabase = await createClient();
    const { data, error } = await (supabase.from('logframe_nodes') as any)
      .delete()
      .eq('id', nodeId)
      .eq('project_id', projectId)
      .select('id');
    if (error) return fail(friendlyLogframeError(error));
    if (!data || data.length === 0) return fail('Item not found, or you are not assigned to this project.');
    revalidatePath(path(projectId));
    return { ok: true, message: 'Removed.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

async function nodeInProject(supabase: any, projectId: string, nodeId: string): Promise<boolean> {
  const { data } = await (supabase.from('logframe_nodes') as any).select('id').eq('id', nodeId).eq('project_id', projectId).maybeSingle();
  return !!data;
}

async function indicatorInProject(supabase: any, projectId: string, indicatorId: string): Promise<boolean> {
  const { data } = await (supabase.from('indicators') as any).select('id, node_id').eq('id', indicatorId).maybeSingle();
  if (!data) return false;
  return nodeInProject(supabase, projectId, (data as { node_id: string }).node_id);
}

const indicatorColumns = (p: ReturnType<typeof indicatorSchema.parse>) => ({
  name: p.name,
  unit: p.unit,
  baseline: p.baseline,
  target: p.target,
  frequency: p.frequency,
  means_of_verification: p.meansOfVerification,
  measure: p.measure,
});

export async function addIndicatorAction(projectId: string, nodeId: string, values: IndicatorFormValues): Promise<LogframeActionResult> {
  try {
    if (!isUuid(nodeId)) return fail('Invalid request.');
    const g = await guard(projectId, 'indicators');
    if (denied(g)) return g;
    const parsed = indicatorSchema.safeParse(values);
    if (!parsed.success) return fail(firstIssue(parsed.error));

    const supabase = await createClient();
    if (!(await nodeInProject(supabase, projectId, nodeId))) return fail('Item not found in this project.');
    const { error } = await (supabase.from('indicators') as any).insert({ node_id: nodeId, ...indicatorColumns(parsed.data) });
    if (error) return fail(friendlyLogframeError(error));
    revalidatePath(path(projectId));
    return { ok: true, message: 'Indicator added.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

export async function updateIndicatorAction(projectId: string, indicatorId: string, values: IndicatorFormValues): Promise<LogframeActionResult> {
  try {
    if (!isUuid(indicatorId)) return fail('Invalid request.');
    const g = await guard(projectId, 'indicators');
    if (denied(g)) return g;
    const parsed = indicatorSchema.safeParse(values);
    if (!parsed.success) return fail(firstIssue(parsed.error));

    const supabase = await createClient();
    if (!(await indicatorInProject(supabase, projectId, indicatorId))) return fail('Indicator not found in this project.');
    const { data, error } = await (supabase.from('indicators') as any).update(indicatorColumns(parsed.data)).eq('id', indicatorId).select('id');
    if (error) return fail(friendlyLogframeError(error));
    if (!data || data.length === 0) return fail('Indicator not found, or you are not assigned to this project.');
    revalidatePath(path(projectId));
    return { ok: true, message: 'Saved.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

export async function deleteIndicatorAction(projectId: string, indicatorId: string): Promise<LogframeActionResult> {
  try {
    if (!isUuid(indicatorId)) return fail('Invalid request.');
    const g = await guard(projectId, 'indicators');
    if (denied(g)) return g;

    const supabase = await createClient();
    if (!(await indicatorInProject(supabase, projectId, indicatorId))) return fail('Indicator not found in this project.');
    const { data, error } = await (supabase.from('indicators') as any).delete().eq('id', indicatorId).select('id');
    if (error) return fail(friendlyLogframeError(error));
    if (!data || data.length === 0) return fail('Indicator not found, or you are not assigned to this project.');
    revalidatePath(path(projectId));
    return { ok: true, message: 'Indicator removed.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

export async function addIndicatorValueAction(projectId: string, indicatorId: string, values: ValueFormValues): Promise<LogframeActionResult> {
  try {
    if (!isUuid(indicatorId)) return fail('Invalid request.');
    const g = await guard(projectId, 'indicators');
    if (denied(g)) return g;
    const parsed = valueSchema.safeParse(values);
    if (!parsed.success) return fail(firstIssue(parsed.error));

    const supabase = await createClient();
    if (!(await indicatorInProject(supabase, projectId, indicatorId))) return fail('Indicator not found in this project.');
    const { error } = await (supabase.from('indicator_values') as any).insert({
      indicator_id: indicatorId,
      period_start: parsed.data.periodStart,
      period_end: parsed.data.periodEnd,
      value: parsed.data.value,
      created_by: g.userId,
    });
    if (error) return fail(friendlyLogframeError(error));
    revalidatePath(path(projectId));
    return { ok: true, message: 'Value recorded. It counts toward progress once someone else validates it.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

export async function deleteIndicatorValueAction(projectId: string, valueId: string): Promise<LogframeActionResult> {
  try {
    if (!isUuid(valueId)) return fail('Invalid request.');
    const g = await guard(projectId, 'indicators');
    if (denied(g)) return g;

    const supabase = await createClient();
    const { data, error } = await (supabase.from('indicator_values') as any).delete().eq('id', valueId).select('id');
    if (error) return fail(friendlyLogframeError(error));
    if (!data || data.length === 0) return fail('Value not found, or you are not assigned to this project.');
    revalidatePath(path(projectId));
    return { ok: true, message: 'Value removed.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

/** Validate a value entered by someone else. The database records who and when. */
export async function validateIndicatorValueAction(projectId: string, valueId: string): Promise<LogframeActionResult> {
  try {
    if (!isUuid(valueId)) return fail('Invalid request.');
    const g = await guard(projectId, 'validate');
    if (denied(g)) return g;

    const supabase = await createClient();
    const { data, error } = await (supabase.from('indicator_values') as any)
      .update({ validated_by: g.userId, validated_at: new Date().toISOString() })
      .eq('id', valueId)
      .select('id');
    if (error) return fail(friendlyLogframeError(error));
    if (!data || data.length === 0) return fail('Value not found, or you are not assigned to this project.');
    revalidatePath(path(projectId));
    return { ok: true, message: 'Value validated.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}
