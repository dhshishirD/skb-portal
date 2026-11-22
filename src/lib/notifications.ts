/** In-app notifications (migration 0044). Pure helpers and the browser-side calls; the database writes the rows. */
import { createClient } from '@/lib/supabase/client';

export type NotificationKind = 'message' | 'task_assigned';

export interface NotificationRow {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  link: string;
  read_at: string | null;
  created_at: string;
}

const COLUMNS = 'id, kind, title, body, link, read_at, created_at';
export const BELL_LIMIT = 15;
export const POLL_MS = 30_000;

export const unreadCount = (rows: Pick<NotificationRow, 'read_at'>[]): number =>
  rows.reduce((n, r) => n + (r.read_at ? 0 : 1), 0);

/** The number on the bell: 1-9, then "9+" so it always fits the small badge. */
export const badgeText = (count: number): string => (count > 9 ? '9+' : String(count));

/** Tab title with the unread count in front, e.g. "(3) SKB Works Portal". */
export function titleWithCount(base: string, count: number): string {
  const clean = base.replace(/^\(\d+\+?\)\s*/, '');
  return count > 0 ? `(${count > 99 ? '99+' : count}) ${clean}` : clean;
}

/** Only links that stay inside the portal are followed. */
export const safeLink = (link: string): string => (link.startsWith('/') && !link.startsWith('//') ? link : '/notifications');

export async function loadNotifications(limit: number): Promise<NotificationRow[]> {
  const { data, error } = await (createClient() as any)
    .from('staff_notifications')
    .select(COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as NotificationRow[];
}

export async function loadUnreadTotal(): Promise<number> {
  const { count, error } = await (createClient() as any)
    .from('staff_notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function markRead(id: string): Promise<void> {
  await (createClient() as any).from('staff_notifications').update({ read_at: new Date().toISOString() }).eq('id', id).is('read_at', null);
}

export async function markAllRead(): Promise<void> {
  await (createClient() as any).from('staff_notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
}

/**
 * The unread notifications that were not in the list the last time we looked: these are the ones to announce
 * with a pop-up and a sound. The first look (seen = null) announces nothing, so old unread items stay quiet.
 */
export function newArrivals(seen: ReadonlySet<string> | null, rows: NotificationRow[]): NotificationRow[] {
  if (seen === null) return [];
  return rows.filter((r) => !r.read_at && !seen.has(r.id));
}

const MUTE_KEY = 'skb-bell-muted';
export function isMuted(): boolean {
  try { return window.localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}
export function setMuted(muted: boolean): void {
  try { window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* private mode: the choice lasts until the page closes */ }
}

/** A short, soft two-note chime. Browsers allow sound only after the person has used the page once; if not, it stays silent. */
export function playChime(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const start = ctx.currentTime;
    [[880, 0], [1175, 0.16]].forEach(([freq, offset]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.18, start + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start + offset);
      osc.stop(start + offset + 0.4);
    });
    setTimeout(() => { void ctx.close(); }, 900);
  } catch { /* no sound available: the pop-up still shows */ }
}
