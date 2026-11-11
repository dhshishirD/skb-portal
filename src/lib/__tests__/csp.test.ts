import { describe, expect, it } from 'vitest';
import { buildCsp, newNonce } from '../csp';

describe('Content-Security-Policy', () => {
  it('allows scripts only by nonce in production', () => {
    const csp = buildCsp('abc123', false);
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    const script = csp.split('; ').find((d) => d.startsWith('script-src'))!;
    expect(script).not.toContain('unsafe-inline');
    expect(script).not.toContain('unsafe-eval');
  });

  it('allows eval only in development', () => {
    const script = buildCsp('n', true).split('; ').find((d) => d.startsWith('script-src'))!;
    expect(script).toContain("'unsafe-eval'");
  });

  it('keeps the other protections', () => {
    const csp = buildCsp('n', false);
    for (const d of ["frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'"]) {
      expect(csp).toContain(d);
    }
  });

  it('makes a different nonce each time', () => {
    expect(newNonce()).not.toBe(newNonce());
  });
});
