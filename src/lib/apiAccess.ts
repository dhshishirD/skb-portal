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

/** Roles that may see donor tickets in the community sync feed. */
export const DONOR_TICKET_ROLES: AppRole[] = ['super_admin', 'executive', 'programme_manager', 'project_officer'];
export const canSeeDonorTickets = (roles: readonly AppRole[]) => has(roles, DONOR_TICKET_ROLES);

/** Roles that may remove or overwrite another person's community post. */
export const canModerateCommunity = (roles: readonly AppRole[]) => has(roles, ['super_admin', 'executive']);

// ----- names (community messages are still keyed by display name; see PR notes) -----

/** "Md. Abu Huraira (Executive Director)" -> "md. abu huraira" */
export function normalizeName(name: unknown): string {
  return String(name ?? '')
    .split('(')[0]
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export const sameName = (a: unknown, b: unknown) => {
  const x = normalizeName(a);
  return x !== '' && x === normalizeName(b);
};

/** A direct message is private to the sender and the recipient. */
export function canReadDirectMessage(myName: string, dm: { senderName?: unknown; recipientName?: unknown }): boolean {
  return sameName(myName, dm.senderName) || sameName(myName, dm.recipientName);
}

// ----- community attachments -----

/** Files are stored inline in the message as a data URL. Above this size they are not sent with the feed. */
export const INLINE_ATTACHMENT_FEED_LIMIT = 20_000;
/** The largest inline file the feed will accept (characters of the data URL, about 1.5 MB of file). */
export const INLINE_ATTACHMENT_MAX = 2_000_000;

/**
 * Returns the payload with a large inline attachment replaced by a marker (name and size are kept),
 * so the feed that every user polls stays small. The file is fetched on demand when it is opened.
 */
export function stripLargeAttachment<T extends object>(payload: T): T {
  const att = (payload as { attachment?: unknown } | null)?.attachment as { dataUrl?: unknown } | undefined | null;
  if (!att || typeof att !== 'object' || typeof att.dataUrl !== 'string') return payload;
  if (att.dataUrl.length <= INLINE_ATTACHMENT_FEED_LIMIT) return payload;
  const { dataUrl: _omitted, ...rest } = att as Record<string, unknown>;
  return { ...payload, attachment: { ...rest, remote: true } };
}

/** True when the inline attachment is bigger than the feed accepts. */
export function attachmentTooLarge(payload: { attachment?: unknown } | null | undefined): boolean {
  const att = payload?.attachment as { dataUrl?: unknown } | undefined | null;
  return typeof att?.dataUrl === 'string' && att.dataUrl.length > INLINE_ATTACHMENT_MAX;
}

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
