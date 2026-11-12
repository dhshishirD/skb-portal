'use server';

import { createClient } from '@/lib/supabase/server';
import {
  areaSchema,
  canReadAreas,
  canWriteAreas,
  friendlyAreaError,
  type AreaFormValues,
  type ProjectAreasData,
} from '@/lib/projectAreas';
import { getActor, getProjectById, isUuid } from '@/server/services/projectsData';

/* Project areas (migration 0032). Runs as the signed-in user, so Row Level Security decides. */

type Failure = { ok: false; error: string };
export type AreaActionResult = { ok: true; message?: string } | Failure;
export type AreasDataResult = { ok: true; data: ProjectAreasData } | Failure;
const fail = (error: string): Failure => ({ ok: false, error });

export async function getProjectAreasAction(projectId: string): Promise<AreasDataResult> {
  try {
    if (!isUuid(projectId)) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canReadAreas(actor.roles)) return fail('You do not have permission to see the project areas.');
    const project = await getProjectById(projectId);
    if (!project) return fail('Project not found.');
    const supabase = await createClient();
    const { data, error } = await (supabase.from('project_areas') as any)
      .select('id, position, region, cities, villages, item_quantity, item_unit, families')
      .eq('project_id', projectId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) return fail('Could not load the areas. Please refresh the page.');
    return {
      ok: true,
      data: {
        projectId,
        areas: (data ?? []).map((r: any) => ({
          id: r.id,
          position: r.position,
          region: r.region,
          cities: r.cities,
          villages: r.villages,
          itemQuantity: r.item_quantity === null ? null : Number(r.item_quantity),
          itemUnit: r.item_unit,
          families: r.families,
        })),
        closed: project.stage === 'closed',
        canWrite: project.stage !== 'closed' && canWriteAreas(actor.roles),
      },
    };
  } catch {
    return fail('Could not load the areas. Please refresh the page.');
  }
}

async function guardWrite(projectId: string): Promise<Failure | null> {
  if (!isUuid(projectId)) return fail('Project not found.');
  const actor = await getActor();
  if (!actor) return fail('Please sign in again.');
  if (!canWriteAreas(actor.roles)) return fail('You do not have permission to change the project areas.');
  const project = await getProjectById(projectId);
  if (!project) return fail('Project not found.');
  if (project.stage === 'closed') return fail('This project is closed, so the areas cannot be changed.');
  return null;
}

const toRow = (p: ReturnType<typeof areaSchema.parse>) => ({
  region: p.region,
  cities: p.cities,
  villages: p.villages,
  item_quantity: p.itemQuantity,
  item_unit: p.itemUnit,
  families: p.families,
});

export async function addProjectAreaAction(projectId: string, values: AreaFormValues): Promise<AreaActionResult> {
  try {
    const blocked = await guardWrite(projectId);
    if (blocked) return blocked;
    const parsed = areaSchema.safeParse(values);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Please check the details.');
    const supabase = await createClient();
    const { data: last } = await (supabase.from('project_areas') as any)
      .select('position')
      .eq('project_id', projectId)
      .order('position', { ascending: false })
      .limit(1);
    const position = Math.min(1000, ((last?.[0]?.position as number | undefined) ?? -1) + 1);
    const { data, error } = await (supabase.from('project_areas') as any)
      .insert({ project_id: projectId, position, ...toRow(parsed.data) })
      .select('id');
    if (error) return fail(friendlyAreaError(error));
    if (!(data ?? []).length) return fail('Nothing was saved. You may not have permission on this project.');
    return { ok: true, message: 'Area added.' };
  } catch {
    return fail('Could not save. Please try again.');
  }
}

export async function updateProjectAreaAction(projectId: string, areaId: string, values: AreaFormValues): Promise<AreaActionResult> {
  try {
    const blocked = await guardWrite(projectId);
    if (blocked) return blocked;
    if (!isUuid(areaId)) return fail('Area not found.');
    const parsed = areaSchema.safeParse(values);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Please check the details.');
    const supabase = await createClient();
    const { data, error } = await (supabase.from('project_areas') as any)
      .update(toRow(parsed.data))
      .eq('id', areaId)
      .eq('project_id', projectId)
      .select('id');
    if (error) return fail(friendlyAreaError(error));
    if (!(data ?? []).length) return fail('Nothing was saved. The area may have been removed.');
    return { ok: true, message: 'Saved.' };
  } catch {
    return fail('Could not save. Please try again.');
  }
}

export async function deleteProjectAreaAction(projectId: string, areaId: string): Promise<AreaActionResult> {
  try {
    const blocked = await guardWrite(projectId);
    if (blocked) return blocked;
    if (!isUuid(areaId)) return fail('Area not found.');
    const supabase = await createClient();
    const { data, error } = await (supabase.from('project_areas') as any)
      .delete()
      .eq('id', areaId)
      .eq('project_id', projectId)
      .select('id');
    if (error) return fail(friendlyAreaError(error));
    if (!(data ?? []).length) return fail('Nothing was removed. The area may already be gone.');
    return { ok: true, message: 'Area removed.' };
  } catch {
    return fail('Could not remove. Please try again.');
  }
}
