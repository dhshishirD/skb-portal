import { z } from 'zod';
import type { AppRole } from './database.types';
import { STAFF_ROLES } from './desks';

/**
 * Who may call which server API, and what they may send.
 *
 * Several API routes use the service-role database client, which bypasses Row Level Security.
 * "Signed in" is therefore NOT enough for them: the caller must be an ACTIVE person with the
 * right role. This file holds those rules as plain functions so they can be unit-tested.
 */

const has = (roles: readonly AppRole[], allowed: readonly AppRole[]) => roles.some((r) => allowed.includes(r));

/** Everyone who works at SKB. Donors, partners and external auditors are NOT staff. */
export const isStaff = (roles: readonly AppRole[]) => has(roles, STAFF_ROLES);

/** Roles that may send SMS / WhatsApp through SKB's messaging account. */
export const NOTIFY_ROLES: AppRole[] = ['super_admin', 'executive', 'programme_manager', 'project_officer'];
export const canSendNotifications = (roles: readonly AppRole[]) => has(roles, NOTIFY_ROLES);

// ----- notification input -----

export const notificationInputSchema = z.object({
  channel: z.enum(['sms', 'whatsapp']).default('sms'),
  recipient: z.string().trim().regex(/^\+?[0-9]{8,15}$/, 'Recipient must be a phone number (digits, optional leading +)'),
  message: z.string().trim().max(480, 'Message is too long').optional(),
  templateName: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]{1,64}$/, 'Invalid template name')
    .optional(),
  parameters: z.record(z.string().max(200)).refine((p) => Object.keys(p).length <= 20, 'Too many parameters').optional(),
});

// ----- simple in-memory rate limit (best effort per server instance) -----

export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(
    private readonly limit: number,
    private readonly windowMs: number
  ) {}

  /** true when the call is allowed (and counted). */
  allow(key: string, now: number = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }
}

/** Largest JSON body we accept for the AI narrative route. */
export const MAX_AI_CONTEXT_BYTES = 30_000;

// ----- uploads -----

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID_RE.test(v);

const startsWith = (b: Uint8Array, sig: number[], at = 0) => sig.every((v, i) => b[at + i] === v);

/**
 * The browser tells us the file type; do not trust it. For types with a fixed signature
 * (PDF, JPEG, PNG, WEBP) the first bytes must match. Other allowed types (Word, Excel, CSV)
 * have no simple signature and are accepted as declared.
 */
export function contentMatchesMime(mime: string, head: Uint8Array): boolean {
  switch (mime) {
    case 'application/pdf':
      return startsWith(head, [0x25, 0x50, 0x44, 0x46]); // %PDF
    case 'image/jpeg':
      return startsWith(head, [0xff, 0xd8, 0xff]);
    case 'image/png':
      return startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'image/webp':
      return startsWith(head, [0x52, 0x49, 0x46, 0x46]) && startsWith(head, [0x57, 0x45, 0x42, 0x50], 8); // RIFF....WEBP
    default:
      return true;
  }
}
