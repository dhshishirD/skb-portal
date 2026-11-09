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
vi.mock('@/server/services/projectsData', () => ({
  getActor: async () => state.actor,
  getProjectById: async () => state.project,
  isUuid: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
}));

import { addFileRecordAction, deleteFileRecordAction, getFileRecordsAction, setFileRecordStatusAction, updateFileRecordAction } from '../fileRecords';

const PID = '11111111-1111-4111-8111-111111111111';
const RID = '33333333-3333-4333-8333-333333333333';
const USER = '22222222-2222-4222-8222-222222222222';
const values = { kind: 'distribution_list', name: 'Signed list, batch 1', status: 'prepared', link: '', note: '' };

beforeEach(() => {
  state.actor = { userId: USER, roles: ['field_officer'] };
  state.project = { id: PID, stage: 'concept' };
  state.results = {};
  state.calls = [];
});

describe('getFileRecordsAction', () => {
  it('hides records from donors, finance and bad ids', async () => {
    expect((await getFileRecordsAction('nope')).ok).toBe(false);
    state.actor = { userId: USER, roles: ['donor'] };
    expect((await getFileRecordsAction(PID)).ok).toBe(false);
    state.actor = { userId: USER, roles: ['finance'] };
    expect((await getFileRecordsAction(PID)).ok).toBe(false);
  });
  it('lists records and sets what the person can do', async () => {
    state.results.project_file_records = { data: [{ id: RID, kind: 'nid_sheet', name: 'Sheet 1', status: 'sent', link: null, note: null, created_by: null, created_at: '2026-01-01', updated_at: '2026-01-01' }], error: null };
    const r = await getFileRecordsAction(PID);
    expect(r.ok && r.data.records).toHaveLength(1);
    expect(r.ok && r.data.canWrite).toBe(true);
    expect(r.ok && r.data.canDelete).toBe(false);
  });
  it('is read-only on a closed project', async () => {
    state.project = { id: PID, stage: 'closed' };
    const r = await getFileRecordsAction(PID);
    expect(r.ok && r.data.canWrite).toBe(false);
  });
});

describe('addFileRecordAction', () => {
  it('needs a writer role and an open project', async () => {
    state.actor = { userId: USER, roles: ['me_officer'] };
    expect((await addFileRecordAction(PID, values)).ok).toBe(false);
    state.actor = { userId: USER, roles: ['field_officer'] };
    state.project = { id: PID, stage: 'closed' };
    expect((await addFileRecordAction(PID, values)).ok).toBe(false);
  });
  it('refuses a link that is not https', async () => {
    expect((await addFileRecordAction(PID, { ...values, link: 'http://x.org' })).ok).toBe(false);
  });
  it('adds a record', async () => {
    expect((await addFileRecordAction(PID, values)).ok).toBe(true);
    expect(state.calls.some((c) => c.table === 'project_file_records' && c.method === 'insert')).toBe(true);
  });
});

describe('update, status and delete', () => {
  it('updates and reports when nothing matched', async () => {
    state.results.project_file_records = { data: [], error: null };
    expect((await updateFileRecordAction(PID, RID, { name: 'Renamed list', status: 'signed' })).ok).toBe(false);
    state.results.project_file_records = { data: [{ id: RID }], error: null };
    expect((await updateFileRecordAction(PID, RID, { name: 'Renamed list', status: 'signed' })).ok).toBe(true);
  });
  it('checks the status value', async () => {
    expect((await setFileRecordStatusAction(PID, RID, 'lost')).ok).toBe(false);
    state.results.project_file_records = { data: [{ id: RID }], error: null };
    expect((await setFileRecordStatusAction(PID, RID, 'received')).ok).toBe(true);
  });
  it('a field officer cannot delete, a project officer can', async () => {
    expect((await deleteFileRecordAction(PID, RID)).ok).toBe(false);
    state.actor = { userId: USER, roles: ['project_officer'] };
    state.results.project_file_records = { data: [{ id: RID }], error: null };
    expect((await deleteFileRecordAction(PID, RID)).ok).toBe(true);
  });
});
