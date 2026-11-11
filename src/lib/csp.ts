/**
 * Content-Security-Policy, built per request so scripts can be allowed by a one-time nonce
 * instead of 'unsafe-inline'. A script injected into a page (XSS) has no nonce and is blocked.
 *
 * Styles keep 'unsafe-inline': React and Tailwind write style attributes, which a nonce cannot
 * cover, and style injection is a much smaller risk than script injection.
 * Development needs eval (React refresh) and the local Supabase stack.
 */
export function buildCsp(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://*.supabase.co https://lh3.googleusercontent.com",
    "font-src 'self' data:",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co${isDev ? ' http://127.0.0.1:54321 ws://127.0.0.1:54321' : ''}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

/** A fresh random nonce (base64) for one request. */
export function newNonce(): string {
  return btoa(crypto.randomUUID());
}
