import { describe, it, expect, afterEach, vi } from 'vitest';
import { authCallbackUrl, getSiteUrl, normaliseBaseUrl, originFromHeaders } from '../siteUrl';
import { validatePassword } from '../auth/passwordPolicy';

const headersOf = (values: Record<string, string>) => ({
  get: (name: string) => values[name.toLowerCase()] ?? null,
});

describe('getSiteUrl (links in auth emails)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('uses NEXT_PUBLIC_SITE_URL and strips paths / trailing slashes', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.skbportal.online/');
    expect(getSiteUrl()).toBe('https://www.skbportal.online');
  });

  it('never returns the Supabase API host', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.skbportal.online');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://vfozkewdnelkgsluntex.supabase.co');
    expect(getSiteUrl(headersOf({ host: 'x.supabase.co' }))).toBe('https://www.skbportal.online');
  });

  it('falls back to the request origin when the env var is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    expect(getSiteUrl(headersOf({ 'x-forwarded-host': 'skb-portal.vercel.app', 'x-forwarded-proto': 'https' }))).toBe(
      'https://skb-portal.vercel.app'
    );
    expect(getSiteUrl(headersOf({ host: 'localhost:3000' }))).toBe('http://localhost:3000');
  });

  it('throws when nothing is available', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    expect(() => getSiteUrl(headersOf({}))).toThrow();
  });

  it('rejects non-http values', () => {
    expect(normaliseBaseUrl('javascript:alert(1)')).toBeNull();
    expect(normaliseBaseUrl('not a url')).toBeNull();
    expect(originFromHeaders(headersOf({ origin: 'https://www.skbportal.online' }))).toBe('https://www.skbportal.online');
  });

  it('builds the callback link with an encoded next path', () => {
    expect(authCallbackUrl('https://www.skbportal.online', '/set-password')).toBe(
      'https://www.skbportal.online/auth/callback?next=%2Fset-password'
    );
  });
});

describe('validatePassword (matches the Supabase policy)', () => {
  it.each(['short1A', 'alllowercase123', 'ALLUPPERCASE123', 'NoDigitsHereAtAll'])('rejects %s', (pw) => {
    expect(validatePassword(pw)).not.toBeNull();
  });

  it('accepts a compliant password', () => {
    expect(validatePassword('Kindness2026x')).toBeNull();
  });
});
