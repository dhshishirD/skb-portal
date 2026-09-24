import { describe, it, expect } from 'vitest';
import { canAdvanceStage } from '../projectCore';
import { AppRole, ProjectStage } from '@/lib/database.types';

describe('Phase 2 Stage Gate Validation Rules', () => {
  it('should block non-PM/Executive users from advancing stage', () => {
    const roles: AppRole[] = ['field_officer'];
    const res = canAdvanceStage('concept', 'proposal', [], roles);
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('Only Programme Managers or Executives');
  });

  it('should block stage transition if uncompleted gate items exist', () => {
    const roles: AppRole[] = ['programme_manager'];
    const gates = [
      { stage: 'concept' as ProjectStage, label: 'Concept Note Attached', isDone: true },
      { stage: 'concept' as ProjectStage, label: 'Donor Identified', isDone: false },
    ];

    const res = canAdvanceStage('concept', 'proposal', gates, roles);
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('Uncompleted gate items');
  });

  it('should allow stage transition when all gate items are completed by PM', () => {
    const roles: AppRole[] = ['programme_manager'];
    const gates = [
      { stage: 'concept' as ProjectStage, label: 'Concept Note Attached', isDone: true },
      { stage: 'concept' as ProjectStage, label: 'Donor Identified', isDone: true },
    ];

    const res = canAdvanceStage('concept', 'proposal', gates, roles);
    expect(res.allowed).toBe(true);
  });
});
