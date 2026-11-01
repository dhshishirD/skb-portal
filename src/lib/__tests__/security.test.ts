import { describe, it, expect, afterEach, vi } from 'vitest';
import { safeRedirectPath } from '../auth/safeRedirect';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  hasSupabaseConfig,
  MissingSupabaseConfigError,
} from '../supabase/env';
import { isPublicPath } from '../../middleware';

describe('safeRedirectPath (open-redirect protection)', () => {
  it('allows same-site relative paths', () => {
    expect(safeRedirectPath('/projects')).toBe('/projects');
    expect(safeRedirectPath('/donor-dashboard?section=compliance')).toBe('/donor-dashboard?section=compliance');
  });

  it.each(['//evil.com', '/\\evil.com', 'https://evil.com', '@evil.com', 'evil.com', '', null, undefined, '/x\u0000y'])(
    'rejects %s and falls back to /home',
    (value) => {
      expect(safeRedirectPath(value as string | null | undefined)).toBe('/home');
    }
  );
});

describe('Supabase env configuration (no hard-coded fallbacks)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws a clear error when the URL or key is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    expect(() => getSupabaseUrl()).toThrow(MissingSupabaseConfigError);
    expect(() => getSupabaseAnonKey()).toThrow(MissingSupabaseConfigError);
    expect(hasSupabaseConfig()).toBe(false);
  });

  it('returns configured values', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
    expect(getSupabaseUrl()).toBe('https://example.supabase.co');
    expect(getSupabaseAnonKey()).toBe('test-anon-key');
    expect(hasSupabaseConfig()).toBe(true);
  });
});

describe('middleware route classification', () => {
  it.each(['/', '/login', '/reset-password', '/set-password', '/mfa', '/api/health', '/auth/callback', '/auth/signout', '/api/webhooks/kobotoolbox', '/api/webhooks/odk'])(
    'treats %s as public',
    (path) => {
      expect(isPublicPath(path)).toBe(true);
    }
  );

  it.each([
    '/dashboard',
    '/projects',
    '/projects/123/documents',
    '/beneficiaries',
    '/finance/approvals',
    '/community',
    '/me/profile',
    '/me/report-generator',
    '/field-dashboard',
    '/field-dashboard/new-beneficiary',
    '/donor-dashboard',
    '/admin/users',
    '/procurement/vendors',
    '/api/storage/upload',
    '/api/community/sync',
    '/api/community/presence',
    '/api/ai/draft-narrative',
    '/api/notifications/send',
    '/loginx',
    '/api/webhooksx',
  ])('treats %s as private', (path) => {
    expect(isPublicPath(path)).toBe(false);
  });
});
