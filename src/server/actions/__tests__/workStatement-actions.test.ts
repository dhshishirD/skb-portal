// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppRole } from '@/lib/database.types';

type Result = { data: unknown; error: { code?: string; message: string } | null };
const state = {
  actor: null as { userId: string; roles: AppRole[] } | null,
  results: {} as Record<string, Result>,
  calls: [] as Array<{ table: string; method: string; args: unknown[] }>,
  adminCalls: [] as Array<{ table: string; method: string; args: unknown[] }>,
  uploads: [] as Array<{ path: string; type: string }>,
};
const empty: Result = { data: null, error: null };

function builder(table: string, calls: typeof state.calls): any {
  const proxy: any = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(state.results[table] ?? empty);
        if (prop === 'single' || prop === 'maybeSingle') {
          return () => {
            const r = state.results[table] ?? empty;
            return Promise.resolve({ data: Array.isArray(r.data) ? r.data[0] ?? null : r.data, error: r.error });
          };
        }
        return (...args: unknown[]) => {
          calls.push({ table, method: prop, args });
          return proxy;
        };
      },
    },
  );
  return proxy;
}

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ from: (t: string) => builder(t, state.calls) }) }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (t: string) => builder(t, state.adminCalls),
    storage: {
      from: () => ({
        upload: async (path: string, _b: unknown, o: { contentType: string }) => {
          state.uploads.push({ path, type: o.contentType });
          return { error: null };
        },
        remove: async () => ({ error: null }),
        download: async () => ({ data: new Blob([new Uint8Array([1, 2, 3])]), error: null }),
      }),
    },
  }),
}));
vi.mock('@/server/services/projectsData', () => ({
  getActor: async () => state.actor,
  listProjects: async () => [],
  isUuid: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
}));

import {
  getReviewQueueAction, reviewStatementAction, saveSignatureAction, saveWorkDayAction, setReviewersAction, submitStatementAction,
} from '../workStatement';

const ME = '11111111-1111-4111-8111-111111111111';
const V = '22222222-2222-4222-8222-222222222222';
const A = '33333333-3333-4333-8333-333333333333';
const OWNER = '44444444-4444-4444-8444-444444444444';
const SID = '55555555-5555-4555-8555-555555555555';
const stmt = (o: Record<string, unknown> = {}) => ({
  id: SID, user_id: OWNER, month: '2026-08-01', status: 'submitted', verifier_id: V, approver_id: A, submitted_at: null, verified_at: null, verified_by: null,
  approved_at: null, approved_by: null, return_note: null, signed_prepared: false, signed_verified: false, signed_approved: false, ...o,
});

beforeEach(() => {
  state.actor = { userId: ME, roles: ['field_officer'] };
  state.results = {};
  state.calls = [];
  state.adminCalls = [];
  state.uploads = [];
});

describe('saveWorkDayAction', () => {
  it('needs a signed-in person and good values, and refuses a future date', async () => {
    state.actor = null;
    expect((await saveWorkDayAction({ date: '2020-01-02', dayType: 'office', place: '', tasks: '' })).ok).toBe(false);
    state.actor = { userId: ME, roles: ['field_officer'] };
    expect((await saveWorkDayAction({ date: 'nope', dayType: 'office', place: '', tasks: '' })).ok).toBe(false);
    expect(await saveWorkDayAction({ date: '2999-01-01', dayType: 'office', place: '', tasks: '' })).toMatchObject({ ok: false, error: expect.stringMatching(/not come yet/) });
    expect(state.calls.some((c) => c.method === 'upsert')).toBe(false);
  });
  it('saves for the signed-in person only, whatever else is sent', async () => {
    const r = await saveWorkDayAction({ date: '2020-01-02', dayType: 'tour', place: ' KL ', tasks: 'Visit', user_id: OWNER } as any);
    expect(r.ok).toBe(true);
    const row = state.calls.find((c) => c.method === 'upsert')?.args[0] as Record<string, unknown>;
    expect(row).toMatchObject({ user_id: ME, work_date: '2020-01-02', day_type: 'tour', place: 'KL', tasks: 'Visit' });
  });
  it('explains a database refusal in plain words', async () => {
    state.results.work_days = { data: null, error: { code: '42501', message: 'this month has been submitted, so its days cannot be changed' } };
    expect(await saveWorkDayAction({ date: '2020-01-02', dayType: 'office', place: '', tasks: '' })).toMatchObject({ ok: false, error: expect.stringMatching(/submitted/) });
  });
});

