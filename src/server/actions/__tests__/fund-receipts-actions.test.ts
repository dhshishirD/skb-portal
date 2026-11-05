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
  getOwnOrganization: async () => ({ id: 'o', name: 'Test Organisation', registration_no: 'REG-1', registration_authority: null }),
  isUuid: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
}));

import {
  addFundReceiptAction,
  deleteFundReceiptAction,
  generateReceiptLetterAction,
  getFundReceiptsAction,
  setAckStatusAction,
  updateFundReceiptAction,
} from '../fundReceipts';

const PID = '11111111-1111-4111-8111-111111111111';
const RID = '33333333-3333-4333-8333-333333333333';
const USER = '22222222-2222-4222-8222-222222222222';
const proj = (stage: ProjectStage = 'implementation') => ({
  id: PID, code: 'TEST-1', title: 'Test project', stage, budget_amount: '10000', budget_currency: 'EUR', donor_name: 'Test Donor',
});
const good = { receivedOn: '2026-10-05', amount: '5,000', currency: 'EUR', reference: 'TT-1', fromName: 'Test Donor', note: '' };
const row = { id: RID, received_on: '2026-10-05', amount: '5000.00', currency: 'EUR', reference: 'TT-1', from_name: 'Test Donor', note: null, ack_status: 'not_sent' };

beforeEach(() => {
  state.actor = { userId: USER, roles: ['finance'] };
  state.project = proj();
  state.results = {};
  state.calls = [];
});

describe('getFundReceiptsAction', () => {
  it('needs sign-in and a visible project', async () => {
    state.actor = null;
    expect(await getFundReceiptsAction(PID)).toMatchObject({ ok: false, error: expect.stringMatching(/sign in/i) });
    state.actor = { userId: USER, roles: ['finance'] };
    expect(await getFundReceiptsAction('nope')).toMatchObject({ ok: false, error: 'Project not found.' });
    state.project = null;
    expect(await getFundReceiptsAction(PID)).toMatchObject({ ok: false, error: 'Project not found.' });
  });
  it('returns receipts with numbers converted and what the user may do', async () => {
    state.results.project_fund_receipts = { error: null, data: [row] };
    const r = await getFundReceiptsAction(PID);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.donorAmount).toBe(10000);
    expect(r.data.receipts[0]).toMatchObject({ amount: 5000, currency: 'EUR', ackStatus: 'not_sent' });
    expect(r.data.canRecord).toBe(true);
    expect(r.data.canDelete).toBe(true);
  });
  it('lets an officer record but not delete, a field officer neither, and nobody on a closed project', async () => {
    state.actor = { userId: USER, roles: ['project_officer'] };
    let r = await getFundReceiptsAction(PID);
    expect(r.ok && r.data.canRecord).toBe(true);
    expect(r.ok && r.data.canDelete).toBe(false);
    state.actor = { userId: USER, roles: ['field_officer'] };
    r = await getFundReceiptsAction(PID);
    expect(r.ok && r.data.canRecord).toBe(false);
    state.actor = { userId: USER, roles: ['executive'] };
    state.project = proj('closed');
    r = await getFundReceiptsAction(PID);
    expect(r.ok && r.data.canRecord).toBe(false);
    expect(r.ok && r.data.canDelete).toBe(false);
  });
  it('reports a load failure in plain words', async () => {
    state.results.project_fund_receipts = { data: null, error: { message: 'boom secret' } };
    const r = await getFundReceiptsAction(PID);
    expect(r).toMatchObject({ ok: false });
    expect(JSON.stringify(r)).not.toMatch(/secret/);
  });
});

describe('recording', () => {
  it('records a transfer, stamping the signed-in user', async () => {
    const r = await addFundReceiptAction(PID, good);
    expect(r.ok).toBe(true);
    expect(state.calls.find((c) => c.method === 'insert')!.args[0]).toEqual({
      project_id: PID, received_on: '2026-10-05', amount: 5000, currency: 'EUR', reference: 'TT-1', from_name: 'Test Donor', note: null, created_by: USER,
    });
  });
  it('refuses bad values, unauthorised users and closed projects before touching the database', async () => {
    expect(await addFundReceiptAction(PID, { ...good, amount: '0' })).toMatchObject({ ok: false });
    state.actor = { userId: USER, roles: ['donor'] };
    expect(await addFundReceiptAction(PID, good)).toMatchObject({ ok: false });
    state.actor = { userId: USER, roles: ['finance'] };
    state.project = proj('closed');
    expect(await addFundReceiptAction(PID, good)).toMatchObject({ ok: false, error: expect.stringMatching(/closed/) });
    expect(state.calls).toHaveLength(0);
  });
  it('updates, says so when nothing matched', async () => {
    state.results.project_fund_receipts = { error: null, data: [{ id: RID }] };
    expect((await updateFundReceiptAction(PID, RID, good)).ok).toBe(true);
    state.results.project_fund_receipts = { error: null, data: [] };
    expect(await updateFundReceiptAction(PID, RID, good)).toMatchObject({ ok: false, error: expect.stringMatching(/not found/i) });
    expect(await updateFundReceiptAction(PID, 'bad', good)).toMatchObject({ ok: false, error: 'Invalid request.' });
  });
  it('maps a database refusal to plain words', async () => {
    state.results.project_fund_receipts = { data: null, error: { code: '42501', message: 'new row violates row-level security policy' } };
    expect(await addFundReceiptAction(PID, good)).toMatchObject({ ok: false, error: expect.stringMatching(/permission/) });
  });
});

describe('status and delete', () => {
  it('moves the letter status only to known values', async () => {
    state.results.project_fund_receipts = { error: null, data: [{ id: RID }] };
    expect((await setAckStatusAction(PID, RID, 'sent')).ok).toBe(true);
    expect(await setAckStatusAction(PID, RID, 'maybe')).toMatchObject({ ok: false, error: 'Invalid request.' });
  });
  it('lets only the Executive Director and Finance delete', async () => {
    state.results.project_fund_receipts = { error: null, data: [{ id: RID }] };
    expect((await deleteFundReceiptAction(PID, RID)).ok).toBe(true);
    state.actor = { userId: USER, roles: ['project_officer'] };
    expect(await deleteFundReceiptAction(PID, RID)).toMatchObject({ ok: false, error: expect.stringMatching(/Executive Director and Finance/) });
    state.actor = { userId: USER, roles: ['finance'] };
    state.results.project_fund_receipts = { error: null, data: [] };
    expect(await deleteFundReceiptAction(PID, RID)).toMatchObject({ ok: false, error: expect.stringMatching(/not found/i) });
  });
});

describe('generateReceiptLetterAction', () => {
  it('returns a PDF for a receipt of the project', async () => {
    state.results.project_fund_receipts = { error: null, data: row };
    const r = await generateReceiptLetterAction(PID, RID);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.filename).toBe('fund-receipt-TEST-1-2026-10-05.pdf');
    expect(Buffer.from(r.data.base64, 'base64').subarray(0, 5).toString()).toBe('%PDF-');
  });
  it('refuses people who cannot record, and a receipt that is not found', async () => {
    state.actor = { userId: USER, roles: ['board'] };
    expect(await generateReceiptLetterAction(PID, RID)).toMatchObject({ ok: false });
    state.actor = { userId: USER, roles: ['finance'] };
    state.results.project_fund_receipts = { error: null, data: null };
    expect(await generateReceiptLetterAction(PID, RID)).toMatchObject({ ok: false, error: expect.stringMatching(/not found/i) });
  });
});
