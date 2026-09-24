'use server';

import { createClient } from '@/lib/supabase/server';
import { canAdvanceStage } from '../services/projectCore';
import { AppRole, ProjectStage } from '@/lib/database.types';

export async function advanceProjectStageAction(
  projectId: string,
  targetStage: ProjectStage,
  note?: string
): Promise<{ success: boolean; message?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Authentication required');
  }

  const { data: rolesData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);

  const userRoles: AppRole[] = (rolesData as Array<{ role: AppRole }> | null)?.map((r) => r.role) || [];

  const { data: project } = await (supabase.from('projects') as any)
    .select('stage')
    .eq('id', projectId)
    .single();

  if (!project) {
    throw new Error('Project not found');
  }

  const { data: gates } = await (supabase.from('stage_gate_items') as any)
    .select('*')
    .eq('project_id', projectId);

  const gateChecks = (gates || []).map((g: any) => ({
    stage: g.stage as ProjectStage,
    label: g.label as string,
    isDone: Boolean(g.done),
  }));

  const currentStage = (project as { stage: ProjectStage }).stage;

  const validation = canAdvanceStage(currentStage, targetStage, gateChecks, userRoles);
  if (!validation.allowed) {
    throw new Error(validation.reason);
  }

  // Update project stage
  await (supabase.from('projects') as any)
    .update({ stage: targetStage })
    .eq('id', projectId);

  // Log stage history
  await (supabase.from('project_stage_history') as any).insert({
    project_id: projectId,
    from_stage: currentStage,
    to_stage: targetStage,
    changed_by: user.id,
    note: note || `Stage advanced to ${targetStage}`,
  });

  return { success: true };
}
