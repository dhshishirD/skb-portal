import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppRole } from '@/lib/database.types';

type Result = { data: unknown; error: { code?: string; message: string } | null };
const state = {
  actor: null as { userId: string; roles: AppRole[] } | null,
  project: null as Record<string, unknown> | null,
  results: {} as Record<string, Result>,
  calls: [] as Array<{ table: string; method: string; args: unknown[] }>,
  signedUrl: { data: { signedUrl: 'https://files.test/x' } as unknown, error: null as unknown },
  signedUpload: { data: { path: 'p', token: 'tok' } as unknown, error: null as unknown },
  removed: [] as string[][],
  fetchBytes: [0x25, 0x50, 0x44, 0x46],
  fetchOk: true,
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
    }
  );
  return proxy;
}

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ from: (t: string) => builder(t) }) }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        createSignedUploadUrl: async () => state.signedUpload,
        createSignedUrl: async () => state.signedUrl,
        remove: async (paths: string[]) => {
          state.removed.push(paths);
          return { data: null, error: null };
        },
      }),
    },
  }),
}));
vi.mock('@/server/services/projectsData', () => ({
  getActor: async () => state.actor,
  getProjectById: async () => state.project,
  isUuid: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
}));

import {
  completeDocumentUploadAction,
  getDocumentDownloadAction,
  prepareDocumentUploadAction,
  removeDocumentAction,
  setDonorReleaseAction,
} from '../documents';

const PID = '11111111-1111-4111-8111-111111111111';
const DID = '33333333-3333-4333-8333-333333333333';
const VID = '44444444-4444-4444-8444-444444444444';
const USER = '22222222-2222-4222-8222-222222222222';
const proj = (stage = 'concept') => ({ id: PID, stage });
const file = { fileName: 'plan.pdf', mime: 'application/pdf', size: 5000 };
const base = { projectId: PID, documentId: null, ...file };
const values = { title: 'Grant plan', category: 'proposal', description: '' };

beforeEach(() => {
  state.actor = { userId: USER, roles: ['project_officer'] };
  state.project = proj();
  state.results = {};
  state.calls = [];
  state.removed = [];
  state.signedUrl = { data: { signedUrl: 'https://files.test/x' }, error: null };
  state.signedUpload = { data: { path: `${PID}/abc`, token: 'tok' }, error: null };
  state.fetchBytes = [0x25, 0x50, 0x44, 0x46];
  state.fetchOk = true;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: state.fetchOk,
      arrayBuffer: async () => new Uint8Array(state.fetchBytes).buffer,
      headers: { get: () => 'bytes 0-15/5000' },
    }))
  );
});

describe('prepareDocumentUploadAction', () => {
  it('needs sign-in and a writer role, and refuses a closed project', async () => {
    state.actor = null;
    expect((await prepareDocumentUploadAction(base)).ok).toBe(false);
    state.actor = { userId: USER, roles: ['field_officer'] };
    expect((await prepareDocumentUploadAction(base)).ok).toBe(false);
    state.actor = { userId: USER, roles: ['donor'] };
    expect((await prepareDocumentUploadAction(base)).ok).toBe(false);
    state.actor = { userId: USER, roles: ['project_officer'] };
    state.project = proj('closed');
    expect((await prepareDocumentUploadAction(base)).ok).toBe(false);
  });
  it('refuses a bad file before storage is touched', async () => {
    expect((await prepareDocumentUploadAction({ ...base, mime: 'application/x-msdownload' })).ok).toBe(false);
    expect((await prepareDocumentUploadAction({ ...base, size: 30 * 1024 * 1024 })).ok).toBe(false);
  });
  it('hands out an upload link inside the project folder', async () => {
    const r = await prepareDocumentUploadAction(base);
    expect(r).toMatchObject({ ok: true, data: { token: 'tok' } });
  });
  it('a new version needs an existing document of this project', async () => {
    state.results.documents = { data: null, error: null };
    expect((await prepareDocumentUploadAction({ ...base, documentId: DID })).ok).toBe(false);
    state.results.documents = { data: { id: DID }, error: null };
    expect((await prepareDocumentUploadAction({ ...base, documentId: DID })).ok).toBe(true);
  });
});

