'use client';

import Link from 'next/link';
import { ClipboardList, MessageSquare } from 'lucide-react';
import { timeAgo } from '@/lib/community/model';
import { safeLink, type NotificationRow } from '@/lib/notifications';

export function NotificationItem({ n, onOpen, dark = false }: { n: NotificationRow; onOpen: (n: NotificationRow) => void; dark?: boolean }) {
  const Icon = n.kind === 'task_assigned' ? ClipboardList : MessageSquare;
  const unread = !n.read_at;
  const tone = n.kind === 'task_assigned' ? 'bg-amber-500/15 text-amber-500' : 'bg-blue-500/15 text-blue-500';
  return (
    <Link
      href={safeLink(n.link)}
      onClick={() => onOpen(n)}
      className={`flex gap-3 px-4 py-3 transition ${dark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'} ${unread ? (dark ? 'bg-slate-800/60' : 'bg-blue-50/60') : ''}`}
    >
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm ${unread ? 'font-semibold' : 'font-medium'} ${dark ? 'text-slate-100' : 'text-slate-900'}`}>{n.title}</span>
        {n.body && <span className={`mt-0.5 block truncate text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{n.body}</span>}
        <span className={`mt-1 block text-[11px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{timeAgo(n.created_at)}</span>
      </span>
      {unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-label="Unread" />}
    </Link>
  );
}
