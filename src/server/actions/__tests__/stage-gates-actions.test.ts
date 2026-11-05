import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppRole, ProjectStage } from '@/lib/database.types';

// ---- mocks -------------------------------------------------------------------------
type Result = { data: unknown; error: { code?: string; message: string } | null };

const state = {
  actor: null as { userId: string; roles: AppRole[] } | null,
  project: null as { id: string; stage: ProjectStage } | null,
  results: {} as Record<string, Result>, // keyed by table name or 'rpc'
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
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (t: string) => builder(t),
    rpc: (fn: string, args: unknown) => {
      state.calls.push({ table: 'rpc', method: fn, args: [args] });
      return Promise.resolve(state.results.rpc ?? empty);
    },
  }),
}));
vi.mock('@/server/services/projectsData', () => ({
  getActor: async () => state.actor,
  getProjectById: async () => state.project,
  isUuid: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
}));

import { advanceStageAction, getStageGatesAction, toggleGateItemAction } from '../stageGates';

const PID = '11111111-1111-4111-8111-111111111111';
const ITEM = '33333333-3333-4333-8333-333333333333';
const USER = '22222222-2222-4222-8222-222222222222';
const OTHER = '44444444-4444-4444-8444-444444444444';

beforeEach(() => {
  state.actor = { userId: USER, roles: ['executive'] };
  state.project = { id: PID, stage: 'concept' };
  state.results = {};
  state.calls = [];
});

describe('getStageGatesAction', () => {
  it('asks a signed-out visitor to sign in', async () => {
    state.actor = null;
    expect(await getStageGatesAction(PID)).toMatchObject({ ok: false, error: expect.stringMatching(/sign in/i) });
  });

  it('says not found for a bad id or a project the user cannot see', async () => {
    expect(await getStageGatesAction('nope')).toMatchObject({ ok: false, error: 'Project not found.' });
    state.project = null;
    expect(await getStageGatesAction(PID)).toMatchObject({ ok: false, error: 'Project not found.' });
    expect(state.calls).toHaveLength(0);
  });

  it('returns the checklist, history with names, and what the user may do', async () => {
    state.actor = { userId: USER, roles: ['project_officer'] };
    state.results.stage_gate_items = {
      error: null,
      data: [
        { id: ITEM, stage: 'concept', label: 'Concept note written', position: 1, required: true, done: true, done_by: OTHER, done_at: '2026-11-05T04:00:00Z' },
        { id: 'x', stage: 'concept', label: 'Optional thing', position: 2, required: false, done: false, done_by: null, done_at: null },
      ],
    };
    state.results.project_stage_history = {
      error: null,
      data: [{ id: 'h1', from_stage: null, to_stage: 'concept', changed_by: OTHER, note: null, created_at: '2026-11-01T00:00:00Z' }],
    };
    state.results.profiles = { error: null, data: [{ id: OTHER, full_name: 'Amina Rahman' }] };

    const r = await getStageGatesAction(PID);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.stage).toBe('concept');
    expect(r.data.canTick).toBe(true);
    expect(r.data.canChangeStage).toBe(false);
    expect(r.data.items[0]).toMatchObject({ done: true, doneByName: 'Amina Rahman', required: true });
    expect(r.data.items[1]).toMatchObject({ done: false, doneByName: null, required: false });
    expect(r.data.history[0]).toMatchObject({ toStage: 'concept', changedByName: 'Amina Rahman' });
  });

  it('lets only the Executive Director see the move buttons, and never lets a board member tick', async () => {
    state.actor = { userId: USER, roles: ['board'] };
    const r = await getStageGatesAction(PID);
    expect(r.ok && r.data.canChangeStage).toBe(false);
    expect(r.ok && r.data.canTick).toBe(false);
  });

  it('reports a load failure in plain words', async () => {
    state.results.stage_gate_items = { data: null, error: { message: 'boom' } };
    expect(await getStageGatesAction(PID)).toMatchObject({ ok: false, error: expect.stringMatching(/Could not load/) });
  });
});

