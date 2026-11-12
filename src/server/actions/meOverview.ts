'use server';

import { createClient } from '@/lib/supabase/server';
import { buildMeOverview, canViewMeOverview, type MeOverview, type RawHeadcount, type RawIndicator, type RawNode, type RawTask, type RawValue } from '@/lib/meOverview';
import { getActor, listProjects } from '@/server/services/projectsData';

/*
 * M&E Overview (read only). Runs as the signed-in user, so Row Level Security decides which
 * projects, indicators, tasks and head counts are visible. Nothing is written.
 */

export type MeOverviewResult = { ok: true; data: MeOverview } | { ok: false; error: string };

const num = (v: unknown) => Number(v);

export async function getMeOverviewAction(): Promise<MeOverviewResult> {
  try {
    const actor = await getActor();
    if (!actor) return { ok: false, error: 'Please sign in again.' };
    if (!canViewMeOverview(actor.roles)) return { ok: false, error: 'You do not have access to the M&E overview.' };

    const projects = await listProjects();
    if (projects.length === 0) {
      return { ok: true, data: buildMeOverview({ projects: [], nodes: [], indicators: [], values: [], tasks: [], headcounts: [], today: '' }) };
    }
    const projectIds = projects.map((p) => p.id);
    const supabase = await createClient();

    const [nodesRes, tasksRes, headRes] = await Promise.all([
      (supabase.from('logframe_nodes') as any).select('id, project_id, code, title').in('project_id', projectIds).limit(5000),
      (supabase.from('tasks') as any).select('project_id, status, due_date').in('project_id', projectIds).limit(10000),
      (supabase.from('project_headcounts') as any).select('project_id, women, men, girls, boys').in('project_id', projectIds),
    ]);
    if (nodesRes.error) return { ok: false, error: 'Could not load the M&E overview. Please refresh the page.' };

    const nodes: RawNode[] = ((nodesRes.data ?? []) as Array<{ id: string; project_id: string; code: string; title: string }>).map((n) => ({
      id: n.id, projectId: n.project_id, code: n.code, title: n.title,
    }));
    let indicators: RawIndicator[] = [];
    let values: RawValue[] = [];
    if (nodes.length > 0) {
      const indRes = await (supabase.from('indicators') as any)
        .select('id, node_id, name, unit, baseline, target, measure')
        .in('node_id', nodes.map((n) => n.id));
      if (indRes.error) return { ok: false, error: 'Could not load the indicators. Please refresh the page.' };
      indicators = ((indRes.data ?? []) as Array<Record<string, unknown>>).map((i) => ({
        id: String(i.id), nodeId: String(i.node_id), name: String(i.name), unit: String(i.unit),
        baseline: num(i.baseline), target: num(i.target), measure: i.measure === 'latest' ? 'latest' : 'cumulative',
      }));
      if (indicators.length > 0) {
        const valRes = await (supabase.from('indicator_values') as any)
          .select('indicator_id, period_start, period_end, value, validated_at')
          .in('indicator_id', indicators.map((i) => i.id))
          .limit(20000);
        if (valRes.error) return { ok: false, error: 'Could not load the indicator values. Please refresh the page.' };
        values = ((valRes.data ?? []) as Array<Record<string, unknown>>).map((v) => ({
          indicatorId: String(v.indicator_id), periodStart: String(v.period_start), periodEnd: String(v.period_end),
          value: num(v.value), validatedAt: (v.validated_at as string | null) ?? null,
        }));
      }
    }

    const tasks: RawTask[] = ((tasksRes.data ?? []) as Array<{ project_id: string; status: string; due_date: string | null }>).map((t) => ({
      projectId: t.project_id, status: t.status, dueDate: t.due_date,
    }));
    const headcounts: RawHeadcount[] = ((headRes.data ?? []) as Array<Record<string, unknown>>).map((h) => ({
      projectId: String(h.project_id), women: num(h.women), men: num(h.men), girls: num(h.girls), boys: num(h.boys),
    }));

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    return {
      ok: true,
      data: buildMeOverview({
        projects: projects.map((p) => ({ id: p.id, code: p.code, title: p.title, stage: p.stage })),
        nodes, indicators, values, tasks, headcounts, today,
      }),
    };
  } catch {
    return { ok: false, error: 'Could not load the M&E overview. Please refresh the page.' };
  }
}
