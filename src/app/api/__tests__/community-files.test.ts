// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import type { AppRole } from '@/lib/database.types';

const state = {
  me: null as null | { roles: AppRole[]; active: boolean },
  row: null as null | Record<string, unknown>,
  uploaded: [] as string[],
  signed: [] as string[],
};

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth/guards', () => ({
  requireActiveRole: async (allowed: (r: AppRole[]) => boolean) => {
    if (!state.me) return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    if (!state.me.active || !allowed(state.me.roles)) return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    return { ok: true, user: { id: 'user-1' }, roles: state.me.roles, fullName: 'Test' };
  },
}));
// The person's own session: returns the row only if Row Level Security would let them see it.
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => {
      const q: any = { select: () => q, eq: () => q, is: () => q, maybeSingle: async () => ({ data: state.row }) };
      return q;
    },
  }),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        upload: async (path: string) => (state.uploaded.push(path), { error: null }),
        createSignedUrl: async (path: string) => (state.signed.push(path), { data: { signedUrl: `https://files.test/${path}` }, error: null }),
      }),
    },
  }),
}));

import { GET, POST } from '../community/files/route';

const ID = '3f2c7c1e-0a1b-4c2d-8e3f-123456789abc';
const get = (qs: string) => new NextRequest(`http://x/api/community/files?${qs}`);
const upload = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return new NextRequest('http://x/api/community/files', { method: 'POST', body: form });
};
const pdf = (size = 100) => new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, ...new Array(size).fill(1)])], 'a b.pdf', { type: 'application/pdf' });

beforeEach(() => {
  state.me = { roles: ['project_officer'], active: true };
  state.row = null;
  state.uploaded = [];
  state.signed = [];
});

describe('community files: upload', () => {
  it('refuses signed-out, deactivated and non-staff callers', async () => {
    state.me = null;
    expect((await POST(upload(pdf()))).status).toBe(401);
    for (const me of [{ roles: ['project_officer'] as AppRole[], active: false }, { roles: ['donor'] as AppRole[], active: true }]) {
      state.me = me;
      expect((await POST(upload(pdf()))).status).toBe(403);
    }
    expect(state.uploaded).toHaveLength(0);
  });

  it('stores a good file under the uploader\'s own id and returns its details', async () => {
    const res = await POST(upload(pdf()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.path.startsWith('user-1/')).toBe(true);
    expect(body.path).not.toContain(' ');
    expect(body).toMatchObject({ name: 'a b.pdf', type: 'application/pdf' });
  });

  it('refuses unlisted types, wrong content, empty and oversize files', async () => {
    expect((await POST(upload(new File(['x'], 'a.zip', { type: 'application/zip' })))).status).toBe(415);
    expect((await POST(upload(new File(['not a pdf at all'], 'a.pdf', { type: 'application/pdf' })))).status).toBe(415);
    expect((await POST(upload(new File([], 'a.pdf', { type: 'application/pdf' })))).status).toBe(413);
    expect((await POST(upload(pdf(10 * 1024 * 1024)))).status).toBe(413);
    expect(state.uploaded).toHaveLength(0);
  });
});

describe('community files: download link', () => {
  it('refuses signed-out and non-staff callers', async () => {
    state.me = null;
    expect((await GET(get(`kind=post&id=${ID}`))).status).toBe(401);
    state.me = { roles: ['donor'], active: true };
    expect((await GET(get(`kind=post&id=${ID}`))).status).toBe(403);
  });

  it('rejects a bad kind or id', async () => {
    expect((await GET(get(`kind=other&id=${ID}`))).status).toBe(400);
    expect((await GET(get('kind=post&id=not-a-uuid'))).status).toBe(400);
  });

  it('gives a link when the person can see the post and the file is its author\'s', async () => {
    state.row = { author_id: 'u9', attachment_path: 'u9/abc-file.pdf', attachment_name: 'file.pdf' };
    const res = await GET(get(`kind=post&id=${ID}`));
    expect(res.status).toBe(200);
    expect((await res.json()).url).toContain('u9/abc-file.pdf');
  });

  it('gives nothing when row level security hides the row (for example someone else\'s message)', async () => {
    state.row = null;
    expect((await GET(get(`kind=dm&id=${ID}`))).status).toBe(404);
    expect(state.signed).toHaveLength(0);
  });

  it('refuses a file path that does not belong to the author (cannot point a post at another person\'s file)', async () => {
    state.row = { author_id: 'u9', attachment_path: 'someone-else/secret.pdf', attachment_name: 'x.pdf' };
    expect((await GET(get(`kind=post&id=${ID}`))).status).toBe(404);
    expect(state.signed).toHaveLength(0);
  });

  it('gives nothing for a row without a file', async () => {
    state.row = { sender_id: 'u9', attachment_path: null, attachment_name: null };
    expect((await GET(get(`kind=dm&id=${ID}`))).status).toBe(404);
  });
});
