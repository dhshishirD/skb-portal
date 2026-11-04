import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import type { AppRole } from '@/lib/database.types';

const state = {
  me: null as null | { roles: AppRole[]; fullName: string; active: boolean },
  rows: [] as any[],
  inserts: [] as any[],
  updates: [] as any[],
  sent: [] as any[],
};

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth/guards', () => ({
  requireActiveRole: async (allowed: (r: AppRole[]) => boolean) => {
    if (!state.me) return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    if (!state.me.active || !allowed(state.me.roles)) {
      return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }
    return { ok: true, user: { id: 'u1' }, roles: state.me.roles, fullName: state.me.fullName };
  },
  requireUser: async () => ({ ok: true, user: { id: 'u1' } }),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => {
      const q: any = {
        select: () => q,
        in: () => q,
        eq: () => q,
        order: () => q,
        limit: () => q,
        then: (res: (v: unknown) => void) => res({ data: state.rows, error: null }),
        insert: (row: any) => {
          state.inserts.push(row);
          return Promise.resolve({ error: null });
        },
        update: (row: any) => {
          state.updates.push(row);
          return q;
        },
      };
      return q;
    },
  }),
}));
vi.mock('@/server/services/notificationService', () => ({
  sendSMSNotification: async (p: unknown) => (state.sent.push(p), { success: true }),
  sendWhatsAppNotification: async (p: unknown) => (state.sent.push(p), { success: true }),
}));

import { GET as syncGet, POST as syncPost } from '../community/sync/route';
import { POST as notifyPost } from '../notifications/send/route';

const post = (body: unknown) => new Request('http://x/api', { method: 'POST', body: JSON.stringify(body) });

beforeEach(() => {
  state.me = { roles: ['project_officer'], fullName: 'Mizbah Uddin', active: true };
  state.rows = [];
  state.inserts = [];
  state.updates = [];
  state.sent = [];
});

describe('community sync', () => {
  it('refuses signed-out, deactivated, donor and partner callers', async () => {
    state.me = null;
    expect((await syncGet()).status).toBe(401);
    for (const me of [
      { roles: ['project_officer'] as AppRole[], fullName: 'X', active: false },
      { roles: ['donor'] as AppRole[], fullName: 'X', active: true },
      { roles: ['partner'] as AppRole[], fullName: 'X', active: true },
    ]) {
      state.me = me;
      expect((await syncGet()).status).toBe(403);
      expect((await syncPost(post({ type: 'LIKE', payload: { postId: 'p', likesCount: 1 } }))).status).toBe(403);
    }
  });

  it('returns only my own direct messages', async () => {
    const dm = (id: string, s: string, r: string) => ({
      id: `r${id}`,
      kind: 'community_dm',
      created_at: '2026-11-04T00:00:00Z',
      payload: { id, senderName: s, recipientName: r, text: 't' },
    });
    state.rows = [dm('1', 'Mizbah Uddin', 'Daloyar Hassan'), dm('2', 'MD. Emran', 'Mizbah Uddin'), dm('3', 'Daloyar Hassan', 'MD. Emran')];
    const body = await (await syncGet()).json();
    expect(body.directMessages.map((d: any) => d.id).sort()).toEqual(['1', '2']);
  });

  it('hides donor tickets from roles that do not handle donors', async () => {
    state.rows = [{ id: 'r1', kind: 'donor_ticket', created_at: '2026-11-04T00:00:00Z', payload: { id: 't1' } }];
    state.me = { roles: ['it_officer'], fullName: 'Khondokar', active: true };
    expect((await (await syncGet()).json()).donorTickets).toHaveLength(0);
    state.me = { roles: ['executive'], fullName: 'Md. Abu Huraira', active: true };
    expect((await (await syncGet()).json()).donorTickets).toHaveLength(1);
  });

  it('stamps the real sender on a DM, ignoring the name in the request', async () => {
    const res = await syncPost(post({ type: 'DM', payload: { dm: { id: 'd1', senderName: 'Md. Abu Huraira', recipientName: 'Daloyar Hassan', text: 'hi' } } }));
    expect(res.status).toBe(200);
    expect(state.inserts[0].payload.senderName).toBe('Mizbah Uddin');
  });

  it('stamps the real author on comments and new posts', async () => {
    await syncPost(post({ type: 'COMMENT', payload: { postId: 'p1', comment: { id: 'c1', authorName: 'Someone Else', text: 'x' } } }));
    expect(state.inserts[0].payload.comment.authorName).toBe('Mizbah Uddin');
    await syncPost(post({ type: 'POST', payload: { id: 'p9', title: 'T', authorName: 'Dr. Orakatul Jannat' } }));
    expect(state.inserts[1].payload.authorName).toBe('Mizbah Uddin');
  });

  it("does not let an officer overwrite someone else's post, but lets the ED", async () => {
    state.rows = [{ id: 'r1', kind: 'community_post', payload: { id: 'p1', authorName: 'Daloyar Hassan', title: 'Old' } }];
    const attempt = () => syncPost(post({ type: 'POST', payload: { id: 'p1', title: 'Hacked' } }));
    expect((await attempt()).status).toBe(403);
    expect(state.updates).toHaveLength(0);

    state.me = { roles: ['executive'], fullName: 'Md. Abu Huraira', active: true };
    expect((await attempt()).status).toBe(200);
    expect(state.updates[0].payload.authorName).toBe('Daloyar Hassan'); // original author kept
  });

  it('only executive-level roles may create donor tickets', async () => {
    state.me = { roles: ['it_officer'], fullName: 'K', active: true };
    expect((await syncPost(post({ type: 'DONOR_TICKET', payload: { ticket: { id: 't' } } }))).status).toBe(403);
  });
});

describe('notifications/send', () => {
  const sms = { channel: 'sms', recipient: '+8801712345678', message: 'Hello' };

  it('refuses anyone who is not allowed to message people', async () => {
    for (const roles of [['donor'], ['board'], ['field_officer'], ['it_officer']] as AppRole[][]) {
      state.me = { roles, fullName: 'X', active: true };
      expect((await notifyPost(post(sms))).status).toBe(403);
    }
    state.me = { roles: ['project_officer'], fullName: 'X', active: false };
    expect((await notifyPost(post(sms))).status).toBe(403);
    expect(state.sent).toHaveLength(0);
  });

  it('rejects a bad phone number before sending', async () => {
    const res = await notifyPost(post({ ...sms, recipient: 'not-a-number' }));
    expect(res.status).toBe(400);
    expect(state.sent).toHaveLength(0);
  });

  it('sends for an allowed role', async () => {
    const res = await notifyPost(post(sms));
    expect(res.status).toBe(200);
    expect(state.sent).toHaveLength(1);
  });

  it('stops after 20 messages an hour per person', async () => {
    state.me = { roles: ['executive'], fullName: 'Rate Test', active: true };
    let last = 200;
    for (let i = 0; i < 25; i++) last = (await notifyPost(post(sms))).status;
    expect(last).toBe(429);
  });
});
