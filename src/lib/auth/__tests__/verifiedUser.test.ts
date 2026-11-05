import { describe, it, expect } from 'vitest';
import { getVerifiedUserId } from '../verifiedUser';

const client = (result: unknown) => ({ auth: { getClaims: async () => result } }) as any;

describe('getVerifiedUserId', () => {
  it('returns the subject of verified claims', async () => {
    expect(await getVerifiedUserId(client({ data: { claims: { sub: 'user-1' } }, error: null }))).toBe('user-1');
  });
  it('returns null when there is no session', async () => {
    expect(await getVerifiedUserId(client({ data: null, error: null }))).toBeNull();
  });
  it('returns null on a verification error', async () => {
    expect(await getVerifiedUserId(client({ data: null, error: new Error('bad jwt') }))).toBeNull();
  });
  it('returns null when the subject is missing or empty', async () => {
    expect(await getVerifiedUserId(client({ data: { claims: {} }, error: null }))).toBeNull();
    expect(await getVerifiedUserId(client({ data: { claims: { sub: '' } }, error: null }))).toBeNull();
  });
  it('returns null if the library throws', async () => {
    const throwing = { auth: { getClaims: async () => { throw new Error('boom'); } } } as any;
    expect(await getVerifiedUserId(throwing)).toBeNull();
  });
});
