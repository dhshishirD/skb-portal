// @vitest-environment node
import { describe, it, expect, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import { POST as koboPOST } from '../kobotoolbox/route';
import { POST as odkPOST } from '../odk/route';

const body = JSON.stringify({ _id: 1, beneficiary_name: 'Test' });
const sign = (secret: string) => crypto.createHmac('sha256', secret).update(body).digest('hex');

const cases = [
  { name: 'KoboToolbox', handler: koboPOST, env: 'KOBO_WEBHOOK_SECRET', header: 'x-kobo-signature' },
  { name: 'ODK', handler: odkPOST, env: 'ODK_WEBHOOK_SECRET', header: 'x-odk-signature' },
] as const;

describe.each(cases)('$name webhook fails closed', ({ handler, env, header }) => {
  afterEach(() => vi.unstubAllEnvs());

  it('rejects when no secret is configured', async () => {
    vi.stubEnv(env, '');
    const res = await handler(new Request('http://x/api/webhooks', { method: 'POST', body, headers: { [header]: sign('anything') } }));
    expect(res.status).toBe(503);
  });

  it('rejects a request with no signature', async () => {
    vi.stubEnv(env, 'secret-123');
    const res = await handler(new Request('http://x/api/webhooks', { method: 'POST', body }));
    expect(res.status).toBe(401);
  });

  it('rejects a request with a wrong signature', async () => {
    vi.stubEnv(env, 'secret-123');
    const res = await handler(new Request('http://x/api/webhooks', { method: 'POST', body, headers: { [header]: sign('wrong-secret') } }));
    expect(res.status).toBe(401);
  });

  it('accepts a correctly signed request', async () => {
    vi.stubEnv(env, 'secret-123');
    const res = await handler(new Request('http://x/api/webhooks', { method: 'POST', body, headers: { [header]: sign('secret-123') } }));
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(503);
  });
});
