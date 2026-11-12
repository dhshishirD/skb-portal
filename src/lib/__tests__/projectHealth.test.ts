import { describe, expect, it } from 'vitest';
import {
  attentionList,
  budgetHealth,
  canSeeHealth,
  canSeeHealthMoney,
  daysBetween,
  fundHealth,
  indicatorHealth,
  sumExpenses,
  taskHealth,
  upcomingDates,
} from '../projectHealth';
import type { Task } from '../tasks';
import type { Indicator } from '../logframe';
import type { FundReceipt } from '../fundReceipts';

const task = (o: Partial<Task>): Task => ({
  id: 't', title: 'T', description: null, status: 'todo', priority: 'medium', dueDate: null,
  assigneeId: null, assigneeName: null, nodeId: null, nodeLabel: null, completedAt: null, comments: [], ...o,
});

describe('project health', () => {
  it('counts only approved or paid claims as spent', () => {
    const r = sumExpenses([
      { amount: 100, fxRateToBdt: 1, status: 'paid' },
      { amount: 50, fxRateToBdt: 2, status: 'director_approved' },
      { amount: 70, fxRateToBdt: 1, status: 'submitted' },
      { amount: 999, fxRateToBdt: 1, status: 'rejected' },
    ]);
    expect(r).toEqual({ spentBdtCents: 20000, waitingBdtCents: 7000 });
  });

  it('works out the share of the budget spent', () => {
    const items = [{ id: 'a', kind: 'one_off' as const, groupName: null, position: 0, name: 'Tent', measure: 'Pcs', quantity: 10, unitPriceBdt: 100 }];
    const h = budgetHealth({ items, packagesCount: 0, adminPercent: 5, expenses: [{ amount: 250, fxRateToBdt: 1, status: 'paid' }] });
    expect(h.plannedBdtCents).toBe(100000);
    expect(h.percentSpent).toBe(25);
    expect(h.overspent).toBe(false);
    const over = budgetHealth({ items, packagesCount: 0, adminPercent: 5, expenses: [{ amount: 1500, fxRateToBdt: 1, status: 'paid' }] });
    expect(over.overspent).toBe(true);
    expect(budgetHealth({ items: [], packagesCount: 0, adminPercent: 5, expenses: [] }).percentSpent).toBeNull();
  });

  it('lists late tasks, oldest first, and counts blocked ones', () => {
    const today = '2026-11-12';
    const h = taskHealth(
      [
        task({ id: '1', title: 'Old', dueDate: '2026-10-01' }),
        task({ id: '2', title: 'Newer late', dueDate: '2026-11-10', status: 'blocked' }),
        task({ id: '3', title: 'Done late', dueDate: '2026-10-01', status: 'done' }),
        task({ id: '4', title: 'Future', dueDate: '2026-12-01' }),
      ],
      today,
    );
    expect(h.overdue).toBe(2);
    expect(h.blocked).toBe(1);
    expect(h.overdueList.map((x) => x.id)).toEqual(['1', '2']);
    expect(h.overdueList[0].daysLate).toBe(42);
  });

  it('summarises indicators from validated values only', () => {
    const ind = (id: string, target: number, vals: Array<[number, boolean]>): Indicator => ({
      id, nodeId: 'n', name: id, unit: 'u', baseline: 0, target, frequency: null, meansOfVerification: null, measure: 'cumulative',
      values: vals.map(([value, ok], i) => ({ id: `${id}${i}`, periodStart: '2026-01-01', periodEnd: '2026-01-31', value, validatedAt: ok ? 'x' : null, validatedByName: null, createdByName: null, createdBy: null })),
    });
    const h = indicatorHealth([ind('a', 100, [[50, true]]), ind('b', 100, [[300, true]]), ind('c', 100, [[10, false]]), ind('d', 100, [])]);
    expect(h.total).toBe(4);
    expect(h.withValidatedData).toBe(2);
    expect(h.averagePercent).toBe(75); // 50 and 100 (capped)
    expect(h.pendingValues).toBe(1);
    expect(h.slowest[0].id).toBe('a');
  });

  it('finds the last fund receipt and days since', () => {
    const rc = (id: string, on: string, ack: FundReceipt['ackStatus']): FundReceipt => ({ id, receivedOn: on, amount: 1000, currency: 'EUR', reference: null, fromName: null, note: null, ackStatus: ack });
    const f = fundHealth([rc('1', '2026-09-01', 'sent'), rc('2', '2026-10-30', 'not_sent')], 'EUR', 5000, '2026-11-12');
    expect(f.lastReceivedOn).toBe('2026-10-30');
    expect(f.daysSinceLast).toBe(13);
    expect(f.unacknowledged).toBe(1);
    expect(f.totals.receivedCents).toBe(200000);
    expect(fundHealth([], 'EUR', null, '2026-11-12').lastReceivedOn).toBeNull();
  });

  it('lists coming dates in order', () => {
    const u = upcomingDates({
      tasks: [task({ title: 'B', dueDate: '2026-11-20' }), task({ title: 'A', dueDate: '2026-11-15' }), task({ title: 'Past', dueDate: '2026-11-01' }), task({ title: 'Done', dueDate: '2026-11-14', status: 'done' })],
      endDate: '2026-12-31',
      today: '2026-11-12',
    });
    expect(u.map((x) => x.label)).toEqual(['A', 'B', 'Project end date']);
    expect(daysBetween('2026-11-12', '2026-11-15')).toBe(3);
  });

  it('writes plain attention lines', () => {
    const lines = attentionList({
      tasks: { total: 3, done: 0, overdue: 1, percentDone: 0, blocked: 2, overdueList: [] },
      budget: { plannedBdtCents: 100, spentBdtCents: 120, waitingBdtCents: 0, percentSpent: 120, overspent: true },
      funds: null,
      indicators: { total: 1, withValidatedData: 0, averagePercent: null, pendingValues: 2, slowest: [] },
    });
    expect(lines).toEqual(['1 task is late.', '2 tasks are blocked.', 'Spending is above the planned budget.', '2 indicator values wait for validation.']);
  });

  it('hides money from donors and field officers', () => {
    expect(canSeeHealthMoney(['donor'])).toBe(false);
    expect(canSeeHealthMoney(['field_officer'])).toBe(false);
    expect(canSeeHealthMoney(['finance'])).toBe(true);
    expect(canSeeHealth(['field_officer'])).toBe(true);
    expect(canSeeHealth(['donor'])).toBe(false);
  });
});
