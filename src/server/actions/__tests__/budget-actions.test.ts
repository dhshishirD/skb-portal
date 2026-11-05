import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppRole, ProjectStage } from '@/lib/database.types';

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

import {
  addBudgetItemAction,
  deleteBudgetItemAction,
  getBudgetAction,
  saveBudgetSettingsAction,
  setExchangeRateAction,
  updateBudgetItemAction,
} from '../budget';

const PID = '11111111-1111-4111-8111-111111111111';
const ITEM = '33333333-3333-4333-8333-333333333333';
const USER = '22222222-2222-4222-8222-222222222222';
const proj = (stage: ProjectStage = 'implementation') => ({ id: PID, stage, budget_amount: '10000', budget_currency: 'EUR' });
const goodItem = { kind: 'per_package' as const, groupName: 'Food', name: 'Rice', measure: 'Kg', quantity: '2', unitPriceBdt: '100' };

beforeEach(() => {
  state.actor = { userId: USER, roles: ['project_officer'] };
  state.project = proj();
  state.results = {};
  state.calls = [];
});

describe('getBudgetAction', () => {
  it('needs sign-in and a visible project', async () => {
    state.actor = null;
    expect(await getBudgetAction(PID)).toMatchObject({ ok: false, error: expect.stringMatching(/sign in/i) });
    state.actor = { userId: USER, roles: ['project_officer'] };
    expect(await getBudgetAction('nope')).toMatchObject({ ok: false, error: 'Project not found.' });
    state.project = null;
    expect(await getBudgetAction(PID)).toMatchObject({ ok: false, error: 'Project not found.' });
  });

  it('returns defaults when no settings row exists, with numbers converted', async () => {
    state.results.project_budget_items = {
      error: null,
      data: [{ id: ITEM, kind: 'per_package', group_name: null, position: 10, name: 'Rice', measure: 'Kg', quantity: '2.000', unit_price_bdt: '100.00' }],
    };
    state.results.project_budget_settings = { error: null, data: null };
    const r = await getBudgetAction(PID);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.donorAmount).toBe(10000);
    expect(r.data.settings.packagesCount).toBe(0);
    expect(r.data.items[0]).toMatchObject({ quantity: 2, unitPriceBdt: 100 });
    expect(r.data.canEdit).toBe(true);
    expect(r.data.canSetRate).toBe(false);
  });

  it('lets only the Executive Director set the rate, and nobody on a closed project', async () => {
    state.actor = { userId: USER, roles: ['executive'] };
    let r = await getBudgetAction(PID);
    expect(r.ok && r.data.canSetRate).toBe(true);
    state.project = proj('closed');
    r = await getBudgetAction(PID);
    expect(r.ok && r.data.canSetRate).toBe(false);
    expect(r.ok && r.data.canEdit).toBe(false);
  });

  it('reports a load failure in plain words', async () => {
    state.results.project_budget_items = { data: null, error: { message: 'boom secret' } };
    const r = await getBudgetAction(PID);
    expect(r).toMatchObject({ ok: false });
    expect(JSON.stringify(r)).not.toMatch(/secret/);
  });
});

describe('saveBudgetSettingsAction', () => {
  it('saves packages and administration percent only, never the rate', async () => {
    const r = await saveBudgetSettingsAction(PID, { packagesCount: '266', adminPercent: '10' });
    expect(r.ok).toBe(true);
    const up = state.calls.find((c) => c.method === 'upsert')!;
    expect(up.args[0]).toEqual({ project_id: PID, packages_count: 266, admin_percent: 10 });
  });
  it('blocks people who may not edit, closed projects and bad values before touching the database', async () => {
    state.actor = { userId: USER, roles: ['finance'] };
    expect(await saveBudgetSettingsAction(PID, { packagesCount: '1', adminPercent: '5' })).toMatchObject({ ok: false });
    state.actor = { userId: USER, roles: ['project_officer'] };
    state.project = proj('closed');
    expect(await saveBudgetSettingsAction(PID, { packagesCount: '1', adminPercent: '5' })).toMatchObject({ ok: false, error: expect.stringMatching(/closed/) });
    state.project = proj();
    expect(await saveBudgetSettingsAction(PID, { packagesCount: 'x', adminPercent: '5' })).toMatchObject({ ok: false });
    expect(state.calls).toHaveLength(0);
  });
  it('maps a database refusal to plain words', async () => {
    state.results.project_budget_settings = { data: null, error: { code: '42501', message: 'new row violates row-level security policy' } };
    const r = await saveBudgetSettingsAction(PID, { packagesCount: '1', adminPercent: '5' });
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/permission/) });
  });
});

