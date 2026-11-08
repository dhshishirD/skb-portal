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

import { approveCharterVersionAction, exportCharterPdfAction, getCharterAction, saveCharterVersionAction } from '../charter';
import { emptyCharterText } from '@/lib/charter';

const PID = '11111111-1111-4111-8111-111111111111';
const VID = '33333333-3333-4333-8333-333333333333';
const USER = '22222222-2222-4222-8222-222222222222';
const proj = (stage: ProjectStage = 'concept') => ({
  id: PID, code: 'TEST-1', title: 'Test project', stage, donor_name: 'Test Donor', location: 'Test place',
  budget_amount: '10000', budget_currency: 'EUR', beneficiary_target: 266, start_date: '2026-11-01', end_date: '2026-12-31',
});
const form = { ...emptyCharterText(), background: 'Need', changeNote: '' };
const row = (over: Record<string, unknown> = {}) => ({
  id: VID, version: 1, background: 'Need', objectives: '', scope_in: '', scope_out: '', deliverables: '', risks: '', team: '',
  change_note: null, created_by: USER, created_at: '2026-11-08T05:00:00Z', approved_by: null, approved_at: null, ...over,
});

beforeEach(() => {
  state.actor = { userId: USER, roles: ['project_officer'] };
  state.project = proj();
  state.results = {};
  state.calls = [];
});

describe('getCharterAction', () => {
  it('needs sign-in and a visible project', async () => {
    state.actor = null;
    expect(await getCharterAction(PID)).toMatchObject({ ok: false, error: expect.stringMatching(/sign in/i) });
    state.actor = { userId: USER, roles: ['project_officer'] };
    expect(await getCharterAction('nope')).toMatchObject({ ok: false, error: 'Project not found.' });
    state.project = null;
    expect(await getCharterAction(PID)).toMatchObject({ ok: false, error: 'Project not found.' });
  });
  it('returns versions with names and what the user may do', async () => {
    state.results.project_charter_versions = { error: null, data: [row({ version: 2 }), row({ approved_by: USER, approved_at: '2026-11-08T06:00:00Z' })] };
    state.results.profiles = { error: null, data: [{ id: USER, full_name: 'Test Person' }] };
    const r = await getCharterAction(PID);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.versions).toHaveLength(2);
    expect(r.data.versions[0].createdByName).toBe('Test Person');
    expect(r.data.versions[1].approvedByName).toBe('Test Person');
    expect(r.data.facts).toMatchObject({ code: 'TEST-1', budgetAmount: 10000, currency: 'EUR', beneficiaryTarget: 266 });
    expect(r.data.canWrite).toBe(true);
    expect(r.data.canApprove).toBe(false);
  });
  it('lets the Executive Director approve, and nobody change a closed project', async () => {
    state.actor = { userId: USER, roles: ['executive'] };
    let r = await getCharterAction(PID);
    expect(r.ok && r.data.canApprove).toBe(true);
    state.project = proj('closed');
    r = await getCharterAction(PID);
    expect(r.ok && r.data.canApprove).toBe(false);
    expect(r.ok && r.data.canWrite).toBe(false);
  });
  it('reports a load failure in plain words', async () => {
    state.results.project_charter_versions = { data: null, error: { message: 'boom secret' } };
    const r = await getCharterAction(PID);
    expect(r).toMatchObject({ ok: false });
    expect(JSON.stringify(r)).not.toMatch(/secret/);
  });
});

describe('saveCharterVersionAction', () => {
  it('saves a first version', async () => {
    state.results.project_charter_versions = { error: null, data: [] };
    const r = await saveCharterVersionAction(PID, form);
    expect(r.ok).toBe(true);
    expect(state.calls.find((c) => c.method === 'insert')!.args[0]).toMatchObject({ project_id: PID, background: 'Need', change_note: null });
  });
  it('does not save when nothing changed, or when everything is empty', async () => {
    state.results.project_charter_versions = { error: null, data: [row()] };
    expect(await saveCharterVersionAction(PID, form)).toMatchObject({ ok: false, error: expect.stringMatching(/Nothing has changed/) });
    expect(await saveCharterVersionAction(PID, { ...emptyCharterText(), changeNote: '' })).toMatchObject({ ok: false, error: expect.stringMatching(/at least one section/) });
    expect(state.calls.filter((c) => c.method === 'insert')).toHaveLength(0);
  });
  it('refuses people who may not write, closed projects and bad text before touching the database', async () => {
    state.actor = { userId: USER, roles: ['finance'] };
    expect(await saveCharterVersionAction(PID, form)).toMatchObject({ ok: false });
    state.actor = { userId: USER, roles: ['project_officer'] };
    state.project = proj('closed');
    expect(await saveCharterVersionAction(PID, form)).toMatchObject({ ok: false, error: expect.stringMatching(/closed/) });
    state.project = proj();
    expect(await saveCharterVersionAction(PID, { ...form, risks: 'x'.repeat(8001) })).toMatchObject({ ok: false });
    expect(state.calls).toHaveLength(0);
  });
  it('tells the user plainly when two people saved at once', async () => {
    // first call (read latest) succeeds, second call (insert) hits the unique constraint
    const answers: Result[] = [
      { data: [], error: null },
      { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "project_charter_version_unique"' } },
    ];
    let i = 0;
    Object.defineProperty(state.results, 'project_charter_versions', { configurable: true, get: () => answers[Math.min(i++, 1)] });
    expect(await saveCharterVersionAction(PID, form)).toMatchObject({ ok: false, error: expect.stringMatching(/Reload/) });
  });
});

describe('approveCharterVersionAction', () => {
  it('is for the Executive Director only', async () => {
    expect(await approveCharterVersionAction(PID, VID)).toMatchObject({ ok: false, error: expect.stringMatching(/Executive Director/) });
    expect(state.calls).toHaveLength(0);
  });
  it('approves, stamping the signed-in user, and says so when the version is missing', async () => {
    state.actor = { userId: USER, roles: ['executive'] };
    state.results.project_charter_versions = { error: null, data: [{ id: VID }] };
    expect((await approveCharterVersionAction(PID, VID)).ok).toBe(true);
    expect(state.calls.find((c) => c.method === 'update')!.args[0]).toMatchObject({ approved_by: USER });
    state.results.project_charter_versions = { error: null, data: [] };
    expect(await approveCharterVersionAction(PID, VID)).toMatchObject({ ok: false, error: 'Version not found.' });
    expect(await approveCharterVersionAction(PID, 'bad')).toMatchObject({ ok: false, error: 'Invalid request.' });
  });
});

describe('exportCharterPdfAction', () => {
  it('returns a PDF of one version', async () => {
    state.results.project_charter_versions = { error: null, data: row({ version: 3 }) };
    const r = await exportCharterPdfAction(PID, VID);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.filename).toBe('charter-TEST-1-v3.pdf');
    expect(Buffer.from(r.data.base64, 'base64').subarray(0, 5).toString()).toBe('%PDF-');
  });
  it('says not found for a missing version', async () => {
    state.results.project_charter_versions = { error: null, data: null };
    expect(await exportCharterPdfAction(PID, VID)).toMatchObject({ ok: false, error: 'Version not found.' });
  });
});
