import { AppRole } from '@/lib/database.types';

export interface ApprovalCheckInput {
  claimantId: string;
  actorId: string;
  previousActorId?: string;
  actorRoles: AppRole[];
  requiredRole: AppRole;
}

export function validateApprovalStep(input: ApprovalCheckInput): { allowed: boolean; reason?: string } {
  // Separation of duties rule 1: Submitter/Claimant cannot approve their own claim
  if (input.claimantId === input.actorId) {
    return { allowed: false, reason: 'Separation of duties violation: Submitter cannot approve their own claim.' };
  }

  // Separation of duties rule 2: Same actor cannot approve two consecutive steps
  if (input.previousActorId && input.previousActorId === input.actorId) {
    return { allowed: false, reason: 'Separation of duties violation: Same user cannot approve consecutive steps.' };
  }

  // Role check
  if (!input.actorRoles.includes(input.requiredRole)) {
    return { allowed: false, reason: `Role violation: Action requires role '${input.requiredRole}'.` };
  }

  return { allowed: true };
}

export function calculateBurnRate(spentAmount: number, totalGrantAmount: number): { burnRatePercent: number; remainingAmount: number } {
  if (totalGrantAmount <= 0) {
    return { burnRatePercent: 0, remainingAmount: 0 };
  }

  const burnRatePercent = Number(((spentAmount / totalGrantAmount) * 100).toFixed(2));
  const remainingAmount = Number((totalGrantAmount - spentAmount).toFixed(2));

  return { burnRatePercent, remainingAmount };
}
