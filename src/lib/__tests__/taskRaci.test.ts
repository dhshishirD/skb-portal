import { describe, expect, it } from 'vitest';
import { friendlyRaciError, planRaciChanges, raciGaps, raciMatrix, raciSchema } from '../taskRaci';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';
const none = { accountableId: null, consultedIds: [], informedIds: [] };

describe('task RACI', () => {
  it('accepts one letter per person and refuses repeats', () => {
    expect(raciSchema.safeParse({ accountableId: A, consultedIds: [B], informedIds: [C] }).success).toBe(true);
    expect(raciSchema.safeParse({ accountableId: '', consultedIds: [], informedIds: [] }).success).toBe(true);
    expect(raciSchema.safeParse({ accountableId: A, consultedIds: [A], informedIds: [] }).success).toBe(false);
    expect(raciSchema.safeParse({ accountableId: null, consultedIds: [B], informedIds: [B] }).success).toBe(false);
    expect(raciSchema.safeParse({ accountableId: 'x', consultedIds: [], informedIds: [] }).success).toBe(false);
  });

  it('plans removals first and the Accountable change last', () => {
    // A was accountable; now B is accountable and A is only consulted
    const ops = planRaciChanges({ accountableId: A, consultedIds: [], informedIds: [C] }, { accountableId: B, consultedIds: [A], informedIds: [] });
    expect(ops).toEqual([
      { type: 'delete', userId: C },
      { type: 'update', userId: A, role: 'consulted' },
      { type: 'insert', userId: B, role: 'accountable' },
    ]);
  });

  it('does nothing when nothing changed', () => {
    const same = { accountableId: A, consultedIds: [B], informedIds: [] };
    expect(planRaciChanges(same, same)).toEqual([]);
    expect(planRaciChanges(none, none)).toEqual([]);
  });

  it('builds the table with R from the assignee and shows R and A together', () => {
    const m = raciMatrix(
      [
        { id: 't1', title: 'Buy tents', assigneeId: A, raci: { accountableId: A, consultedIds: [B], informedIds: [] } },
        { id: 't2', title: 'Report', assigneeId: null, raci: none },
      ],
      new Map([[A, 'Anis'], [B, 'Bina']]),
    );
    expect(m.people.map((p) => p.name)).toEqual(['Anis', 'Bina']);
    expect(m.rows[0].cells).toEqual({ [A]: 'R, A', [B]: 'C' });
    expect(m.rows[1].cells).toEqual({});
  });

  it('counts open tasks with nobody responsible or accountable', () => {
    const g = raciGaps([
      { status: 'todo', assigneeId: null, raci: none },
      { status: 'doing', assigneeId: A, raci: { accountableId: B, consultedIds: [], informedIds: [] } },
      { status: 'done', assigneeId: null, raci: none },
    ]);
    expect(g).toEqual({ noResponsible: 1, noAccountable: 1 });
  });

  it('gives plain error messages', () => {
    expect(friendlyRaciError({ message: 'only someone on the project team can be given a role on a task' })).toMatch(/project team/);
    expect(friendlyRaciError({ code: '23505' })).toMatch(/one Accountable/);
    expect(friendlyRaciError({ code: '42501' })).toMatch(/permission/);
  });
});
