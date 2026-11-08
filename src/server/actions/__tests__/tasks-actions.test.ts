import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppRole } from '@/lib/database.types';

type Result = { data: unknown; error: { code?: string; message: string } | null };
const state = {
  actor: null as { userId: string; roles: AppRole[] } | null,
  project: null as Record<string, unknown> | null,
  results: {} as Record<string, Result>,
  calls: [] as Array<{ table: string; method: string; args: unknown[] }>,
};
const empty: Result = { data: null, error: null };

function builder(table: string): any {
  const proxy: any = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(state.results[table] ?? empty);
        return (...args: unknown[]) => {
          state.calls.push({ table, method: prop, args });
          return proxy;
        };
      },
    }
  );
  return proxy;
}

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ from: (t: string) => builder(t), rpc: async () => ({ data: [], error: null }) }) }));
vi.mock('@/server/services/projectsData', () => ({
  getActor: async () => state.actor,
  getProjectById: async () => state.project,
    isUuid: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
}));

import { addTaskAction, setTaskStatusAction, deleteTaskAction, addTaskCommentAction, getTasksAction } from '../tasks';

const PID = '11111111-1111-4111-8111-111111111111';
const TID = '33333333-3333-4333-8333-333333333333';
const USER = '22222222-2222-4222-8222-222222222222';
const proj = (stage = 'concept') => ({ id: PID, stage });
const form = { title: 'Buy kits', description: '', assigneeId: '', nodeId: '', dueDate: '', priority: 'medium' as const };

beforeEach(() => {
  state.actor = { userId: USER, roles: ['project_officer'] };
  state.project = proj();
  state.results = {};
  state.calls = [];
});

describe('addTaskAction', () => {
  it('needs sign-in and a manager role', async () => {
    state.actor = null;
    expect((await addTaskAction(PID, form)).ok).toBe(false);
    state.actor = { userId: USER, roles: ['field_officer'] };
    expect((await addTaskAction(PID, form)).ok).toBe(false);
    expect(state.calls.some((c) => c.method === 'insert')).toBe(false);
  });
  it('blocks a closed project and bad input', async () => {
    state.project = proj('closed');
    expect((await addTaskAction(PID, form)).ok).toBe(false);
    state.project = proj();
    expect((await addTaskAction(PID, { ...form, title: 'x' })).ok).toBe(false);
  });
  it('adds a task', async () => {
    const r = await addTaskAction(PID, form);
    expect(r.ok).toBe(true);
    expect(state.calls.find((c) => c.method === 'insert')?.args[0]).toMatchObject({ project_id: PID, title: 'Buy kits', priority: 'medium', assignee_id: null });
  });
  it('explains a team error from the database', async () => {
    state.results.tasks = { data: null, error: { code: '23514', message: 'the task can only be assigned to someone on the project team' } };
    const r = await addTaskAction(PID, form);
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/project team/) });
  });
});

describe('setTaskStatusAction', () => {
  it('lets an assignee-type role try, and reports when nothing changed', async () => {
    state.actor = { userId: USER, roles: ['field_officer'] };
    state.results.tasks = { data: [{ id: TID }], error: null };
    expect((await setTaskStatusAction(PID, TID, 'doing')).ok).toBe(true);
    state.results.tasks = { data: [], error: null };
    expect((await setTaskStatusAction(PID, TID, 'doing')).ok).toBe(false);
  });
  it('rejects a made-up status and donors', async () => {
    expect((await setTaskStatusAction(PID, TID, 'x' as never)).ok).toBe(false);
    state.actor = { userId: USER, roles: ['donor'] };
    expect((await setTaskStatusAction(PID, TID, 'done')).ok).toBe(false);
  });
});

describe('deleteTaskAction and comments', () => {
  it('only managers delete', async () => {
    state.results.tasks = { data: [{ id: TID }], error: null };
    expect((await deleteTaskAction(PID, TID)).ok).toBe(true);
    state.actor = { userId: USER, roles: ['field_officer'] };
    expect((await deleteTaskAction(PID, TID)).ok).toBe(false);
  });
  it('adds a comment as the signed-in user and rejects an empty one', async () => {
    state.results.tasks = { data: { id: TID }, error: null };
    expect((await addTaskCommentAction(PID, TID, '  ')).ok).toBe(false);
    expect((await addTaskCommentAction(PID, TID, 'Done at site')).ok).toBe(true);
    expect(state.calls.find((c) => c.table === 'task_comments' && c.method === 'insert')?.args[0]).toMatchObject({ task_id: TID, body: 'Done at site', author_id: USER });
  });
});

describe('getTasksAction', () => {
  it('returns permissions with no tasks', async () => {
    state.results.tasks = { data: [], error: null };
    const r = await getTasksAction(PID);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.tasks).toEqual([]);
      expect(r.data.canManage).toBe(true);
    }
  });
});
