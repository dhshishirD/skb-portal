'use server';

import { createClient } from '@/lib/supabase/server';
import { countGroups } from '@/lib/beneficiaries';
import {
  canReadHeadcount,
  canWriteHeadcount,
  friendlyHeadcountError,
  headcountSchema,
  type HeadcountData,
  type HeadcountFormValues,
} from '@/lib/headcounts';
import { getActor, getProjectById, isUuid } from '@/server/services/projectsData';

/*
 * Head count (migration 0025): numbers only. Runs as the signed-in user, so Row Level Security
 * and the database guards decide. The checks here give clearer messages and fail fast.
 */

type Failure = { ok: false; error: string };
export type HeadcountActionResult = { ok: true; message?: string } | Failure;
export type HeadcountDataResult = { ok: true; data: HeadcountData } | Failure;

const fail = (error: string): Failure => ({ ok: false, error });

export async function getHeadcountAction(projectId: string): Promise<HeadcountDataResult> {
  try {
    if (!isUuid(projectId)) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canReadHeadcount(actor.roles)) return fail('You do not have permission to see the head count.');
    const project = await getProjectById(projectId);
    if (!project) return fail('Project not found.');
    const supabase = await createClient();
    const [hc, ben] = await Promise.all([
      (supabase.from('project_headcounts') as any)
        .select('women, men, girls, boys, note, updated_by, updated_at')
        .eq('project_id', projectId)
        .maybeSingle(),
      (supabase.from('beneficiaries') as any).select('sex, birth_year').eq('project_id', projectId),
    ]);
    if (hc.error) return fail('Could not load the head count. Please refresh the page.');
    let updatedByName: string | null = null;
    if (hc.data?.updated_by) {
      const p = await (supabase.from('profiles') as any).select('full_name').eq('id', hc.data.updated_by).maybeSingle();
      updatedByName = p.data?.full_name ?? null;
    }
    const registeredTotal = ben.error
      ? 0
      : countGroups(
          ((ben.data ?? []) as Array<{ sex: string | null; birth_year: number | null }>).map((x) => ({ sex: x.sex, birthYear: x.birth_year })),
          new Date().getFullYear(),
        ).total;
    return {
      ok: true,
      data: {
        projectId,
        headcount: hc.data
          ? {
              women: hc.data.women,
              men: hc.data.men,
              girls: hc.data.girls,
              boys: hc.data.boys,
              note: hc.data.note,
              updatedAt: hc.data.updated_at,
              updatedByName,
            }
          : null,
        registeredTotal,
        closed: project.stage === 'closed',
        canWrite: project.stage !== 'closed' && canWriteHeadcount(actor.roles),
      },
    };
  } catch {
    return fail('Could not load the head count. Please refresh the page.');
  }
}

export async function saveHeadcountAction(projectId: string, values: HeadcountFormValues): Promise<HeadcountActionResult> {
  try {
    if (!isUuid(projectId)) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canWriteHeadcount(actor.roles)) return fail('You do not have permission to change the head count.');
    const project = await getProjectById(projectId);
    if (!project) return fail('Project not found.');
    if (project.stage === 'closed') return fail('This project is closed, so the head count cannot be changed.');
    const parsed = headcountSchema.safeParse(values);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Please check the numbers.');
    const supabase = await createClient();
    const { data, error } = await (supabase.from('project_headcounts') as any)
      .upsert({ project_id: projectId, ...parsed.data }, { onConflict: 'project_id' })
      .select('project_id');
    if (error) return fail(friendlyHeadcountError(error));
    if (!(data ?? []).length) return fail('Nothing was saved. You may not have permission on this project.');
    return { ok: true, message: 'Saved.' };
  } catch {
    return fail('Could not save. Please try again.');
  }
}