describe('toggleGateItemAction', () => {
  it('refuses roles that cannot tick, without touching the database', async () => {
    state.actor = { userId: USER, roles: ['board'] };
    expect(await toggleGateItemAction(PID, ITEM, true)).toMatchObject({ ok: false, error: expect.stringMatching(/permission/i) });
    expect(state.calls).toHaveLength(0);
  });

  it('rejects bad ids', async () => {
    expect(await toggleGateItemAction('x', ITEM, true)).toMatchObject({ ok: false });
    expect(await toggleGateItemAction(PID, 'x', true)).toMatchObject({ ok: false });
    expect(state.calls).toHaveLength(0);
  });

  it('sends only the checkbox value, scoped to the item and project (the database records who and when)', async () => {
    state.actor = { userId: USER, roles: ['project_officer'] };
    state.results.stage_gate_items = { data: [{ id: ITEM }], error: null };
    expect(await toggleGateItemAction(PID, ITEM, true)).toEqual({ ok: true });
    const update = state.calls.find((c) => c.method === 'update');
    expect(update?.args[0]).toEqual({ done: true });
    expect(state.calls.filter((c) => c.method === 'eq').map((c) => c.args)).toEqual([['id', ITEM], ['project_id', PID]]);
  });

  it('explains when nothing was updated (not assigned, or wrong project)', async () => {
    state.results.stage_gate_items = { data: [], error: null };
    expect(await toggleGateItemAction(PID, ITEM, true)).toMatchObject({ ok: false, error: expect.stringMatching(/not assigned/i) });
  });

  it('explains the current-stage rule from the database', async () => {
    state.results.stage_gate_items = {
      data: null,
      error: { code: '42501', message: 'only the checklist of the current stage can be changed' },
    };
    expect(await toggleGateItemAction(PID, ITEM, true)).toMatchObject({ ok: false, error: expect.stringMatching(/current stage/) });
  });
});

describe('advanceStageAction', () => {
  it.each([['project_officer'], ['programme_manager'], ['board'], ['super_admin']] as Array<[AppRole]>)(
    'refuses %s: only the Executive Director moves a stage',
    async (role) => {
      state.actor = { userId: USER, roles: [role] };
      expect(await advanceStageAction(PID, 'proposal', '')).toMatchObject({ ok: false, error: expect.stringMatching(/Executive Director/) });
      expect(state.calls).toHaveLength(0);
    }
  );

  it('rejects an unknown stage name and a bad project id', async () => {
    expect(await advanceStageAction(PID, 'finished', '')).toMatchObject({ ok: false, error: 'Invalid stage.' });
    expect(await advanceStageAction('nope', 'proposal', '')).toMatchObject({ ok: false });
    expect(state.calls).toHaveLength(0);
  });

  it('refuses to skip a stage', async () => {
    expect(await advanceStageAction(PID, 'approved', '')).toMatchObject({ ok: false, error: expect.stringMatching(/one stage/) });
    expect(state.calls).toHaveLength(0);
  });

  it('moves forward through the database function, with no note sent as null', async () => {
    state.results.rpc = { data: 'proposal', error: null };
    const r = await advanceStageAction(PID, 'proposal', '   ');
    expect(r).toMatchObject({ ok: true, message: expect.stringMatching(/next stage/) });
    expect(state.calls[0]).toMatchObject({ table: 'rpc', method: 'advance_project_stage' });
    expect(state.calls[0].args[0]).toEqual({ _project: PID, _to: 'proposal', _note: null });
  });

  it('turns the "required items missing" database error into plain words', async () => {
    state.results.rpc = { data: null, error: { code: '23514', message: '2 required checklist item(s) of this stage are not complete' } };
    expect(await advanceStageAction(PID, 'proposal', '')).toMatchObject({
      ok: false,
      error: expect.stringMatching(/2 required checklist items are not complete/),
    });
  });

  it('needs a reason to move back and does not call the database without one', async () => {
    state.project = { id: PID, stage: 'approved' };
    expect(await advanceStageAction(PID, 'proposal', 'no')).toMatchObject({ ok: false, error: expect.stringMatching(/reason/i) });
    expect(state.calls).toHaveLength(0);
  });

  it('moves back with a reason, trimmed', async () => {
    state.project = { id: PID, stage: 'approved' };
    state.results.rpc = { data: 'proposal', error: null };
    const r = await advanceStageAction(PID, 'proposal', '  Donor asked for a new budget  ');
    expect(r).toMatchObject({ ok: true, message: expect.stringMatching(/back/) });
    expect(state.calls[0].args[0]).toEqual({ _project: PID, _to: 'proposal', _note: 'Donor asked for a new budget' });
  });

  it('cannot move a closed project forward', async () => {
    state.project = { id: PID, stage: 'closed' };
    expect(await advanceStageAction(PID, 'closed', '')).toMatchObject({ ok: false });
    expect(state.calls).toHaveLength(0);
  });

  it('says not found when the project is not visible', async () => {
    state.project = null;
    expect(await advanceStageAction(PID, 'proposal', '')).toMatchObject({ ok: false, error: 'Project not found.' });
  });
});
