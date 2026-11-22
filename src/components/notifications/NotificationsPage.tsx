'use client';

import { useEffect, useState } from 'react';
import { CheckCheck } from 'lucide-react';
import { loadNotifications, markAllRead, markRead, unreadCount, type NotificationRow } from '@/lib/notifications';
import { NotificationItem } from './NotificationItem';

export function NotificationsPage() {
  const [rows, setRows] = useState<NotificationRow[] | null>(null);
  const [error, setError] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);

  useEffect(() => {
    loadNotifications(100).then(setRows).catch(() => setError(true));
  }, []);

  const unread = rows ? unreadCount(rows) : 0;
  const shown = (rows ?? []).filter((r) => !unreadOnly || !r.read_at);

  const onOpen = (n: NotificationRow) => {
    if (n.read_at) return;
    setRows((r) => (r ?? []).map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
    markRead(n.id);
  };
  const onMarkAll = async () => {
    setRows((r) => (r ?? []).map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
    await markAllRead();
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500">{unread > 0 ? `${unread} unread` : 'You are all caught up'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setUnreadOnly((v) => !v)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${unreadOnly ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>
            Unread only
          </button>
          {unread > 0 && (
            <button type="button" onClick={onMarkAll} className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
              <CheckCheck className="h-3.5 w-3.5" /> Mark all as read
            </button>
          )}
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
        {error ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">Could not load notifications. Please refresh the page.</p>
        ) : rows === null ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">{unreadOnly ? 'No unread notifications.' : 'Nothing here yet. New messages and assigned tasks will show up here.'}</p>
        ) : (
          shown.map((n) => <NotificationItem key={n.id} n={n} onOpen={onOpen} />)
        )}
      </div>
      <p className="mt-3 text-xs text-slate-400">Showing your latest 100 notifications.</p>
    </div>
  );
}
