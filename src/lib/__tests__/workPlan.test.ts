import { describe, expect, it } from 'vitest';
import { doneText, friendlyPlanError, isOpen, planItemSchema, planStatusSchema, summarizePlan } from '../workPlan';

describe('daily plan helpers', () => {
  it('summarises a day by status', () => {
    expect(summarizePlan([{ status: 'planned' }, { status: 'doing' }, { status: 'done' }, { status: 'done' }, { status: 'not_done' }])).toEqual({ total: 5, planned: 1, doing: 1, done: 2, notDone: 1 });
    expect(summarizePlan([])).toEqual({ total: 0, planned: 0, doing: 0, done: 0, notDone: 0 });
  });

  it('treats planned and in-progress tasks as open', () => {
    expect(isOpen({ status: 'planned' })).toBe(true);
    expect(isOpen({ status: 'doing' })).toBe(true);
    expect(isOpen({ status: 'done' })).toBe(false);
    expect(isOpen({ status: 'not_done' })).toBe(false);
  });

  it('builds the "what you did" text only from done tasks', () => {
    expect(doneText([{ title: 'Visited the camp', status: 'done' }, { title: 'Wrote the note', status: 'planned' }, { title: ' Called the donor ', status: 'done' }])).toBe('Visited the camp; Called the donor');
    expect(doneText([{ title: 'x', status: 'not_done' }])).toBe('');
  });

  it('never makes the text longer than the box allows', () => {
    const long = doneText([{ title: 'a'.repeat(200), status: 'done' }, { title: 'b'.repeat(200), status: 'done' }], 250);
    expect(long.length).toBeLessThanOrEqual(250);
    expect(long.endsWith('…')).toBe(true);
  });

  it('checks what a person types', () => {
    expect(planItemSchema.safeParse({ date: '2026-11-19', title: '  Visit  ' }).success).toBe(true);
    expect(planItemSchema.safeParse({ date: '2026-11-19', title: '   ' }).success).toBe(false);
    expect(planItemSchema.safeParse({ date: '2026-02-31', title: 'x' }).success).toBe(false);
    expect(planItemSchema.safeParse({ date: '2026-11-19', title: 'x'.repeat(201) }).success).toBe(false);
    expect(planStatusSchema.safeParse({ status: 'done' }).success).toBe(true);
    expect(planStatusSchema.safeParse({ status: 'finished' }).success).toBe(false);
  });

  it('explains database errors in plain words', () => {
    expect(friendlyPlanError({ message: 'this month has been submitted, so its plan cannot be changed' })).toMatch(/submitted/);
    expect(friendlyPlanError({ message: 'a task given to you cannot be removed; mark it not done with a reason' })).toMatch(/Not done/);
    expect(friendlyPlanError({ code: '42501', message: 'x' })).toMatch(/permission/);
    expect(friendlyPlanError(null)).toMatch(/Nothing was saved/);
  });
});
