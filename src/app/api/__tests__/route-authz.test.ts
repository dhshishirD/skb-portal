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

import { POST as notifyPost } from '../notifications/send/route';

const post = (body: unknown) => new Request('http://x/api', { method: 'POST', body: JSON.stringify(body) });

beforeEach(() => {
  state.me = { roles: ['project_officer'], fullName: 'Mizbah Uddin', active: true };
  state.rows = [];
  state.inserts = [];
  state.updates = [];
  state.sent = [];
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
