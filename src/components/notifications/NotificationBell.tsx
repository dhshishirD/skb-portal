'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, BellOff, CheckCheck, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  BELL_LIMIT, POLL_MS, badgeText, isMuted, loadNotifications, loadUnreadTotal, markAllRead, markRead, newArrivals, playChime,
  safeLink, setMuted, titleWithCount,
  type NotificationRow,
} from '@/lib/notifications';
import { NotificationItem } from './NotificationItem';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);
  const [toasts, setToasts] = useState<NotificationRow[]>([]);
  const [muted, setMutedState] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const seen = useRef<Set<string> | null>(null);
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  const mutedRef = useRef(false);
  useEffect(() => { pathRef.current = pathname; }, [pathname]);
  useEffect(() => { const m = isMuted(); mutedRef.current = m; setMutedState(m); }, []);

  const dismiss = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const refresh = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([loadNotifications(BELL_LIMIT), loadUnreadTotal()]);
      setRows(list);
      setTotal(count);
      setFailed(false);
      // announce what is new since the last look; the Community page already announces its own messages
      const onCommunity = pathRef.current.startsWith('/community');
      const fresh = newArrivals(seen.current, list).filter((n) => !(onCommunity && n.kind === 'message'));
      seen.current = new Set(list.map((n) => n.id));
      if (fresh.length > 0) {
        setToasts((t) => [...fresh.slice(0, 3), ...t].slice(0, 3));
        fresh.slice(0, 3).forEach((n) => setTimeout(() => dismiss(n.id), 8000));
        if (!mutedRef.current) playChime();
      }
    } catch {
      setFailed(true);
    }
  }, [dismiss]);

  // check now, every 30 seconds, and whenever the tab comes back into view
  useEffect(() => {
    refresh();
    // a new notification arrives at once through Supabase Realtime (the database only sends it to its owner);
    // the timer is the safety net
    const supabase = createClient();
    let later: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel('staff-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'staff_notifications' }, () => {
        clearTimeout(later);
        later = setTimeout(() => void refresh(), 300);
      })
      .subscribe();
    const timer = setInterval(() => { void refresh(); }, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      clearTimeout(later);
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  useEffect(() => {
    document.title = titleWithCount(document.title, total);
  }, [total]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const onOpenItem = (n: NotificationRow) => {
    setOpen(false);
    if (!n.read_at) {
      setRows((r) => r.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      setTotal((t) => Math.max(0, t - 1));
      markRead(n.id);
    }
  };

  const onToggleMute = () => { const next = !muted; setMutedState(next); mutedRef.current = next; setMuted(next); if (!next) playChime(); };

  const onMarkAll = async () => {
    setRows((r) => r.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
    setTotal(0);
    await markAllRead();
  };

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); if (!open) refresh(); }}
        className="relative p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        aria-label={total > 0 ? `Notifications, ${total} unread` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-[18px] text-center ring-2 ring-slate-900">
            {badgeText(total)}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-2 right-2 top-14 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 z-50 rounded-2xl border border-slate-700 bg-slate-900 text-white shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="text-sm font-bold">Notifications</span>
            <button type="button" onClick={onToggleMute} className="ml-auto mr-3 text-slate-400 hover:text-white" aria-label={muted ? 'Turn sound on' : 'Turn sound off'} title={muted ? 'Sound is off' : 'Sound is on'}>
              {muted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            </button>
            {total > 0 && (
              <button type="button" onClick={onMarkAll} className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-800">
            {failed && rows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">Could not load notifications. Please try again.</p>
            ) : rows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">You are all caught up. New messages and tasks will show here.</p>
            ) : (
              rows.map((n) => <NotificationItem key={n.id} n={n} onOpen={onOpenItem} dark />)
            )}
          </div>
          <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-800 px-4 py-2.5 text-center text-xs font-semibold text-blue-400 hover:bg-slate-800">
            See all notifications
          </Link>
        </div>
      )}

      {toasts.length > 0 && (
        <div className="fixed right-3 top-16 z-[60] flex w-[min(22rem,calc(100vw-1.5rem))] flex-col gap-2" role="status" aria-live="polite">
          {toasts.map((n) => (
            <div key={n.id} className="flex items-start gap-2 rounded-xl border border-slate-700 bg-slate-900 p-3 text-white shadow-2xl">
              <Link href={safeLink(n.link)} onClick={() => { dismiss(n.id); onOpenItem(n); }} className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{n.title}</span>
                {n.body && <span className="mt-0.5 block truncate text-xs text-slate-300">{n.body}</span>}
              </Link>
              <button type="button" onClick={() => dismiss(n.id)} className="text-slate-400 hover:text-white" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