describe('setExchangeRateAction', () => {
  it('is for the Executive Director only', async () => {
    expect(await setExchangeRateAction(PID, { rate: '140', rateDate: '2026-11-05', note: '' })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/Executive Director/),
    });
    expect(state.calls).toHaveLength(0);
  });
  it('saves rate, date and note', async () => {
    state.actor = { userId: USER, roles: ['executive'] };
    const r = await setExchangeRateAction(PID, { rate: '140.25', rateDate: '2026-11-05', note: 'Bank rate' });
    expect(r.ok).toBe(true);
    expect(state.calls.find((c) => c.method === 'upsert')!.args[0]).toEqual({
      project_id: PID,
      exchange_rate: 140.25,
      rate_date: '2026-11-05',
      rate_note: 'Bank rate',
    });
  });
  it('rejects a bad rate or missing date', async () => {
    state.actor = { userId: USER, roles: ['executive'] };
    expect(await setExchangeRateAction(PID, { rate: '0', rateDate: '2026-11-05', note: '' })).toMatchObject({ ok: false });
    expect(await setExchangeRateAction(PID, { rate: '140', rateDate: '', note: '' })).toMatchObject({ ok: false });
  });
});

describe('items', () => {
  it('adds an item at the end, recording the signed-in user', async () => {
    state.results.project_budget_items = { error: null, data: [{ position: 30 }] };
    const r = await addBudgetItemAction(PID, goodItem);
    expect(r.ok).toBe(true);
    const ins = state.calls.find((c) => c.method === 'insert')!;
    expect(ins.args[0]).toMatchObject({ project_id: PID, position: 40, created_by: USER, quantity: 2, unit_price_bdt: 100, group_name: 'Food' });
  });
  it('drops the group of a one-off cost', async () => {
    await addBudgetItemAction(PID, { ...goodItem, kind: 'one_off' });
    expect(state.calls.find((c) => c.method === 'insert')!.args[0]).toMatchObject({ kind: 'one_off', group_name: null });
  });
  it('refuses bad items and unauthorised users', async () => {
    expect(await addBudgetItemAction(PID, { ...goodItem, name: 'x' })).toMatchObject({ ok: false });
    state.actor = { userId: USER, roles: ['donor'] };
    expect(await addBudgetItemAction(PID, goodItem)).toMatchObject({ ok: false });
    expect(state.calls.filter((c) => c.method === 'insert')).toHaveLength(0);
  });
  it('updates and deletes, saying so when nothing matched', async () => {
    state.results.project_budget_items = { error: null, data: [{ id: ITEM }] };
    expect((await updateBudgetItemAction(PID, ITEM, goodItem)).ok).toBe(true);
    expect((await deleteBudgetItemAction(PID, ITEM)).ok).toBe(true);
    state.results.project_budget_items = { error: null, data: [] };
    expect(await updateBudgetItemAction(PID, ITEM, goodItem)).toMatchObject({ ok: false, error: expect.stringMatching(/not found/i) });
    expect(await deleteBudgetItemAction(PID, ITEM)).toMatchObject({ ok: false, error: expect.stringMatching(/not found/i) });
    expect(await deleteBudgetItemAction(PID, 'bad')).toMatchObject({ ok: false, error: 'Invalid request.' });
  });
});
