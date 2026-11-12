import { describe, expect, it } from 'vitest';
import { buildMeOverview, canViewMeOverview } from '../meOverview';

const base = {
  projects: [
    { id: 'p1', code: 'P-1', title: 'One', stage: 'implementation' },
    { id: 'p2', code: 'P-2', title: 'Two', stage: 'implementation' },
  ],
  nodes: [{ id: 'n1', projectId: 'p1', code: '1.1', title: 'Output' }],
  indicators: [
    { id: 'i1', nodeId: 'n1', name: 'People trained', unit: 'people', baseline: 0, target: 100, measure: 'cumulative' as const },
    { id: 'i2', nodeId: 'n1', name: 'Awareness', unit: '%', baseline: 20, target: 60, measure: 'latest' as const },
    { id: 'i3', nodeId: 'n1', name: 'Kits', unit: 'kits', baseline: 0, target: 10, measure: 'cumulative' as const },
  ],
  values: [
    { indicatorId: 'i1', periodStart: '2026-01-01', periodEnd: '2026-01-31', value: 60, validatedAt: '2026-02-01' },
    { indicatorId: 'i1', periodStart: '2026-02-01', periodEnd: '2026-02-28', value: 50, validatedAt: '2026-03-01' },
    { indicatorId: 'i1', periodStart: '2026-03-01', periodEnd: '2026-03-31', value: 99, validatedAt: null },
    { indicatorId: 'i2', periodStart: '2026-01-01', periodEnd: '2026-01-31', value: 40, validatedAt: '2026-02-01' },
  ],
  tasks: [
    { projectId: 'p1', status: 'done', dueDate: '2026-01-01' },
    { projectId: 'p1', status: 'todo', dueDate: '2026-02-01' },
    { projectId: 'p1', status: 'todo', dueDate: null },
  ],
  headcounts: [{ projectId: 'p1', women: 50, men: 10, girls: 5, boys: 5 }],
  today: '2026-06-01',
};

describe('buildMeOverview', () => {
  const o = buildMeOverview(base);
  const p1 = o.projects[0];
  const byName = (n: string) => p1.indicators.find((i) => i.name === n)!;

  it('counts only validated values (the pending 99 is not added)', () => {
    expect(byName('People trained').percent).toBe(110);
    expect(byName('People trained').state).toBe('reached');
    expect(byName('People trained').pendingCount).toBe(1);
  });
  it('uses the newest validated value for "latest" indicators', () => {
    expect(byName('Awareness').percent).toBe(50);
    expect(byName('Awareness').state).toBe('on_the_way');
  });
  it('shows no progress when nothing is validated', () => {
    expect(byName('Kits').percent).toBeNull();
    expect(byName('Kits').state).toBe('no_validated_value');
  });
  it('rolls up totals', () => {
    expect(o.totals).toMatchObject({ projects: 2, indicators: 3, reached: 1, onTheWay: 1, noValidatedValue: 1, pendingValues: 1, overdueTasks: 1 });
  });
  it('adds head count and task counts', () => {
    expect(p1.headcountTotal).toBe(70);
    expect(p1.tasks).toMatchObject({ total: 3, done: 1, overdue: 1 });
  });
  it('gives plain hints, and tells a project without indicators what to do', () => {
    expect(p1.hints.join(' ')).toMatch(/waiting for validation/);
    expect(p1.hints.join(' ')).toMatch(/no value entered/);
    expect(p1.hints.join(' ')).toMatch(/overdue/);
    const p2 = o.projects[1];
    expect(p2.indicators).toHaveLength(0);
    expect(p2.headcountTotal).toBeNull();
    expect(p2.hints[0]).toMatch(/Logframe/);
  });
  it('handles no projects', () => {
    expect(buildMeOverview({ ...base, projects: [], nodes: [], indicators: [], values: [], tasks: [], headcounts: [] }).totals.projects).toBe(0);
  });
});

describe('canViewMeOverview', () => {
  it('allows M&E, managers, executive, board; not finance or donor roles', () => {
    expect(canViewMeOverview(['me_officer'])).toBe(true);
    expect(canViewMeOverview(['finance'])).toBe(false);
    expect(canViewMeOverview([])).toBe(false);
  });
});
