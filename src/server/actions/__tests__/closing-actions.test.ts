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
        if (prop === 'single' || prop === 'maybeSingle') {
          return () => {
            state.calls.push({ table, method: prop, args: [] });
            const r = state.results[table] ?? empty;
            const data = Array.isArray(r.data) ? r.data[0] ?? null : r.data;
            return Promise.resolve({ data, error: r.error });
          };
        }
        return (...args: unknown[]) => {
          state.calls.push({ table, method: prop, args });
          return proxy;
        };
      },
    },
  );
  return proxy;
}

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ from: (t: string) => builder(t) }) }));
vi.mock('@/server/actions/budget', () => ({ getBudgetAction: async () => ({ ok: false, error: 'budget off' }) }));
vi.mock('@/server/actions/fundReceipts', () => ({ getFundReceiptsAction: async () => ({ ok: false, error: 'receipts off' }) }));
vi.mock('@/server/services/projectsData', () => ({
  getActor: async () => state.actor,
  getProjectById: async () => state.project,
  getOwnOrganization: async () => ({ name: 'SKB', registration_no: '1' }),
  isUuid: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
}));

import { EMPTY_REPORT } from '@/lib/closing';
import {
  generateForm7Action,
  getClosingAction,
  saveClosingReportAction,
  setClosingCheckAction,
  setClosingSignOffAction,
} from '../closing';

const PID = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  state.actor = { userId: USER, roles: ['project_officer'] };
  state.project = { id: PID, stage: 'concept' };
  state.results = {};
  state.calls = [];
});

describe('getClosingAction', () => {
  it('hides the page from donors and bad ids', async () => {
    expect((await getClosingAction('nope')).ok).toBe(false);
    state.actor = { userId: USER, roles: ['donor'] };
    expect((await getClosingAction(PID)).ok).toBe(false);
    state.actor = null;
    expect((await getClosingAction(PID)).ok).toBe(false);
  });
  it('loads an empty closing page', async () => {
    const r = await getClosingAction(PID);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.canWrite).toBe(true);
      expect(r.data.canSignOff).toBe(false);
      expect(r.data.items).toEqual([]);
    }
  });
  it('is read-only on a closed project', async () => {
    state.project = { id: PID, stage: 'closed' };
    const r = await getClosingAction(PID);
    expect(r.ok && r.data.canWrite).toBe(false);
  });
});

describe('saveClosingReportAction', () => {
  it('needs a writer role and an open project', async () => {
    state.actor = { userId: USER, roles: ['finance'] };
    expect((await saveClosingReportAction(PID, EMPTY_REPORT)).ok).toBe(false);
    state.actor = { userId: USER, roles: ['project_officer'] };
    state.project = { id: PID, stage: 'closed' };
    expect((await saveClosingReportAction(PID, EMPTY_REPORT)).ok).toBe(false);
  });
  it('refuses text that is too long', async () => {
    expect((await saveClosingReportAction(PID, { ...EMPTY_REPORT, localManpower: 'x'.repeat(2001) })).ok).toBe(false);
  });
  it('reports "nothing saved" when no row was updated', async () => {
    state.results.project_closing_reports = { data: [], error: null };
    const r = await saveClosingReportAction(PID, EMPTY_REPORT);
    expect(r.ok).toBe(false);
  });
  it('saves when a row was updated', async () => {
    state.results.project_closing_reports = { data: [{ project_id: PID }], error: null };
    expect((await saveClosingReportAction(PID, EMPTY_REPORT)).ok).toBe(true);
  });
});

describe('setClosingCheckAction', () => {
  it('checks the item key, the document id and the role', async () => {
    expect((await setClosingCheckAction(PID, 'BAD KEY', true)).ok).toBe(false);
    expect((await setClosingCheckAction(PID, 'photos_filed', true, '', 'not-a-uuid')).ok).toBe(false);
    state.actor = { userId: USER, roles: ['field_officer'] };
    expect((await setClosingCheckAction(PID, 'photos_filed', true)).ok).toBe(false);
  });
  it('ticks an item', async () => {
    const r = await setClosingCheckAction(PID, 'photos_filed', true, 'done');
    expect(r.ok).toBe(true);
    expect(state.calls.some((c) => c.table === 'project_closing_checks' && c.method === 'insert')).toBe(true);
  });
  it('unticking something not ticked says nothing changed', async () => {
    state.results.project_closing_checks = { data: [], error: null };
    expect((await setClosingCheckAction(PID, 'photos_filed', false)).ok).toBe(false);
    state.results.project_closing_checks = { data: [{ item_key: 'photos_filed' }], error: null };
    expect((await setClosingCheckAction(PID, 'photos_filed', false)).ok).toBe(true);
  });
  it('turns a database refusal into plain words', async () => {
    state.results.project_closing_checks = { data: [], error: { code: '42501', message: 'the closing report is signed off; the Executive Director must reopen it first' } };
    const r = await setClosingCheckAction(PID, 'photos_filed', true);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/signed off/);
  });
});

describe('setClosingSignOffAction', () => {
  it('only the executive may sign off', async () => {
    expect((await setClosingSignOffAction(PID, true)).ok).toBe(false);
    state.actor = { userId: USER, roles: ['executive'] };
    state.results.project_closing_reports = { data: [{ project_id: PID }], error: null };
    expect((await setClosingSignOffAction(PID, true)).ok).toBe(true);
  });
  it('shows the checklist message when items are missing', async () => {
    state.actor = { userId: USER, roles: ['executive'] };
    state.results.project_closing_reports = { data: null, error: { code: '23514', message: 'every item on the closing checklist must be ticked before sign-off' } };
    const r = await setClosingSignOffAction(PID, true);
    expect(r.ok).toBe(false);
  });
});

describe('generateForm7Action', () => {
  it('needs a writer role', async () => {
    state.actor = { userId: USER, roles: ['donor'] };
    expect((await generateForm7Action(PID)).ok).toBe(false);
  });
  it('stops with a clear message when the budget cannot be read', async () => {
    const r = await generateForm7Action(PID);
    expect(r.ok).toBe(false);
  });
});
