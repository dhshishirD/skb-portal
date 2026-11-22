'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import {
  BELL_LIMIT, POLL_MS, badgeText, loadNotifications, loadUnreadTotal, markAllRead, markRead, titleWithCount,
  type NotificationRow,
} from '@/lib/notifications';
import { NotificationItem } from './NotificationItem';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([loadNotifications(BELL_LIMIT), loadUnreadTotal()]);
      setRows(list);
      setTotal(count);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  // check now, every 30 seconds, and whenever the tab comes back into view
  useEffect(() => {
    refresh();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
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
    </div>
  );
}
