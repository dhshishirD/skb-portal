import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppRole } from '@/lib/database.types';

// ---- mocks -------------------------------------------------------------------------
const state = {
  actor: null as { userId: string; roles: AppRole[] } | null,
  result: { data: null as unknown, error: null as { message: string } | null },
  calls: [] as Array<{ table: string; method: string; args: unknown[] }>,
};

/** A Supabase query builder stand-in: every method returns itself; awaiting gives state.result. */
function builder(table: string): any {
  const proxy: any = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(state.result);
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
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: (t: string) => builder(t) }) }));
vi.mock('@/server/services/projectsData', () => ({
  getActor: async () => state.actor,
  getOwnOrganization: async () => ({ id: 'org-1', name: 'SKB', registration_no: null, registration_authority: null }),
  listProjects: async () => [],
  isUuid: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
}));

import {
  archiveProjectAction,
  createProjectAction,
  setProjectOfficersAction,
  updateOrganizationDetailsAction,
  updateProjectAction,
} from '../projects';
import { EMPTY_PROJECT_FORM } from '@/lib/projects';

const ID = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const form = { ...EMPTY_PROJECT_FORM, code: 'WFS-SDLP', title: 'Water and food security' };

beforeEach(() => {
  state.actor = { userId: USER, roles: ['project_officer'] };
  state.result = { data: null, error: null };
  state.calls = [];
});

describe('createProjectAction', () => {
  it('asks a signed-out visitor to sign in', async () => {
    state.actor = null;
    const r = await createProjectAction(form);
    expect(r).toMatchObject({ ok: false });
  });

  it.each([['board'], ['legal_officer'], ['it_officer'], ['field_officer']] as Array<[AppRole]>)('refuses %s', async (role) => {
    state.actor = { userId: USER, roles: [role] };
    const r = await createProjectAction(form);
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/permission/i) });
    expect(state.calls).toHaveLength(0);
  });

  it('returns field errors for invalid input and does not touch the database', async () => {
    const r = await createProjectAction({ ...form, code: 'bad code!', title: 'ab' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fieldErrors ?? {})).toEqual(expect.arrayContaining(['code', 'title']));
    expect(state.calls).toHaveLength(0);
  });

  it('creates the project as the signed-in user', async () => {
    state.result = { data: { id: ID }, error: null };
    const r = await createProjectAction({ ...form, budget_amount: '1,000', budget_currency: 'EUR' });
    expect(r).toMatchObject({ ok: true, data: { id: ID } });
    const insert = state.calls.find((c) => c.method === 'insert');
    expect(insert?.table).toBe('projects');
    expect(insert?.args[0]).toMatchObject({ code: 'WFS-SDLP', budget_amount: 1000, budget_currency: 'EUR', created_by: USER });
  });

  it('reports a duplicate code on the code field', async () => {
    state.result = { data: null, error: { message: 'duplicate key value violates unique constraint "projects_code_key"' } };
    const r = await createProjectAction(form);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.code).toBeTruthy();
  });

  it('does not leak raw database errors', async () => {
    state.result = { data: null, error: { message: 'relation "secret_table" exploded at 10.0.0.5' } };
    const r = await createProjectAction(form);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).not.toMatch(/secret_table|10\.0\.0\.5/);
  });
});

describe('updateProjectAction', () => {
  it('rejects ids that are not UUIDs', async () => {
    expect(await updateProjectAction('WFS-SDLP', form)).toMatchObject({ ok: false });
    expect(state.calls).toHaveLength(0);
  });

  it('says so when the project is not visible to the user', async () => {
    state.result = { data: [], error: null };
    const r = await updateProjectAction(ID, form);
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/not found|not assigned/i) });
  });

  it('never sends created_by, stage or deleted_at', async () => {
    state.result = { data: [{ id: ID }], error: null };
    await updateProjectAction(ID, form);
    const update = state.calls.find((c) => c.method === 'update');
    expect(Object.keys(update?.args[0] as object)).not.toEqual(expect.arrayContaining(['created_by']));
    expect(Object.keys(update?.args[0] as object)).not.toEqual(expect.arrayContaining(['stage']));
    expect(Object.keys(update?.args[0] as object)).not.toEqual(expect.arrayContaining(['deleted_at']));
  });
});

describe('archiveProjectAction', () => {
  it('refuses a Program Officer', async () => {
    const r = await archiveProjectAction(ID);
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/Executive Director/) });
    expect(state.calls).toHaveLength(0);
  });

  it('lets the Executive Director archive', async () => {
    state.actor = { userId: USER, roles: ['executive'] };
    state.result = { data: [{ id: ID }], error: null };
    expect(await archiveProjectAction(ID)).toMatchObject({ ok: true });
    expect(state.calls.find((c) => c.method === 'update')?.args[0]).toHaveProperty('deleted_at');
  });
});

describe('setProjectOfficersAction', () => {
  it('refuses a Program Officer and the Executive Director', async () => {
    for (const roles of [['project_officer'], ['executive']] as AppRole[][]) {
      state.actor = { userId: USER, roles };
      expect(await setProjectOfficersAction(ID, [USER])).toMatchObject({ ok: false });
    }
    expect(state.calls).toHaveLength(0);
  });

  it('rejects malformed ids', async () => {
    state.actor = { userId: USER, roles: ['super_admin'] };
    expect(await setProjectOfficersAction(ID, ['not-a-uuid'])).toMatchObject({ ok: false });
  });
});

describe('updateOrganizationDetailsAction', () => {
  it('is for Super Admins only', async () => {
    state.actor = { userId: USER, roles: ['executive'] };
    expect(await updateOrganizationDetailsAction({ registration_no: '123', registration_authority: 'NGOAB' })).toMatchObject({ ok: false });
    expect(state.calls).toHaveLength(0);
  });

  it('saves for a Super Admin, turning empty text into null', async () => {
    state.actor = { userId: USER, roles: ['super_admin'] };
    state.result = { data: [{ id: 'org-1' }], error: null };
    const r = await updateOrganizationDetailsAction({ registration_no: ' 123/2026 ', registration_authority: '' });
    expect(r).toMatchObject({ ok: true });
    expect(state.calls.find((c) => c.method === 'update')?.args[0]).toEqual({ registration_no: '123/2026', registration_authority: null });
  });
});
