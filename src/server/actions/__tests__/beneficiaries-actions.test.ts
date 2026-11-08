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

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ from: (t: string) => builder(t) }) }));
vi.mock('@/server/services/projectsData', () => ({
  getActor: async () => state.actor,
  getProjectById: async () => state.project,
    isUuid: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
}));

import {
  deleteBeneficiaryAction, getBeneficiariesAction, registerBeneficiaryAction, revealFieldAction, updateBeneficiaryAction,
} from '../beneficiaries';
import { encryptField } from '@/server/crypto/beneficiaryCrypto';

const KEY = Buffer.alloc(32, 7).toString('base64');
const PID = '11111111-1111-4111-8111-111111111111';
const BID = '33333333-3333-4333-8333-333333333333';
const USER = '22222222-2222-4222-8222-222222222222';
const proj = (stage = 'implementation') => ({ id: PID, stage });
const form = { fullName: 'Test Person', nationalId: '1234567890', phone: '01712345678', sex: 'female' as const, birthYear: '1990' };

beforeEach(() => {
  process.env.BENEFICIARY_ENCRYPTION_KEY = KEY;
  state.actor = { userId: USER, roles: ['field_officer'] };
  state.project = proj();
  state.results = {};
  state.calls = [];
});

describe('registerBeneficiaryAction', () => {
  it('needs the right role, an open project and the key', async () => {
    state.actor = { userId: USER, roles: ['me_officer'] };
    expect((await registerBeneficiaryAction(PID, form)).ok).toBe(false);
    state.actor = { userId: USER, roles: ['donor'] };
    expect((await registerBeneficiaryAction(PID, form)).ok).toBe(false);
    state.actor = { userId: USER, roles: ['field_officer'] };
    state.project = proj('closed');
    expect((await registerBeneficiaryAction(PID, form)).ok).toBe(false);
    state.project = proj();
    delete process.env.BENEFICIARY_ENCRYPTION_KEY;
    expect(await registerBeneficiaryAction(PID, form)).toMatchObject({ ok: false, error: expect.stringMatching(/switched off/) });
    expect(state.calls.some((c) => c.method === 'insert')).toBe(false);
  });
  it('saves ONLY encrypted values and a fingerprint, never the plain text', async () => {
    const r = await registerBeneficiaryAction(PID, { ...form, nationalId: '1234 567 890', phone: '+8801712345678' });
    expect(r.ok).toBe(true);
    const row = state.calls.find((c) => c.method === 'insert')?.args[0] as Record<string, unknown>;
    expect(row.full_name_enc).toMatch(/^v1:/);
    expect(row.national_id_enc).toMatch(/^v1:/);
    expect(row.phone_enc).toMatch(/^v1:/);
    expect(row.national_id_hash).toMatch(/^[0-9a-f]{64}$/);
    const text = JSON.stringify(row);
    expect(text).not.toContain('Test Person');
    expect(text).not.toContain('1234567890');
    expect(text).not.toContain('01712345678');
    expect(row).toMatchObject({ project_id: PID, sex: 'female', birth_year: 1990 });
  });
  it('rejects bad input and explains a duplicate ID', async () => {
    expect((await registerBeneficiaryAction(PID, { ...form, nationalId: '123' })).ok).toBe(false);
    state.results.beneficiaries = { data: null, error: { code: '23505', message: 'duplicate key' } };
    expect(await registerBeneficiaryAction(PID, form)).toMatchObject({ ok: false, error: expect.stringMatching(/already registered/) });
  });
});

describe('updateBeneficiaryAction and delete', () => {
  it('keeps the saved ID and phone when left blank', async () => {
    state.results.beneficiaries = { data: [{ id: BID }], error: null };
    const r = await updateBeneficiaryAction(PID, BID, { ...form, nationalId: '', phone: '' });
    expect(r.ok).toBe(true);
    const change = state.calls.find((c) => c.method === 'update')?.args[0] as Record<string, unknown>;
    expect(change).not.toHaveProperty('national_id_enc');
    expect(change).not.toHaveProperty('phone_enc');
    expect(change.full_name_enc).toMatch(/^v1:/);
  });
  it('only project officers, programme managers and the director delete', async () => {
    state.results.beneficiaries = { data: [{ id: BID }], error: null };
    expect((await deleteBeneficiaryAction(PID, BID)).ok).toBe(false);
    state.actor = { userId: USER, roles: ['project_officer'] };
    expect((await deleteBeneficiaryAction(PID, BID)).ok).toBe(true);
  });
});

