import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppRole } from '@/lib/database.types';

type Result = { data: unknown; error: { code?: string; message: string } | null };
const state = {
  actor: null as { userId: string; roles: AppRole[] } | null,
  results: {} as Record<string, Result>,
  rpc: { data: null, error: null } as Result,
  calls: [] as Array<{ table: string; method: string; args: unknown[] }>,
  rpcCalls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
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
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.rpcCalls.push({ fn, args });
      return state.rpc;
    },
  }),
}));
vi.mock('@/server/services/projectsData', () => ({
  getActor: async () => state.actor,
  isUuid: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
}));

import { actOnExpenseAction, fileExpenseAction, listExpensesAction } from '../expenses';
import {
  actOnPurchaseRequestAction,
  addQuotationAction,
  createPurchaseRequestAction,
  saveVendorAction,
  setBlacklistAction,
} from '../procurement';

const PID = '11111111-1111-4111-8111-111111111111';
const EID = '33333333-3333-4333-8333-333333333333';
const QID = '44444444-4444-4444-8444-444444444444';
const USER = '22222222-2222-4222-8222-222222222222';
const today = new Date().toISOString().slice(0, 10);
const claim = { projectId: PID, amount: '1500', currency: 'BDT' as const, fxRate: '', expenseDate: today, description: 'Transport', vendorName: '', receiptRef: '' };

beforeEach(() => {
  state.actor = { userId: USER, roles: ['project_officer'] };
  state.results = {};
  state.rpc = { data: null, error: null };
  state.calls = [];
  state.rpcCalls = [];
});

describe('expense actions', () => {
  it('need sign-in', async () => {
    state.actor = null;
    expect((await fileExpenseAction(claim)).ok).toBe(false);
    expect((await listExpensesAction()).ok).toBe(false);
    expect((await actOnExpenseAction(EID, 'approve')).ok).toBe(false);
  });
  it('file a claim as "submitted" and never send the claimant', async () => {
    const r = await fileExpenseAction(claim);
    expect(r.ok).toBe(true);
    const insert = state.calls.find((c) => c.table === 'expenses' && c.method === 'insert');
    const row = insert?.args[0] as Record<string, unknown>;
    expect(row.status).toBe('submitted');
    expect(row.fx_rate_to_bdt).toBe(1);
    expect('claimant_id' in row).toBe(false);
  });
  it('reject bad values before calling the database', async () => {
    const r = await fileExpenseAction({ ...claim, amount: '-5' });
    expect(r.ok).toBe(false);
    expect(state.calls).toHaveLength(0);
  });
  it('turn a database failure into a plain message', async () => {
    state.results.expenses = { data: null, error: { code: '42501', message: 'new row violates row-level security policy for table "expenses"' } };
    const r = await fileExpenseAction(claim);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).not.toMatch(/row-level|expenses/i);
  });
  it('require a comment to return or reject, but not to approve', async () => {
    expect((await actOnExpenseAction(EID, 'return', '')).ok).toBe(false);
    expect((await actOnExpenseAction(EID, 'reject', 'no')).ok).toBe(false);
    expect(state.rpcCalls).toHaveLength(0);
    state.rpc = { data: 'pm_approved', error: null };
    expect((await actOnExpenseAction(EID, 'approve')).ok).toBe(true);
    expect(state.rpcCalls[0]).toEqual({ fn: 'act_on_expense', args: { p_expense_id: EID, p_action: 'approve', p_comment: null } });
  });
  it('pass through the separation-of-duties message', async () => {
    state.rpc = { data: null, error: { message: 'separation of duties: you cannot approve your own claim' } };
    const r = await actOnExpenseAction(EID, 'approve');
    expect(!r.ok && r.error).toMatch(/separation of duties/i);
  });
  it('refuse an unknown action or a bad id', async () => {
    expect((await actOnExpenseAction('nope', 'approve')).ok).toBe(false);
    expect((await actOnExpenseAction(EID, 'pay' as never)).ok).toBe(false);
  });
});

describe('vendor actions', () => {
  it('only Procurement or the Executive Director manage vendors', async () => {
    expect((await saveVendorAction({ name: 'Rahim Traders', contactPerson: '', phone: '', email: '' })).ok).toBe(false);
    state.actor = { userId: USER, roles: ['procurement'] };
    expect((await saveVendorAction({ name: 'Rahim Traders', contactPerson: '', phone: '', email: '' })).ok).toBe(true);
  });
  it('blacklisting needs a reason and lifting is Executive Director only', async () => {
    state.actor = { userId: USER, roles: ['procurement'] };
    expect((await setBlacklistAction(EID, true, 'bad')).ok).toBe(false);
    expect((await setBlacklistAction(EID, true, 'Delivered wrong goods twice')).ok).toBe(true);
    expect((await setBlacklistAction(EID, false)).ok).toBe(false);
    state.actor = { userId: USER, roles: ['executive'] };
    expect((await setBlacklistAction(EID, false)).ok).toBe(true);
  });
});

describe('purchase request actions', () => {
  it('create a draft', async () => {
    const r = await createPurchaseRequestAction({ projectId: PID, description: 'Rice for 50 families', estimatedAmount: '60000' });
    expect(r.ok).toBe(true);
    const row = state.calls.find((c) => c.table === 'purchase_requests' && c.method === 'insert')?.args[0] as Record<string, unknown>;
    expect(row.status).toBe('draft');
    expect('requester_id' in row).toBe(false);
  });
  it('only Procurement adds quotations', async () => {
    expect((await addQuotationAction(EID, { vendorId: QID, amount: '500' })).ok).toBe(false);
    state.actor = { userId: USER, roles: ['procurement'] };
    expect((await addQuotationAction(EID, { vendorId: QID, amount: '500' })).ok).toBe(true);
    expect((await addQuotationAction(EID, { vendorId: QID, amount: '0' })).ok).toBe(false);
  });
  it('approve needs a chosen quotation; reject needs a comment', async () => {
    expect((await actOnPurchaseRequestAction(EID, 'approve')).ok).toBe(false);
    expect((await actOnPurchaseRequestAction(EID, 'reject', { comment: '' })).ok).toBe(false);
    expect(state.rpcCalls).toHaveLength(0);
    expect((await actOnPurchaseRequestAction(EID, 'approve', { quotationId: QID, comment: 'Lowest price' })).ok).toBe(true);
    expect(state.rpcCalls[0]).toEqual({
      fn: 'act_on_purchase_request',
      args: { p_request_id: EID, p_action: 'approve', p_comment: 'Lowest price', p_quotation_id: QID },
    });
  });
  it('submit and issue_po go straight to the database function', async () => {
    expect((await actOnPurchaseRequestAction(EID, 'submit')).ok).toBe(true);
    expect((await actOnPurchaseRequestAction(EID, 'issue_po')).ok).toBe(true);
    expect(state.rpcCalls.map((c) => c.args.p_action)).toEqual(['submit', 'issue_po']);
  });
  it('show the database rule message when quotations are missing', async () => {
    state.rpc = { data: null, error: { message: 'from BDT 50,000 quotations from 3 different vendors are required' } };
    const r = await actOnPurchaseRequestAction(EID, 'ready');
    expect(!r.ok && r.error).toMatch(/3 different vendors/);
  });
});