describe('submitStatementAction', () => {
  it('asks the database to submit and passes the signature tick', async () => {
    state.results.work_statements = { data: { id: SID, status: 'draft' }, error: null };
    expect((await submitStatementAction('2026-08', true)).ok).toBe(true);
    const upd = state.calls.find((c) => c.table === 'work_statements' && c.method === 'update')?.args[0];
    expect(upd).toEqual({ status: 'submitted', signed_prepared: true });
    expect((await submitStatementAction('2026-13', false)).ok).toBe(false);
  });
  it('shows the database reason when the month is not complete', async () => {
    state.results.work_statements = { data: { id: SID }, error: { code: '42501', message: 'every working day must be filled in before submitting (3 missing)' } };
    expect(await submitStatementAction('2026-08', false)).toMatchObject({ ok: false, error: expect.stringMatching(/working day/) });
  });
});

describe('review', () => {
  it('lists only statements this person may act on', async () => {
    state.results.work_statements = { data: [stmt(), stmt({ id: 'x', verifier_id: A })], error: null };
    state.results.profiles = { data: [{ id: OWNER, full_name: 'Owner Name', designation: null }], error: null };
    state.actor = { userId: V, roles: ['programme_manager'] };
    const r = await getReviewQueueAction();
    expect(r.ok && r.data.map((x) => [x.ownerName, x.step])).toEqual([['Owner Name', 'verify']]);
  });
  it('verifies, approves (with the tick) and needs a note to return', async () => {
    state.actor = { userId: V, roles: ['programme_manager'] };
    state.results.work_statements = { data: [stmt()], error: null };
    expect((await reviewStatementAction(SID, 'forward', '', true)).ok).toBe(true);
    expect(state.calls.filter((c) => c.method === 'update').at(-1)?.args[0]).toEqual({ status: 'verified', signed_verified: true });
    state.actor = { userId: A, roles: ['finance'] };
    state.results.work_statements = { data: [stmt({ status: 'verified' })], error: null };
    expect((await reviewStatementAction(SID, 'forward', '', false)).ok).toBe(true);
    expect(state.calls.filter((c) => c.method === 'update').at(-1)?.args[0]).toEqual({ status: 'approved', signed_approved: false });
    expect(await reviewStatementAction(SID, 'return', '  ', false)).toMatchObject({ ok: false });
    expect((await reviewStatementAction(SID, 'return', 'Fix day 3', false)).ok).toBe(true);
    expect(state.calls.filter((c) => c.method === 'update').at(-1)?.args[0]).toEqual({ status: 'returned', return_note: 'Fix day 3' });
  });
  it('refuses a person who is not the reviewer of this step, and the owner', async () => {
    state.results.work_statements = { data: [stmt()], error: null };
    state.actor = { userId: ME, roles: ['field_officer'] };
    expect((await reviewStatementAction(SID, 'forward', '', false)).ok).toBe(false);
    state.actor = { userId: OWNER, roles: ['executive'] };
    expect((await reviewStatementAction(SID, 'forward', '', false)).ok).toBe(false);
    expect(state.calls.some((c) => c.method === 'update')).toBe(false);
  });
});

describe('signature', () => {
  const png = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0])], 's.png');
  it('saves a real PNG for the signed-in person only', async () => {
    const fd = new FormData();
    fd.set('file', png());
    expect((await saveSignatureAction(fd)).ok).toBe(true);
    expect(state.uploads).toEqual([{ path: `${ME}/signature.png`, type: 'image/png' }]);
  });
  it('refuses a file that is not a PNG or JPG, an empty one and a big one', async () => {
    const bad = new FormData();
    bad.set('file', new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9])], 'x.png'));
    expect((await saveSignatureAction(bad)).ok).toBe(false);
    expect((await saveSignatureAction(new FormData())).ok).toBe(false);
    const big = new FormData();
    big.set('file', new File([new Uint8Array(600 * 1024)], 'big.png'));
    expect((await saveSignatureAction(big)).ok).toBe(false);
    expect(state.uploads).toHaveLength(0);
  });
});

describe('setReviewersAction', () => {
  it('is for the Super Admin and the Executive Director only, and refuses self-review', async () => {
    expect((await setReviewersAction(OWNER, V, A)).ok).toBe(false);
    state.actor = { userId: ME, roles: ['super_admin'] };
    expect((await setReviewersAction(OWNER, OWNER, A)).ok).toBe(false);
    expect((await setReviewersAction(OWNER, V, V)).ok).toBe(false);
    expect((await setReviewersAction(OWNER, V, A)).ok).toBe(true);
    expect(state.calls.find((c) => c.method === 'upsert')?.args[0]).toEqual({ user_id: OWNER, verifier_id: V, approver_id: A });
    state.actor = { userId: ME, roles: ['executive'] };
    expect((await setReviewersAction(OWNER, null, A)).ok).toBe(true);
  });
});
