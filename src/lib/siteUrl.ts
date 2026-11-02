/**
 * Public base URL of the portal (e.g. "https://www.skbportal.online"), used for links that
 * leave the app and come back, such as password-reset and invite emails.
 *
 * Order of preference:
 *   1. NEXT_PUBLIC_SITE_URL (set in Vercel; the canonical domain)
 *   2. The request's own origin (useful for preview deployments and local dev)
 *
 * Never use NEXT_PUBLIC_SUPABASE_URL here: that is the API host, not the website, and
 * links pointing at it land users on a Supabase 404 instead of the portal.
 *
 * Supabase only honours redirect URLs that are on the project's allow-list
 * (Auth → URL Configuration), so a spoofed Host header cannot send users elsewhere.
 */
export function normaliseBaseUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function originFromHeaders(h: { get(name: string): string | null }): string | null {
  const origin = normaliseBaseUrl(h.get('origin'));
  if (origin) return origin;

  const host = h.get('x-forwarded-host') || h.get('host');
  if (!host) return null;
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  return normaliseBaseUrl(`${proto.split(',')[0].trim()}://${host.split(',')[0].trim()}`);
}

export function getSiteUrl(h?: { get(name: string): string | null }): string {
  const configured = normaliseBaseUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (configured) return configured;

  const fromRequest = h ? originFromHeaders(h) : null;
  if (fromRequest) return fromRequest;

  throw new Error('NEXT_PUBLIC_SITE_URL is not set and the request origin could not be determined.');
}

/** Absolute URL for the auth callback that finishes an email link and then opens `next`. */
export function authCallbackUrl(siteUrl: string, next: string): string {
  const url = new URL('/auth/callback', siteUrl);
  url.searchParams.set('next', next);
  return url.toString();
}
