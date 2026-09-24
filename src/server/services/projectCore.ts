import { AppRole, ProjectStage } from '@/lib/database.types';

export interface StageGateCheck {
  stage: ProjectStage;
  label: string;
  isDone: boolean;
}

export function canAdvanceStage(
  currentStage: ProjectStage,
  targetStage: ProjectStage,
  gateItems: StageGateCheck[],
  userRoles: AppRole[]
): { allowed: boolean; reason?: string } {
  // Only Programme Manager or Executive can advance project stage
  if (!userRoles.includes('programme_manager') && !userRoles.includes('executive')) {
    return { allowed: false, reason: 'Only Programme Managers or Executives can advance project stages.' };
  }

  // Verify all stage gate checklist items for current stage are completed
  const pendingGates = gateItems.filter((item) => item.stage === currentStage && !item.isDone);
  if (pendingGates.length > 0) {
    return {
      allowed: false,
      reason: `Cannot advance stage. Uncompleted gate items: ${pendingGates.map((g) => g.label).join(', ')}`,
    };
  }

  return { allowed: true };
}