describe('revealFieldAction', () => {
  it('writes the log first, then shows the value', async () => {
    state.results.beneficiaries = { data: { id: BID, national_id_enc: encryptField('1234567890'), phone_enc: null }, error: null };
    const r = await revealFieldAction(PID, BID, 'national_id', 'Check for the donor list');
    expect(r).toEqual({ ok: true, data: { value: '1234567890' } });
    const logCall = state.calls.find((c) => c.table === 'beneficiary_access_log' && c.method === 'insert');
    expect(logCall?.args[0]).toMatchObject({ project_id: PID, beneficiary_id: BID, field: 'national_id', reason: 'Check for the donor list', accessed_by: USER });
  });
  it('shows nothing when the log cannot be written', async () => {
    state.results.beneficiaries = { data: { id: BID, national_id_enc: encryptField('1234567890'), phone_enc: null }, error: null };
    state.results.beneficiary_access_log = { data: null, error: { code: '42501', message: 'denied' } };
    const r = await revealFieldAction(PID, BID, 'national_id', '');
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain('1234567890');
  });
  it('reports an empty field, blocks donors and a missing key, and still works on a closed project', async () => {
    state.results.beneficiaries = { data: { id: BID, national_id_enc: null, phone_enc: null }, error: null };
    expect((await revealFieldAction(PID, BID, 'phone', '')).ok).toBe(false);
    state.actor = { userId: USER, roles: ['donor'] };
    expect((await revealFieldAction(PID, BID, 'phone', '')).ok).toBe(false);
    state.actor = { userId: USER, roles: ['field_officer'] };
    state.project = proj('closed');
    state.results.beneficiaries = { data: { id: BID, national_id_enc: null, phone_enc: encryptField('01712345678') }, error: null };
    expect(await revealFieldAction(PID, BID, 'phone', '')).toEqual({ ok: true, data: { value: '01712345678' } });
    delete process.env.BENEFICIARY_ENCRYPTION_KEY;
    expect((await revealFieldAction(PID, BID, 'phone', '')).ok).toBe(false);
  });
});

describe('getBeneficiariesAction', () => {
  it('decrypts names for the list, never returns ID or phone, and counts everyone', async () => {
    state.results.beneficiaries = {
      data: [
        { id: BID, full_name_enc: encryptField('Test Person'), national_id_enc: encryptField('1234567890'), phone_enc: null, sex: 'female', birth_year: 1990, registered_by: null, created_at: '2026-11-08T00:00:00Z', consent_at: null },
      ],
      error: null,
    };
    const r = await getBeneficiariesAction(PID);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.people[0]).toMatchObject({ fullName: 'Test Person', hasNationalId: true, hasPhone: false });
      expect(JSON.stringify(r.data)).not.toContain('1234567890');
      expect(r.data.counts.total).toBe(1);
      expect(r.data.consentRecorded).toBe(0);
      expect(r.data.canRegister).toBe(true);
      expect(r.data.log).toBeNull();
    }
  });
  it('locks the list without the key and blocks other roles', async () => {
    state.results.beneficiaries = { data: [{ id: BID, full_name_enc: encryptField('Test Person'), national_id_enc: null, phone_enc: null, sex: 'male', birth_year: 2015, registered_by: null, created_at: '2026-11-08T00:00:00Z', consent_at: null }], error: null };
    delete process.env.BENEFICIARY_ENCRYPTION_KEY;
    const r = await getBeneficiariesAction(PID);
    expect(r.ok && r.data.people[0].fullName).toMatch(/locked/);
    expect(r.ok && r.data.canRegister).toBe(false);
    state.actor = { userId: USER, roles: ['finance'] };
    expect((await getBeneficiariesAction(PID)).ok).toBe(false);
  });
  it('shows the access log to the Executive Director only', async () => {
    state.actor = { userId: USER, roles: ['executive'] };
    state.results.beneficiaries = { data: [], error: null };
    const r = await getBeneficiariesAction(PID);
    expect(r.ok && r.data.log).toEqual([]);
  });
});
