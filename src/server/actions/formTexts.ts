'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  canReadFormTexts,
  canWriteFormTexts,
  EMPTY_FORM_TEXTS,
  formTextsSchema,
  friendlyFormTextError,
  type FormTexts,
  type FormTextsData,
} from '@/lib/formTexts';
import { getActor, getProjectById, isUuid } from '@/server/services/projectsData';

/* Donor form texts (migration 0036). Runs as the signed-in user, so Row Level Security decides. */

type Failure = { ok: false; error: string };
export type FormTextsDataResult = { ok: true; data: FormTextsData } | Failure;
export type FormTextsSaveResult = { ok: true; message: string } | Failure;
const fail = (error: string): Failure => ({ ok: false, error });

export async function getFormTextsAction(projectId: string): Promise<FormTextsDataResult> {
  try {
    if (!isUuid(projectId)) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canReadFormTexts(actor.roles)) return fail('You do not have permission to see these texts.');
    const project = await getProjectById(projectId);
    if (!project) return fail('Project not found.');
    const supabase = await createClient();
    const { data, error } = await (supabase.from('project_form_texts') as any)
      .select('rationale, experience, internal_control, other_funding, sustainability, local_support')
      .eq('project_id', projectId)
      .maybeSingle();
    if (error) return fail('Could not load the texts. Please refresh the page.');
    const texts: FormTexts = data
      ? {
          rationale: data.rationale ?? '',
          experience: data.experience ?? '',
          internalControl: data.internal_control ?? '',
          otherFunding: data.other_funding ?? '',
          sustainability: data.sustainability ?? '',
          localSupport: data.local_support ?? '',
        }
      : EMPTY_FORM_TEXTS;
    return { ok: true, data: { projectId, texts, closed: project.stage === 'closed', canWrite: project.stage !== 'closed' && canWriteFormTexts(actor.roles) } };
  } catch {
    return fail('Could not load the texts. Please refresh the page.');
  }
}

export async function saveFormTextsAction(projectId: string, values: FormTexts): Promise<FormTextsSaveResult> {
  try {
    if (!isUuid(projectId)) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canWriteFormTexts(actor.roles)) return fail('You do not have permission to change these texts.');
    const project = await getProjectById(projectId);
    if (!project) return fail('Project not found.');
    if (project.stage === 'closed') return fail('This project is closed, so the texts cannot be changed.');
    const parsed = formTextsSchema.safeParse(values);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Please check the texts.');
    const v = parsed.data;
    const orNull = (s: string) => (s.trim() === '' ? null : s.trim());
    const supabase = await createClient();
    const { error } = await (supabase.from('project_form_texts') as any).upsert(
      {
        project_id: projectId,
        rationale: orNull(v.rationale),
        experience: orNull(v.experience),
        internal_control: orNull(v.internalControl),
        other_funding: orNull(v.otherFunding),
        sustainability: orNull(v.sustainability),
        local_support: orNull(v.localSupport),
      },
      { onConflict: 'project_id' },
    );
    if (error) return fail(friendlyFormTextError(error));
    revalidatePath(`/projects/${projectId}/overview`);
    return { ok: true, message: 'Saved.' };
  } catch {
    return fail('Could not save. Please try again.');
  }
}
