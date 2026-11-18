import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppRole } from '@/lib/database.types';

type Result = { data: unknown; error: { message: string } | null };
const state = {
  user: null as { id: string } | null,
  roles: [] as AppRole[],
  profile: null as { is_active: boolean; org_id: string | null } | null,
  admin: {} as Record<string, Result>,
  adminCalls: [] as Array<{ table: string; method: string; args: unknown[] }>,
};
const ok = (data: unknown): Result => ({ data, error: null });

function builder(table: string, results: Record<string, Result>, calls?: typeof state.adminCalls): any {
  const proxy: any = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(results[table] ?? ok(null));
        if (prop === 'single' || prop === 'maybeSingle') {
          return () => {
            const r = results[table] ?? ok(null);
            return Promise.resolve({ data: Array.isArray(r.data) ? r.data[0] ?? null : r.data, error: r.error });
          };
        }
        return (...args: unknown[]) => {
          calls?.push({ table, method: prop, args });
          return proxy;
        };
      },
    }
  );
  return proxy;
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (t: string) =>
      builder(t, {
        user_roles: ok(state.roles.map((role) => ({ role }))),
        profiles: ok(state.profile),
      }),
  }),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (t: string) => builder(t, state.admin, state.adminCalls),
    storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: 'https://files.test/x' }, error: null }) }) },
  }),
}));
vi.mock('@/server/services/projectsData', () => ({
  isUuid: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
}));

import { encryptField } from '@/server/crypto/beneficiaryCrypto';
import { getDonorBeneficiariesAction, getDonorDownloadAction, getDonorHomeAction } from '../donorPortal';

const MY_ORG = '11111111-1111-4111-8111-111111111111';
const OTHER_ORG = '22222222-2222-4222-8222-222222222222';
const VERSION = '33333333-3333-4333-8333-333333333333';
const PROJECT = '44444444-4444-4444-8444-444444444444';

beforeEach(() => {
  state.user = { id: 'u1' };
  state.roles = ['donor'];
  state.profile = { is_active: true, org_id: MY_ORG };
  state.adminCalls = [];
  state.admin = {
    organizations: ok({ id: MY_ORG, name: 'Donor A', type: 'donor', is_active: true }),
    grants: ok([{ id: 'g1' }]),
    projects: ok([]),
    project_areas: ok([]),
    documents: ok([]),
  };
});

describe('donor portal access', () => {
  it('gives a donor the organisation on their own profile, whatever is sent from the browser', async () => {
    const r = await getDonorHomeAction(OTHER_ORG);
    expect(r.ok).toBe(true);
    const orgLookup = state.adminCalls.find((c) => c.table === 'organizations' && c.method === 'eq');
    expect(orgLookup?.args).toEqual(['id', MY_ORG]);
    const grantLookup = state.adminCalls.find((c) => c.table === 'grants' && c.method === 'eq');
    expect(grantLookup?.args).toEqual(['donor_org_id', MY_ORG]);
    expect(state.adminCalls.some((c) => c.args.includes(OTHER_ORG))).toBe(false);
  });
  it('refuses a person who is not a donor, executive, programme manager or board', async () => {
    state.roles = ['finance'];
    const r = await getDonorHomeAction(MY_ORG);
    expect(r.ok).toBe(false);
    expect(state.adminCalls).toHaveLength(0);
  });
  it('refuses a signed-out person and a switched-off donor', async () => {
    state.user = null;
    expect((await getDonorHomeAction()).ok).toBe(false);
    state.user = { id: 'u1' };
    state.profile = { is_active: false, org_id: MY_ORG };
    expect((await getDonorHomeAction()).ok).toBe(false);
  });
  it('says so when a donor account is not linked to an organisation', async () => {
    state.profile = { is_active: true, org_id: null };
    const r = await getDonorHomeAction();
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toContain('not linked');
  });
  it('lets the executive preview one donor, but only when a donor is chosen', async () => {
    state.roles = ['executive'];
    state.profile = { is_active: true, org_id: null };
    expect((await getDonorHomeAction()).ok).toBe(false);
    const r = await getDonorHomeAction(MY_ORG);
    expect(r.ok && r.data.preview).toBe(true);
  });
  it('refuses a preview of an organisation that is not a donor', async () => {
    state.roles = ['executive'];
    state.admin.organizations = ok({ id: OTHER_ORG, name: 'SKB', type: 'internal', is_active: true });
    expect((await getDonorHomeAction(OTHER_ORG)).ok).toBe(false);
  });
});

