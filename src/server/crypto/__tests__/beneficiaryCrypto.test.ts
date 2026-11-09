// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { decryptField, encryptField, encryptionReady, fingerprintNationalId } from '../beneficiaryCrypto';

// a throwaway test key (32 bytes, base64); not used anywhere real
const TEST_KEY = Buffer.alloc(32, 7).toString('base64');
const OTHER_KEY = Buffer.alloc(32, 9).toString('base64');

beforeEach(() => {
  process.env.BENEFICIARY_ENCRYPTION_KEY = TEST_KEY;
});
afterEach(() => {
  delete process.env.BENEFICIARY_ENCRYPTION_KEY;
});

describe('field encryption', () => {
  it('round-trips text, including Bangla', () => {
    for (const text of ['Test Person', 'পরীক্ষা নাম', '', '1234567890']) {
      expect(decryptField(encryptField(text))).toBe(text);
    }
  });
  it('never stores the plain text and uses a new nonce every time', () => {
    const a = encryptField('Test Person');
    const b = encryptField('Test Person');
    expect(a).not.toContain('Test Person');
    expect(a).not.toBe(b);
    expect(a).toMatch(/^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]*$/);
  });
  it('fails if the value was tampered with or the key is different', () => {
    const value = encryptField('Test Person');
    const [v, iv, tag, data] = value.split(':');
    const flipped = Buffer.from(data, 'base64');
    flipped[0] ^= 1;
    expect(() => decryptField([v, iv, tag, flipped.toString('base64')].join(':'))).toThrow();
    process.env.BENEFICIARY_ENCRYPTION_KEY = OTHER_KEY;
    expect(() => decryptField(value)).toThrow();
  });
  it('rejects an unknown format', () => {
    expect(() => decryptField('plain text')).toThrow();
    expect(() => decryptField('v2:a:b:c')).toThrow();
  });
});

describe('ID fingerprint', () => {
  it('is stable, one-way and key-dependent', () => {
    const a = fingerprintNationalId('1234567890');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(fingerprintNationalId('1234567890')).toBe(a);
    expect(fingerprintNationalId('1234567891')).not.toBe(a);
    expect(a).not.toContain('1234567890');
    process.env.BENEFICIARY_ENCRYPTION_KEY = OTHER_KEY;
    expect(fingerprintNationalId('1234567890')).not.toBe(a);
  });
});

describe('key setup', () => {
  it('is not ready without a valid key and refuses to encrypt', () => {
    delete process.env.BENEFICIARY_ENCRYPTION_KEY;
    expect(encryptionReady()).toBe(false);
    expect(() => encryptField('x')).toThrow();
    process.env.BENEFICIARY_ENCRYPTION_KEY = Buffer.alloc(16).toString('base64');
    expect(encryptionReady()).toBe(false);
    process.env.BENEFICIARY_ENCRYPTION_KEY = TEST_KEY;
    expect(encryptionReady()).toBe(true);
  });
});
