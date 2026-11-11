'use client';

import { useMemo, useState } from 'react';
import { MessageSquare, Search } from 'lucide-react';
import { isOnline, timeAgo, type Person } from '@/lib/community/model';
import { Avatar } from './Avatar';

export function PeopleView({
  me, people, presence, now, onMessage,
}: {
  me: { id: string };
  people: Person[];
  presence: Record<string, string>;
  now: Date;
  onMessage: (personId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? people.filter((p) => p.fullName.toLowerCase().includes(q) || (p.designation ?? '').toLowerCase().includes(q)) : people;
  }, [people, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-sm text-slate-600">{people.length} {people.length === 1 ? 'person' : 'people'} at SKB</p>
        <label className="relative block sm:w-72">
          <span className="sr-only">Search people</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or designation" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </label>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="text-base font-semibold text-slate-900">{people.length === 0 ? 'No colleagues to show yet' : 'No one matches your search'}</p>
          <p className="mt-1 text-sm text-slate-500">{people.length === 0 ? 'People appear here once the administrator adds them and gives them a role.' : 'Check the spelling or try the designation.'}</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => {
            const online = isOnline(presence[p.id], now);
            const self = p.id === me.id;
            return (
              <li key={p.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <Avatar id={p.id} name={p.fullName} size="lg" online={online} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {p.fullName}
                    {self && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">You</span>}
                  </p>
                  {p.designation && <p className="truncate text-sm text-slate-600">{p.designation}</p>}
                  <p className={`mt-0.5 text-xs ${online ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {online ? 'Online' : presence[p.id] ? `Last seen ${timeAgo(presence[p.id], now)}` : 'Not seen yet'}
                  </p>
                </div>
                {!self && (
                  <button onClick={() => onMessage(p.id)} className="shrink-0 rounded-full p-2.5 text-blue-700 ring-1 ring-inset ring-blue-100 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label={`Message ${p.fullName}`}>
                    <MessageSquare className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
