/**
 * Returns `next` only if it is a same-site relative path (e.g. "/projects?x=1").
 * Blocks open redirects such as "//evil.com", "/\\evil.com", "https://evil.com" or "@evil.com".
 */
export function safeRedirectPath(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next || typeof next !== 'string') return fallback;
  if (!next.startsWith('/')) return fallback;
  if (next.startsWith('//') || next.startsWith('/\\')) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}
