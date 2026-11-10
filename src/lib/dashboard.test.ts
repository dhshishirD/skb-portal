import { describe, expect, it } from 'vitest';
import { buildDashboard, isOverdue, nextSteps, sortTasks, type RawTask } from './dashboard';

const today = '2025-09-01';
const project = (over: Partial<Parameters<typeof buildDashboard>[0]['projects'][number]> = {}) => ({
  id: 'p1',
  code: '20788',
  title: 'Example',
  stage: 'implementation' as const,
  donor_name: 'IHH',
  budget_amount: 31900,
  budget_currency: 'EUR',
  end_date: '2025-08-14',
  ...over,
});
const task = (over: Partial<RawTask> = {}): RawTask => ({
  id: 't1',
  project_id: 'p1',
  title: 'Do it',
  status: 'todo',
  priority: 'medium',
  due_date: null,
  assignee_id: null,
  ...over,
});

describe('dashboard helpers', () => {
  it('knows what is overdue', () => {
    expect(isOverdue('2025-08-31', today)).toBe(true);
    expect(isOverdue('2025-09-01', today)).toBe(false);
    expect(isOverdue(null, today)).toBe(false);
  });

  it('sorts tasks by due date (none last), then priority', () => {
    const sorted = sortTasks([
      { id: 'a', dueDate: null, priority: 'urgent' },
      { id: 'b', dueDate: '2025-09-05', priority: 'low' },
      { id: 'c', dueDate: '2025-09-05', priority: 'high' },
      { id: 'd', dueDate: '2025-09-02', priority: 'low' },
    ]);
    expect(sorted.map((t) => t.id)).toEqual(['d', 'c', 'b', 'a']);
  });

  it('builds one card per project with counts and next steps', () => {
    const d = buildDashboard({
      userId: 'u1',
      today,
      projects: [project(), project({ id: 'p2', code: 'OTHER', stage: 'closed' })],
      openTasks: [task({ due_date: '2025-08-01' }), task({ id: 't2', due_date: '2025-12-01', assignee_id: 'u1' })],
      budgetItemProjectIds: [],
      receiptProjectIds: [],
      signedOffProjectIds: [],
    });
    const p1 = d.projects[0];
    expect(p1.openTasks).toBe(2);
    expect(p1.overdueTasks).toBe(1);
    expect(p1.budgetText).toBe('EUR 31,900');
    expect(p1.stageLabel.length).toBeGreaterThan(0);
    expect(p1.nextSteps).toEqual(['1 overdue task', 'Add the budget items', 'Record the fund received']);
    expect(d.projects[1].nextSteps).toEqual([]);
    expect(d.myOpenTaskCount).toBe(1);
    expect(d.myTasks[0].projectCode).toBe('20788');
  });

  it('suggests the closing report once the end date has passed', () => {
    const s = nextSteps(
      { stage: 'implementation', hasBudgetItems: true, receiptCount: 1, overdueTasks: 0, openTasks: 0, closingSignedOff: false, endDate: '2025-08-14' },
      today,
    );
    expect(s).toEqual(['The end date has passed: prepare the closing report and Form-7']);
    const done = nextSteps(
      { stage: 'implementation', hasBudgetItems: true, receiptCount: 1, overdueTasks: 0, openTasks: 0, closingSignedOff: true, endDate: '2025-08-14' },
      today,
    );
    expect(done).toEqual([]);
  });

  it('lists only the tasks assigned to the user as "my tasks"', () => {
    const d = buildDashboard({
      userId: 'u1',
      today,
      projects: [project()],
      openTasks: [task({ assignee_id: 'u2' }), task({ id: 't9', assignee_id: 'u1' })],
      budgetItemProjectIds: ['p1'],
      receiptProjectIds: ['p1'],
      signedOffProjectIds: [],
    });
    expect(d.myTasks.map((t) => t.id)).toEqual(['t9']);
  });
});
