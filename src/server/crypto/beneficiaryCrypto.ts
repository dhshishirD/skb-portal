import 'server-only';
import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from 'node:crypto';

/**
 * Field-level encryption for beneficiary names, national ID numbers and phone numbers.
 *
 * - AES-256-GCM, a fresh random 12-byte nonce for every value; the result is "v1:<nonce>:<tag>:<data>"
 *   (base64). "v1" lets us rotate to a new key later without breaking old rows.
 * - The key comes from the BENEFICIARY_ENCRYPTION_KEY environment variable (32 random bytes, base64).
 *   It is NEVER stored in the database or in the code. Lose it and the data cannot be read.
 * - Two sub-keys are derived from it (HKDF): one to encrypt, one to fingerprint ID numbers
 *   (HMAC-SHA256) so duplicates can be found without the number being readable.
 * - This file runs on the server only.
 */

const VERSION = 'v1';
const ENV_NAME = 'BENEFICIARY_ENCRYPTION_KEY';

export class EncryptionKeyError extends Error {
  constructor(message = 'The encryption key is not set up on the server.') {
    super(message);
    this.name = 'EncryptionKeyError';
  }
}

function masterKey(): Buffer {
  const raw = process.env[ENV_NAME];
  if (!raw) throw new EncryptionKeyError();
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new EncryptionKeyError('The encryption key must be 32 bytes (base64).');
  return key;
}

function subKey(info: string): Buffer {
  return Buffer.from(hkdfSync('sha256', masterKey(), Buffer.alloc(0), info, 32));
}

/** True when the key is present and valid (the screen uses this to switch registration on or off). */
export function encryptionReady(): boolean {
  try {
    masterKey();
    return true;
  } catch {
    return false;
  }
}

export function encryptField(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', subKey('beneficiary-encrypt-v1'), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [VERSION, iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':');
}

export function decryptField(value: string): string {
  const [version, iv, tag, data] = value.split(':');
  if (version !== VERSION || !iv || !tag || data === undefined) throw new Error('Unsupported encrypted value.');
  const decipher = createDecipheriv('aes-256-gcm', subKey('beneficiary-encrypt-v1'), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
}

/** One-way fingerprint of a normalised ID number (digits only). Same number in, same fingerprint out. */
export function fingerprintNationalId(digits: string): string {
  return createHmac('sha256', subKey('beneficiary-nid-fingerprint-v1')).update(digits).digest('hex');
}