describe('donor download', () => {
  const version = ok({ id: VERSION, document_id: 'd1', storage_path: 'p/f.pdf', original_name: 'Form-7.pdf' });
  it('gives a link for a released document of the donor\'s own project', async () => {
    state.admin.document_versions = version;
    state.admin.documents = ok({ project_id: PROJECT, released_to_donor: true, deleted_at: null, current_version_id: VERSION });
    state.admin.projects = ok([{ id: PROJECT }]);
    const r = await getDonorDownloadAction(VERSION);
    expect(r.ok && r.url).toBe('https://files.test/x');
  });
  it('refuses a document that was not released', async () => {
    state.admin.document_versions = version;
    state.admin.documents = ok({ project_id: PROJECT, released_to_donor: false, deleted_at: null, current_version_id: VERSION });
    state.admin.projects = ok([{ id: PROJECT }]);
    expect((await getDonorDownloadAction(VERSION)).ok).toBe(false);
  });
  it('refuses an old version of a document', async () => {
    state.admin.document_versions = version;
    state.admin.documents = ok({ project_id: PROJECT, released_to_donor: true, deleted_at: null, current_version_id: 'other' });
    state.admin.projects = ok([{ id: PROJECT }]);
    expect((await getDonorDownloadAction(VERSION)).ok).toBe(false);
  });
  it('refuses a document of a project that is not the donor\'s', async () => {
    state.admin.document_versions = version;
    state.admin.documents = ok({ project_id: PROJECT, released_to_donor: true, deleted_at: null, current_version_id: VERSION });
    state.admin.projects = ok([]);
    expect((await getDonorDownloadAction(VERSION)).ok).toBe(false);
  });
});

describe('donor beneficiaries', () => {
  const KEY = Buffer.alloc(32, 7).toString('base64');
  beforeEach(() => {
    process.env.BENEFICIARY_ENCRYPTION_KEY = KEY;
  });
  it('shows names, sex and age group of the donor\'s own project and reads nothing else', async () => {
    state.admin.projects = ok([{ id: PROJECT }]);
    state.admin.beneficiaries = ok([
      { full_name_enc: encryptField('Salma Begum'), sex: 'female', birth_year: 1990 },
      { full_name_enc: encryptField('Karim Ali'), sex: 'male', birth_year: new Date().getFullYear() - 5 },
    ]);
    const r = await getDonorBeneficiariesAction(PROJECT);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.people.map((p) => [p.name, p.group])).toEqual([['Salma Begum', 'women'], ['Karim Ali', 'boys']]);
    expect(r.data.counts.total).toBe(2);
    const sel = state.adminCalls.find((c) => c.table === 'beneficiaries' && c.method === 'select');
    expect(sel?.args[0]).toBe('full_name_enc, sex, birth_year');
    expect(JSON.stringify(r.data)).not.toMatch(/national|phone/i);
  });
  it('refuses a project that is not the donor\'s, and a person who is not allowed', async () => {
    state.admin.projects = ok([]);
    expect((await getDonorBeneficiariesAction(PROJECT)).ok).toBe(false);
    expect(state.adminCalls.some((c) => c.table === 'beneficiaries')).toBe(false);
    state.roles = ['field_officer'];
    expect((await getDonorBeneficiariesAction(PROJECT)).ok).toBe(false);
  });
  it('is switched off when the key is missing', async () => {
    state.admin.projects = ok([{ id: PROJECT }]);
    delete process.env.BENEFICIARY_ENCRYPTION_KEY;
    expect((await getDonorBeneficiariesAction(PROJECT)).ok).toBe(false);
  });
});
