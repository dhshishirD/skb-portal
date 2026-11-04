import { describe, it, expect } from 'vitest';
import {
  RateLimiter,
  canModerateCommunity,
  canReadDirectMessage,
  canSeeDonorTickets,
  canSendNotifications,
  contentMatchesMime,
  isStaff,
  isUuid,
  normalizeName,
  notificationInputSchema,
  sameName,
} from '../apiAccess';
import type { AppRole } from '../database.types';

const NON_STAFF: AppRole[][] = [['donor'], ['partner'], ['auditor'], []];

describe('role rules', () => {
  it('treats every SKB desk as staff, but not donors, partners, auditors or no role', () => {
    for (const r of ['executive', 'super_admin', 'board', 'legal_officer', 'it_officer', 'project_officer', 'field_officer'] as AppRole[]) {
      expect(isStaff([r])).toBe(true);
    }
    for (const roles of NON_STAFF) expect(isStaff(roles)).toBe(false);
  });

  it('lets only four roles send SMS / WhatsApp', () => {
    expect(canSendNotifications(['executive'])).toBe(true);
    expect(canSendNotifications(['project_officer'])).toBe(true);
    for (const r of ['board', 'legal_officer', 'it_officer', 'field_officer', 'donor', 'partner'] as AppRole[]) {
      expect(canSendNotifications([r])).toBe(false);
    }
  });

  it('keeps donor tickets away from oversight and IT roles', () => {
    expect(canSeeDonorTickets(['executive'])).toBe(true);
    expect(canSeeDonorTickets(['it_officer'])).toBe(false);
    expect(canSeeDonorTickets(['board'])).toBe(false);
    expect(canSeeDonorTickets(['donor'])).toBe(false);
  });

  it('lets only the ED and Super Admin moderate', () => {
    expect(canModerateCommunity(['executive'])).toBe(true);
    expect(canModerateCommunity(['super_admin'])).toBe(true);
    expect(canModerateCommunity(['project_officer'])).toBe(false);
  });
});

describe('names and direct messages', () => {
  it('normalizes titles in brackets, spacing and case', () => {
    expect(normalizeName('  Md.  Abu Huraira (Executive Director) ')).toBe('md. abu huraira');
    expect(normalizeName(undefined)).toBe('');
  });

  it('never matches an empty name', () => {
    expect(sameName('', '')).toBe(false);
    expect(sameName(null, undefined)).toBe(false);
  });

  it('shows a direct message only to its sender and recipient', () => {
    const dm = { senderName: 'Daloyar Hassan', recipientName: 'Mizbah Uddin (PO)' };
    expect(canReadDirectMessage('Daloyar Hassan', dm)).toBe(true);
    expect(canReadDirectMessage('mizbah uddin', dm)).toBe(true);
    expect(canReadDirectMessage('MD. Emran', dm)).toBe(false);
    expect(canReadDirectMessage('', dm)).toBe(false);
  });
});

describe('notificationInputSchema', () => {
  const ok = { channel: 'sms', recipient: '+8801712345678', message: 'Hello' };
  it('accepts a normal SMS', () => {
    expect(notificationInputSchema.safeParse(ok).success).toBe(true);
  });
  it.each(['', 'abc', '12345', '+88 017 123', '0171234567890123456', "+880'; DROP"])('rejects recipient %j', (recipient) => {
    expect(notificationInputSchema.safeParse({ ...ok, recipient }).success).toBe(false);
  });
  it('rejects an unknown channel, long messages and odd template names', () => {
    expect(notificationInputSchema.safeParse({ ...ok, channel: 'email' }).success).toBe(false);
    expect(notificationInputSchema.safeParse({ ...ok, message: 'x'.repeat(481) }).success).toBe(false);
    expect(notificationInputSchema.safeParse({ ...ok, templateName: '../x' }).success).toBe(false);
  });
});

describe('RateLimiter', () => {
  it('blocks after the limit and frees up after the window', () => {
    const rl = new RateLimiter(2, 1000);
    expect(rl.allow('u', 0)).toBe(true);
    expect(rl.allow('u', 10)).toBe(true);
    expect(rl.allow('u', 20)).toBe(false);
    expect(rl.allow('other', 20)).toBe(true);
    expect(rl.allow('u', 1500)).toBe(true);
  });
});

describe('upload checks', () => {
  const bytes = (...b: number[]) => Uint8Array.from([...b, ...new Array(16).fill(0)]).subarray(0, 16);
  it('accepts matching signatures', () => {
    expect(contentMatchesMime('application/pdf', bytes(0x25, 0x50, 0x44, 0x46))).toBe(true);
    expect(contentMatchesMime('image/jpeg', bytes(0xff, 0xd8, 0xff, 0xe0))).toBe(true);
    expect(contentMatchesMime('image/png', bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe(true);
    const webp = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0, 0, 0, 0]);
    expect(contentMatchesMime('image/webp', webp)).toBe(true);
  });
  it('refuses a script renamed to .pdf or .png', () => {
    const script = new TextEncoder().encode('<script>alert(1)</script>').subarray(0, 16);
    expect(contentMatchesMime('application/pdf', script)).toBe(false);
    expect(contentMatchesMime('image/png', script)).toBe(false);
    expect(contentMatchesMime('image/webp', script)).toBe(false);
  });
  it('only accepts real UUIDs as project ids', () => {
    expect(isUuid('11111111-1111-4111-8111-111111111111')).toBe(true);
    expect(isUuid('GENERAL')).toBe(false);
    expect(isUuid('../../etc')).toBe(false);
  });
});
