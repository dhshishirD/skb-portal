// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppRole } from '@/lib/database.types';

type Result = { data: unknown; error: { code?: string; message: string } | null };
const state = {
  actor: null as { userId: string; roles: AppRole[] } | null,
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
    },
  );
  return proxy;
}

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ from: (t: string) => builder(t) }) }));
vi.mock('@/server/services/projectsData', () => ({
  getActor: async () => state.actor,
  listProjects: async () => [],
  isUuid: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
}));

import { addPlanItemAction, assignTaskAction, getTeamPlanAction, moveTasksAction, removePlanItemAction, setPlanStatusAction } from '../workPlan';

const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const ITEM = '33333333-3333-4333-8333-333333333333';

beforeEach(() => {
  state.actor = { userId: ME, roles: ['project_officer'] };
  state.results = {};
  state.calls = [];
});

describe('daily plan actions', () => {
  it('adds a task for the signed-in person only', async () => {
    const r = await addPlanItemAction({ date: '2026-11-19', title: 'Visit the camp', place: 'Camp' });
    expect(r.ok).toBe(true);
    const insert = state.calls.find((c) => c.method === 'insert')!;
    expect((insert.args[0] as { user_id: string }).user_id).toBe(ME);
  });

  it('refuses an empty task and a signed-out person', async () => {
    expect((await addPlanItemAction({ date: '2026-11-19', title: '  ' })).ok).toBe(false);
    state.actor = null;
    expect((await addPlanItemAction({ date: '2026-11-19', title: 'x' })).ok).toBe(false);
  });

  it('clears the reason unless the task is not done', async () => {
    state.results.work_plan_items = { data: [{ id: ITEM }], error: null };
    await setPlanStatusAction(ITEM, 'done', 'left over text');
    const update = state.calls.find((c) => c.method === 'update')!;
    expect(update.args[0]).toEqual({ status: 'done', reason: null });
    state.calls = [];
    await setPlanStatusAction(ITEM, 'not_done', 'Road closed');
    expect(state.calls.find((c) => c.method === 'update')!.args[0]).toEqual({ status: 'not_done', reason: 'Road closed' });
  });

  it('says so when nothing was changed (a task that is not yours)', async () => {
    state.results.work_plan_items = { data: [], error: null };
    expect((await setPlanStatusAction(ITEM, 'done', '')).ok).toBe(false);
    const gone = await removePlanItemAction(ITEM);
    expect(gone.ok).toBe(false);
    if (!gone.ok) expect(gone.error).toMatch(/Not done/);
  });

  it('moves only the person\'s own tasks', async () => {
    state.results.work_plan_items = { data: [{ id: ITEM }], error: null };
    const r = await moveTasksAction([ITEM], '2026-11-20');
    expect(r.ok).toBe(true);
    expect(state.calls.some((c) => c.method === 'eq' && c.args[0] === 'user_id' && c.args[1] === ME)).toBe(true);
    expect((await moveTasksAction([], '2026-11-20')).ok).toBe(false);
    expect((await moveTasksAction(['bad'], '2026-11-20')).ok).toBe(false);
  });
});

describe('team plan actions', () => {
  it('only the Executive Director and the Super Admin see the team plan or give tasks', async () => {
    expect((await getTeamPlanAction('2026-11-19')).ok).toBe(false);
    expect((await assignTaskAction(OTHER, { date: '2026-11-19', title: 'Send the note' })).ok).toBe(false);
    expect(state.calls.some((c) => c.method === 'insert')).toBe(false);
  });

  it('the Executive Director gives a task to someone else, not to themselves', async () => {
    state.actor = { userId: ME, roles: ['executive'] };
    const r = await assignTaskAction(OTHER, { date: '2026-11-19', title: 'Send the note' });
    expect(r.ok).toBe(true);
    expect((state.calls.find((c) => c.method === 'insert')!.args[0] as { user_id: string }).user_id).toBe(OTHER);
    expect((await assignTaskAction(ME, { date: '2026-11-19', title: 'x' })).ok).toBe(false);
  });
});