describe('completeDocumentUploadAction', () => {
  const input = { ...base, path: `${PID}/abc-plan.pdf`, values };
  it('refuses a path from another project or with ..', async () => {
    expect((await completeDocumentUploadAction({ ...input, path: 'other/abc.pdf' })).ok).toBe(false);
    expect((await completeDocumentUploadAction({ ...input, path: `${PID}/../x.pdf` })).ok).toBe(false);
    expect(state.calls.some((c) => c.method === 'insert')).toBe(false);
  });
  it('removes a file whose content is not what it claims', async () => {
    state.fetchBytes = [0x4d, 0x5a, 0x90, 0x00];
    const r = await completeDocumentUploadAction(input);
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/content does not match/) });
    expect(state.removed).toEqual([[input.path]]);
    expect(state.calls.some((c) => c.method === 'insert')).toBe(false);
  });
  it('records a new document, its first version and makes it current', async () => {
    state.results.documents = { data: [{ id: DID }], error: null };
    state.results.document_versions = { data: [{ id: VID }], error: null };
    const r = await completeDocumentUploadAction(input);
    expect(r).toMatchObject({ ok: true, message: 'Document added.' });
    const inserts = state.calls.filter((c) => c.method === 'insert');
    expect(inserts[0]).toMatchObject({ table: 'documents' });
    expect(inserts[0].args[0]).toMatchObject({ project_id: PID, title: 'Grant plan', category: 'proposal' });
    expect(inserts[1]).toMatchObject({ table: 'document_versions' });
    expect(inserts[1].args[0]).toMatchObject({ document_id: DID, storage_path: input.path, size: 5000, original_name: 'plan.pdf' });
    expect(state.calls.find((c) => c.method === 'update')?.args[0]).toMatchObject({ current_version_id: VID });
  });
  it('cleans up when the version cannot be saved', async () => {
    state.results.documents = { data: [{ id: DID }], error: null };
    state.results.document_versions = { data: null, error: { code: '42501', message: 'the documents of a closed project cannot be changed' } };
    const r = await completeDocumentUploadAction(input);
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/closed project/) });
    expect(state.removed).toEqual([[input.path]]);
    expect(state.calls.some((c) => c.method === 'update' && (c.args[0] as any).deleted_at)).toBe(true);
  });
});

describe('download, release and remove', () => {
  it('gives a link only for a version the database lets this person read', async () => {
    state.results.document_versions = { data: null, error: null };
    expect((await getDocumentDownloadAction(VID)).ok).toBe(false);
    state.results.document_versions = { data: { id: VID, storage_path: `${PID}/a.pdf`, original_name: 'a.pdf' }, error: null };
    expect(await getDocumentDownloadAction(VID)).toMatchObject({ ok: true, data: { url: 'https://files.test/x' } });
    expect((await getDocumentDownloadAction('not-an-id')).ok).toBe(false);
  });
  it('only the two managers release', async () => {
    expect((await setDonorReleaseAction(PID, DID, true)).ok).toBe(false);
    state.actor = { userId: USER, roles: ['programme_manager'] };
    state.results.documents = { data: [{ id: DID }], error: null };
    expect(await setDonorReleaseAction(PID, DID, true)).toMatchObject({ ok: true, message: 'Released to the donor.' });
    expect(state.calls.find((c) => c.method === 'update')?.args[0]).toEqual({ released_to_donor: true });
  });
  it('reports when nothing changed, and blocks a closed project', async () => {
    state.results.documents = { data: [], error: null };
    expect((await removeDocumentAction(PID, DID)).ok).toBe(false);
    state.project = proj('closed');
    expect((await removeDocumentAction(PID, DID)).ok).toBe(false);
  });
  it('explains a database refusal', async () => {
    state.actor = { userId: USER, roles: ['executive'] };
    state.results.documents = { data: null, error: { code: '23514', message: 'a document with no file cannot be released' } };
    expect(await setDonorReleaseAction(PID, DID, true)).toMatchObject({ ok: false, error: expect.stringMatching(/Add a file/) });
  });
});
