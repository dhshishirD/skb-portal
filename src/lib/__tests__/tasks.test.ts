import { describe, expect, it } from 'vitest';
import { canChangeStatus, canCommentOnTasks, canManageTasks, commentSchema, countTasks, isOverdue, sortTasks, taskSchema, type Task } from '../tasks';

const t = (over: Partial<Task>): Task => ({
  id: 'x', title: 'T', description: null, status: 'todo', priority: 'medium', dueDate: null, assigneeId: null,
  assigneeName: null, nodeId: null, nodeLabel: null, completedAt: null, comments: [], ...over,
});

describe('who can do what', () => {
  it('managers manage, field officers only comment and update their own', () => {
    expect(canManageTasks(['project_officer'])).toBe(true);
    expect(canManageTasks(['field_officer'])).toBe(false);
    expect(canManageTasks(['me_officer'])).toBe(false);
    expect(canCommentOnTasks(['field_officer'])).toBe(true);
    expect(canCommentOnTasks(['donor'])).toBe(false);
    expect(canChangeStatus({ assigneeId: 'a' }, 'a', false)).toBe(true);
    expect(canChangeStatus({ assigneeId: 'a' }, 'b', false)).toBe(false);
    expect(canChangeStatus({ assigneeId: 'a' }, 'b', true)).toBe(true);
  });
});

describe('ordering and counts', () => {
  it('puts open tasks first by due date, done last', () => {
    const sorted = sortTasks([
      t({ id: 'done', status: 'done', dueDate: '2026-01-01' }),
      t({ id: 'late', dueDate: '2026-12-01' }),
      t({ id: 'soon', dueDate: '2026-11-10' }),
      t({ id: 'none' }),
    ]).map((x) => x.id);
    expect(sorted).toEqual(['soon', 'late', 'none', 'done']);
  });
  it('breaks ties by priority', () => {
    const s = sortTasks([t({ id: 'low', priority: 'low' }), t({ id: 'urgent', priority: 'urgent' })]).map((x) => x.id);
    expect(s).toEqual(['urgent', 'low']);
  });
  it('knows overdue', () => {
    expect(isOverdue({ status: 'todo', dueDate: '2026-11-01' }, '2026-11-08')).toBe(true);
    expect(isOverdue({ status: 'done', dueDate: '2026-11-01' }, '2026-11-08')).toBe(false);
    expect(isOverdue({ status: 'todo', dueDate: '2026-11-08' }, '2026-11-08')).toBe(false);
    expect(isOverdue({ status: 'todo', dueDate: null }, '2026-11-08')).toBe(false);
  });
  it('counts', () => {
    expect(countTasks([], '2026-11-08')).toEqual({ total: 0, done: 0, overdue: 0, percentDone: 0 });
    const c = countTasks([t({ status: 'done' }), t({ dueDate: '2026-01-01' }), t({}), t({})], '2026-11-08');
    expect(c).toEqual({ total: 4, done: 1, overdue: 1, percentDone: 25 });
  });
});

describe('forms', () => {
  const base = { title: 'Buy kits', description: '', assigneeId: '', nodeId: '', dueDate: '', priority: 'medium' };
  it('accepts a simple task and turns blanks into null', () => {
    expect(taskSchema.parse(base)).toMatchObject({ description: null, assigneeId: null, nodeId: null, dueDate: null });
  });
  it('rejects bad input', () => {
    expect(taskSchema.safeParse({ ...base, title: 'x' }).success).toBe(false);
    expect(taskSchema.safeParse({ ...base, assigneeId: 'not-an-id' }).success).toBe(false);
    expect(taskSchema.safeParse({ ...base, dueDate: '2026-13-45' }).success).toBe(false);
    expect(taskSchema.safeParse({ ...base, priority: 'x' }).success).toBe(false);
    expect(commentSchema.safeParse({ body: '   ' }).success).toBe(false);
  });
});
