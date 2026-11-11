import { describe, expect, it } from 'vitest';
import { buildExecutiveOverview, describeActivity, type ExecInput } from '../executiveOverview';

const base: ExecInput = {
  today: '2026-11-11',
  projects: [],
  receipts: [],
  openTasks: [],
  beneficiaryProjectIds: [],
  headcounts: [],
  budgetItemProjectIds: [],
  closingReportProjectIds: [],
  signedOffProjectIds: [],
  closingCheckCounts: {},
  closingChecklistSize: 11,
  gates: [],
};
const p = (id: string, over: Record<string, unknown> = {}) => ({
  id, code: id.toUpperCase(), title: 'T ' + id, stage: 'implementation' as const, donor_name: 'IHH',
  budget_amount: 10000, budget_currency: 'EUR', end_date: '2027-01-01', ...over,
});

describe('buildExecutiveOverview', () => {
  it('shows empty states for an empty portfolio', () => {
    const o = buildExecutiveOverview(base);
    expect(o.total).toBe(0);
    expect(o.agreed).toEqual([]);
    expect(o.attention).toEqual([]);
    expect(o.stageCounts.map((s) => s.count)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('counts stages and keeps currencies apart', () => {
    const o = buildExecutiveOverview({
      ...base,
      projects: [p('a'), p('b', { stage: 'closed', budget_amount: 5000 }), p('c', { budget_currency: 'BDT', budget_amount: 1000000 })],
    });
    expect(o.total).toBe(3);
    expect(o.active).toBe(2);
    expect(o.closed).toBe(1);
    expect(o.agreed.map((m) => m.currency).sort()).toEqual(['BDT', 'EUR']);
    expect(o.agreed.find((m) => m.currency === 'EUR')?.amount).toBe(15000);
    expect(o.receivedPct).toBeNull(); // two currencies: no single percentage
  });

  it('works out percent received for one currency and rounds in cents', () => {
    const o = buildExecutiveOverview({
      ...base,
      projects: [p('a')],
      receipts: [{ project_id: 'a', amount: '2500.10', currency: 'EUR' }, { project_id: 'a', amount: 2500.2, currency: 'EUR' }],
    });
    expect(o.received[0].amount).toBe(5000.3);
    expect(o.receivedPct).toBe(50);
    expect(o.rows[0].receivedPct).toBe(50);
  });

  it('uses registered people first and the head count only when nobody is registered', () => {
    const o = buildExecutiveOverview({
      ...base,
      projects: [p('a'), p('b')],
      beneficiaryProjectIds: ['a', 'a', 'a'],
      headcounts: [{ project_id: 'a', women: 50, men: 0, girls: 0, boys: 0 }, { project_id: 'b', women: 10, men: 5, girls: 3, boys: 2 }],
    });
    expect(o.rows.find((r) => r.id === 'a')?.people).toBe(3);
    expect(o.rows.find((r) => r.id === 'b')?.people).toBe(20);
    expect(o.people).toEqual({ total: 23, registered: 3, headcountOnly: 20 });
  });

  it('lists decisions before warnings and skips closed projects', () => {
    const o = buildExecutiveOverview({
      ...base,
      projects: [p('a'), p('z', { stage: 'closed' })],
      openTasks: [{ project_id: 'a', due_date: '2026-11-01' }, { project_id: 'a', due_date: '2026-12-01' }, { project_id: 'z', due_date: '2026-11-01' }],
      closingReportProjectIds: ['a'],
      closingCheckCounts: { a: 11 },
      gates: [
        { project_id: 'a', stage: 'implementation', required: true, done: true },
        { project_id: 'a', stage: 'implementation', required: false, done: false },
        { project_id: 'a', stage: 'monitoring_evaluation', required: true, done: false },
      ],
    });
    expect(o.attention[0].level).toBe('decision');
    const texts = o.attention.map((x) => x.text).join(' | ');
    expect(texts).toMatch(/waiting for your sign-off/);
    expect(texts).toMatch(/move it to "Monitoring & evaluation"/);
    expect(texts).toMatch(/1 task is overdue/);
    expect(o.attention.every((x) => x.projectId === 'a')).toBe(true);
    expect(o.rows.find((r) => r.id === 'z')?.health).toBe('closed');
    expect(o.rows.find((r) => r.id === 'a')?.healthLabel).toBe('Needs attention');
  });

  it('warns about a passed end date, missing budget and missing receipt', () => {
    const o = buildExecutiveOverview({ ...base, projects: [p('a', { end_date: '2026-08-14' })] });
    const t = o.attention.map((x) => x.text).join(' | ');
    expect(t).toMatch(/end date has passed/);
    expect(t).toMatch(/no items/);
    expect(t).toMatch(/No fund receipt/);
  });

  it('does not ask for sign-off twice once signed', () => {
    const o = buildExecutiveOverview({
      ...base, projects: [p('a')], closingReportProjectIds: ['a'], signedOffProjectIds: ['a'], closingCheckCounts: { a: 11 },
    });
    expect(o.attention.some((x) => /sign-off/.test(x.text))).toBe(false);
  });
});

describe('describeActivity', () => {
  it('uses plain words and never the record contents', () => {
    const r = describeActivity({ id: 1, occurred_at: '2026-11-11T05:00:00Z', actor_id: 'u', table_name: 'beneficiaries', action: 'UPDATE' }, 'Md. Emran');
    expect(r).toMatchObject({ who: 'Md. Emran', text: 'changed a beneficiary record' });
  });
  it('falls back safely', () => {
    expect(describeActivity({ id: 2, occurred_at: 'x', actor_id: null, table_name: 'some_new_table', action: 'INSERT' }, null)).toMatchObject({ who: 'System', text: 'added some new table' });
  });
});
