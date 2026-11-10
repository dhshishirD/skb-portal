'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { canChangeStage } from '@/lib/projects';
import {
  MAX_NOTE_LENGTH,
  canTickGateItems,
  checkBackReason,
  friendlyGateError,
  isProjectStage,
  nextStage,
  previousStage,
  type GateItem,
  type StageGateData,
  type StageHistoryEntry,
} from '@/lib/stageGates';
import { getActor, getProjectById, isUuid } from '@/server/services/projectsData';
import type { ProjectStage } from '@/lib/database.types';

/*
 * Projects & Grants: stage gates (migration 0015).
 *
 * Everything runs as the signed-in user, so Row Level Security and the database function
 * advance_project_stage() decide. The checks below only give clearer messages and fail fast.
 */

type Failure = { ok: false; error: string };
export type GateActionResult = { ok: true; message?: string } | Failure;
export type GateDataResult<T> = { ok: true; data: T } | Failure;

const fail = (error: string): Failure => ({ ok: false, error });

interface GateItemRow {
  id: string;
  stage: ProjectStage;
  label: string;
  position: number;
  required: boolean;
  done: boolean;
  done_by: string | null;
  done_at: string | null;
}

interface HistoryRow {
  id: string;
  from_stage: ProjectStage | null;
  to_stage: ProjectStage;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

/** Current stage, the checklist, the history, and what this user may do. */
export async function getStageGatesAction(projectId: string): Promise<GateDataResult<StageGateData>> {
  try {
    if (!isUuid(projectId)) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const project = await getProjectById(projectId);
    if (!project) return fail('Project not found.');

    const supabase = await createClient();
    const [itemsRes, historyRes] = await Promise.all([
      (supabase.from('stage_gate_items') as any)
        .select('id, stage, label, position, required, done, done_by, done_at')
        .eq('project_id', projectId)
        .order('position', { ascending: true }),
      (supabase.from('project_stage_history') as any)
        .select('id, from_stage, to_stage, changed_by, note, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);
    if (itemsRes.error || historyRes.error) return fail('Could not load the stage gates. Please refresh the page.');

    const itemRows = (itemsRes.data ?? []) as GateItemRow[];
    const historyRows = (historyRes.data ?? []) as HistoryRow[];

    // Names of the people who ticked items or moved the stage (staff can read staff profiles).
    const ids = [
      ...new Set([...itemRows.map((r) => r.done_by), ...historyRows.map((r) => r.changed_by)].filter((v): v is string => !!v)),
    ];
    const names = new Map<string, string>();
    if (ids.length > 0) {
      const { data: profiles } = await (supabase.from('profiles') as any).select('id, full_name').in('id', ids);
      for (const p of (profiles ?? []) as Array<{ id: string; full_name: string | null }>) {
        if (p.full_name) names.set(p.id, p.full_name);
      }
    }

    const items: GateItem[] = itemRows.map((r) => ({
      id: r.id,
      stage: r.stage,
      label: r.label,
      position: r.position,
      required: r.required,
      done: r.done,
      doneAt: r.done_at,
      doneByName: r.done_by ? names.get(r.done_by) ?? null : null,
    }));
    const history: StageHistoryEntry[] = historyRows.map((r) => ({
      id: r.id,
      fromStage: r.from_stage,
      toStage: r.to_stage,
      changedByName: r.changed_by ? names.get(r.changed_by) ?? null : null,
      note: r.note,
      createdAt: r.created_at,
    }));

    return {
      ok: true,
      data: {
        projectId,
        stage: project.stage,
        items,
        history,
        canChangeStage: canChangeStage(actor.roles),
        canTick: canTickGateItems(actor.roles),
      },
    };
  } catch {
    return fail('Could not load the stage gates. Please refresh the page.');
  }
}

/** Tick or un-tick one checklist item of the current stage. The database records who and when. */
export async function toggleGateItemAction(projectId: string, itemId: string, done: boolean): Promise<GateActionResult> {
  try {
    if (!isUuid(projectId) || !isUuid(itemId) || typeof done !== 'boolean') return fail('Invalid request.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canTickGateItems(actor.roles)) return fail('You do not have permission to change the checklist.');

    const supabase = await createClient();
    const { data, error } = await (supabase.from('stage_gate_items') as any)
      .update({ done })
      .eq('id', itemId)
      .eq('project_id', projectId)
      .select('id');
    if (error) return fail(friendlyGateError(error));
    if (!data || data.length === 0) return fail('Item not found, or you are not assigned to this project.');
    revalidatePath(`/projects/${projectId}/kanban`);
    return { ok: true };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

/**
 * Move the project one stage forward or one stage back. Executive Director only.
 * Forward needs every required item done; back needs a written reason.
 */
export async function advanceStageAction(projectId: string, to: string, note: string): Promise<GateActionResult> {
  try {
    if (!isUuid(projectId)) return fail('Project not found.');
    if (!isProjectStage(to)) return fail('Invalid stage.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canChangeStage(actor.roles)) return fail('Only the Executive Director can change a project stage.');

    const project = await getProjectById(projectId);
    if (!project) return fail('Project not found.');

    const goingBack = previousStage(project.stage) === to;
    if (!goingBack && nextStage(project.stage) !== to) return fail('A project can only move one stage forward or one stage back.');

    const cleanNote = String(note ?? '').trim();
    if (goingBack) {
      const problem = checkBackReason(cleanNote);
      if (problem) return fail(problem);
    } else if (cleanNote.length > MAX_NOTE_LENGTH) {
      return fail(`The note must be ${MAX_NOTE_LENGTH} characters or fewer.`);
    }

    const supabase = await createClient();
    const { error } = await (supabase as any).rpc('advance_project_stage', {
      _project: projectId,
      _to: to,
      _note: cleanNote === '' ? null : cleanNote,
    });
    if (error) return fail(friendlyGateError(error));

    revalidatePath('/projects');
    revalidatePath(`/projects/${projectId}`, 'layout');
    return { ok: true, message: goingBack ? (project.stage === 'closed' ? 'Project reopened. Edits are allowed again.' : 'Project moved back.') : 'Project moved to the next stage.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}
