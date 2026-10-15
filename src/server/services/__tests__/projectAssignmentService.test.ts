import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectAssignmentService } from '../projectAssignmentService';

describe('ProjectAssignmentService: Multi-Officer Project Governance', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  });

  it('should return initial assigned officers for standard projects', () => {
    const cowAssigned = ProjectAssignmentService.getAssignedOfficers('BD-SKB-2026-COW-20');
    expect(cowAssigned).toContain('Md. Abu Huraira');
    expect(cowAssigned).toContain('Mizbah Uddin');

    const goatAssigned = ProjectAssignmentService.getAssignedOfficers('BD-SKB-2026-LIV-CLO');
    expect(goatAssigned).toContain('Emran Ahmed');
    expect(goatAssigned).not.toContain('Mizbah Uddin');
  });

  it('should correctly check if an officer is assigned to a project', () => {
    // Emran Ahmed is assigned to Goats project
    expect(
      ProjectAssignmentService.isUserAssigned('BD-SKB-2026-LIV-CLO', 'Emran Ahmed')
    ).toBe(true);

    // Mizbah Uddin is NOT assigned to Goats project
    expect(
      ProjectAssignmentService.isUserAssigned('BD-SKB-2026-LIV-CLO', 'Mizbah Uddin')
    ).toBe(false);

    // Mizbah Uddin is assigned to Clean Water project
    expect(
      ProjectAssignmentService.isUserAssigned('BD-SKB-2026-UOL-WTR', 'Mizbah Uddin')
    ).toBe(true);
  });

  it('should allow Executive Director to assign multiple officers to a project', () => {
    const projectId = 'BD-SKB-2026-UOL-WTR';
    
    // Initially only Mizbah Uddin
    expect(ProjectAssignmentService.getAssignedOfficers(projectId)).toEqual(['Mizbah Uddin']);

    // Executive Director assigns both Emran Ahmed and Daloyar Hassan
    ProjectAssignmentService.setAssignedOfficers(projectId, ['Emran Ahmed', 'Daloyar Hassan']);

    const updated = ProjectAssignmentService.getAssignedOfficers(projectId);
    expect(updated).toEqual(['Emran Ahmed', 'Daloyar Hassan']);

    // Now Emran is assigned
    expect(ProjectAssignmentService.isUserAssigned(projectId, 'Emran Ahmed')).toBe(true);
    expect(ProjectAssignmentService.isUserAssigned(projectId, 'Daloyar Hassan')).toBe(true);
  });

  it('should restrict assignment authority to Executive Director only', () => {
    // Executive Director has assignment rights
    expect(ProjectAssignmentService.canUserAssignOfficers('Md. Abu Huraira', 'Executive Director')).toBe(true);
    expect(ProjectAssignmentService.canUserAssignOfficers('Abu Huraira', '', 'kindnessforbeauty@gmail.com')).toBe(true);

    // Program Officers do NOT have assignment rights
    expect(ProjectAssignmentService.canUserAssignOfficers('Emran Ahmed', 'Program Officer')).toBe(false);
    expect(ProjectAssignmentService.canUserAssignOfficers('Mizbah Uddin', 'Program Officer')).toBe(false);
    expect(ProjectAssignmentService.canUserAssignOfficers('Daloyar Hassan', 'Program Officer')).toBe(false);
  });

  it('should list all assignable official personnel', () => {
    const officers = ProjectAssignmentService.getAssignableOfficers();
    expect(officers.length).toBeGreaterThanOrEqual(5);

    const names = officers.map(o => o.name);
    expect(names).toContain('Emran Ahmed');
    expect(names).toContain('Mizbah Uddin');
    expect(names).toContain('Daloyar Hassan');
    expect(names).toContain('Md. Abu Huraira');
  });
});
