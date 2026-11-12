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
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ from: (t: string) => builder(t) }) }));
vi.mock('@/server/services/projectsData', () => ({
  getActor: async () => state.actor,
  getProjectById: async () => state.project,
    isUuid: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
}));

import { addNodeAction, addNodesFromLinesAction, addIndicatorValueAction, validateIndicatorValueAction, deleteNodeAction, getLogframeAction } from '../logframe';

const PID = '11111111-1111-4111-8111-111111111111';
const NID = '33333333-3333-4333-8333-333333333333';
const IID = '44444444-4444-4444-8444-444444444444';
const USER = '22222222-2222-4222-8222-222222222222';
const proj = (stage = 'concept') => ({ id: PID, stage });
const node = { title: 'Outcome', code: '1.1', description: '', kind: 'outcome' as const };

beforeEach(() => {
  state.actor = { userId: USER, roles: ['project_officer'] };
  state.project = proj();
  state.results = {};
  state.calls = [];
});

describe('addNodesFromLinesAction', () => {
  it('adds one item per line with automatic numbers', async () => {
    state.results.logframe_nodes = { data: [{ code: 'G', parent_id: null }], error: null };
    const r = await addNodesFromLinesAction(PID, null, 'goal', '- Better lives\n\n');
    expect(r.ok).toBe(true);
    const rows = state.calls.find((c) => c.method === 'insert')?.args[0] as Array<{ code: string; title: string }>;
    expect(rows.map((x) => [x.code, x.title])).toEqual([['G2', 'Better lives']]);
  });
  it('refuses empty text and a closed project', async () => {
    expect((await addNodesFromLinesAction(PID, null, 'goal', '  \n ')).ok).toBe(false);
    state.project = proj('closed');
    expect((await addNodesFromLinesAction(PID, null, 'goal', 'Something good')).ok).toBe(false);
    expect(state.calls.some((c) => c.method === 'insert')).toBe(false);
  });
});

describe('addNodeAction', () => {
  it('rejects bad ids and missing sign-in', async () => {
    expect((await addNodeAction('bad', null, node)).ok).toBe(false);
    state.actor = null;
    expect((await addNodeAction(PID, null, node)).ok).toBe(false);
  });
  it('blocks roles without permission and closed projects', async () => {
    state.actor = { userId: USER, roles: ['me_officer'] };
    expect((await addNodeAction(PID, null, { ...node, kind: 'goal' })).ok).toBe(false);
    state.actor = { userId: USER, roles: ['project_officer'] };
    state.project = proj('closed');
    const r = await addNodeAction(PID, null, { ...node, kind: 'goal' });
    expect(r).toMatchObject({ ok: false });
    expect(state.calls.some((c) => c.method === 'insert')).toBe(false);
  });
  it('only allows the level directly below the parent', async () => {
    state.results.logframe_nodes = { data: { id: NID, kind: 'goal' }, error: null };
    const r = await addNodeAction(PID, NID, { ...node, kind: 'output' });
    expect(r.ok).toBe(false);
    expect(state.calls.some((c) => c.method === 'insert')).toBe(false);
  });
  it('adds an outcome under a goal', async () => {
    state.results.logframe_nodes = { data: { id: NID, kind: 'goal' }, error: null };
    const r = await addNodeAction(PID, NID, node);
    expect(r.ok).toBe(true);
    expect(state.calls.find((c) => c.method === 'insert')?.args[0]).toMatchObject({ project_id: PID, parent_id: NID, kind: 'outcome', code: '1.1' });
  });
  it('explains a duplicate code', async () => {
    state.results.logframe_nodes = { data: { id: NID, kind: 'goal' }, error: { code: '23505', message: 'duplicate key value violates unique constraint "logframe_nodes_code_unique"' } };
    const r = await addNodeAction(PID, NID, node);
    expect(r.ok).toBe(false);
  });
});

describe('values and validation', () => {
  it('records a value as the signed-in user', async () => {
    state.results.logframe_nodes = { data: { id: NID }, error: null };
    state.results.indicators = { data: { id: IID, node_id: NID }, error: null };
    const r = await addIndicatorValueAction(PID, IID, { periodStart: '2026-01-01', periodEnd: '2026-01-31', value: '10' });
    expect(r.ok).toBe(true);
    expect(state.calls.find((c) => c.table === 'indicator_values' && c.method === 'insert')?.args[0]).toMatchObject({ indicator_id: IID, value: 10, created_by: USER });
  });
  it('only validators may validate', async () => {
    const r = await validateIndicatorValueAction(PID, IID);
    expect(r).toMatchObject({ ok: false });
    state.actor = { userId: USER, roles: ['me_officer'] };
    state.results.indicator_values = { data: [{ id: IID }], error: null };
    expect((await validateIndicatorValueAction(PID, IID)).ok).toBe(true);
  });
  it('reports a value that is not visible', async () => {
    state.actor = { userId: USER, roles: ['me_officer'] };
    state.results.indicator_values = { data: [], error: null };
    expect((await validateIndicatorValueAction(PID, IID)).ok).toBe(false);
  });
});

describe('deleteNodeAction', () => {
  it('removes when allowed and fails clearly when nothing matched', async () => {
    state.results.logframe_nodes = { data: [{ id: NID }], error: null };
    expect((await deleteNodeAction(PID, NID)).ok).toBe(true);
    state.results.logframe_nodes = { data: [], error: null };
    expect((await deleteNodeAction(PID, NID)).ok).toBe(false);
  });
});

describe('getLogframeAction', () => {
  it('returns an empty logframe with the right permissions', async () => {
    state.results.logframe_nodes = { data: [], error: null };
    const r = await getLogframeAction(PID);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.nodes).toEqual([]);
      expect(r.data.canEditStructure).toBe(true);
      expect(r.data.canValidate).toBe(false);
    }
  });
});
