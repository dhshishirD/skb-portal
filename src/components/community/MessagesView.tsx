'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Loader2, MessageSquarePlus, Paperclip, Search, Send, X } from 'lucide-react';
import {
  clockTime,
  dayLabel,
  isOnline,
  previewOf,
  sameDay,
  timeAgo,
  type Attachment,
  type Conversation,
  type Person,
} from '@/lib/community/model';
import { Avatar } from './Avatar';
import { FileChip, PendingFile } from './FileChip';
import { useAttachment } from './useAttachment';

interface Props {
  me: { id: string; fullName: string };
  people: Person[];
  conversations: Conversation[];
  presence: Record<string, string>;
  now: Date;
  loading: boolean;
  selectedId: string | null;
  onSelect: (personId: string | null) => void;
  onSend: (recipientId: string, text: string, attachment: Attachment | null) => Promise<boolean>;
  onMarkRead: (ids: string[]) => void;
  notify: (message: string) => void;
}

const FIELD =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

export function MessagesView(props: Props) {
  const { people, conversations, presence, now, loading, selectedId, onSelect } = props;
  const [picking, setPicking] = useState(false);
  const selectedPerson = people.find((p) => p.id === selectedId) ?? null;
  const conversation = conversations.find((c) => c.personId === selectedId) ?? null;
  const showThread = selectedId !== null;

  return (
    <div className="grid min-h-[34rem] overflow-hidden rounded-2xl border border-slate-200 bg-white md:h-[calc(100vh-13rem)] md:grid-cols-[21rem_minmax(0,1fr)]">
      <div className={`${showThread ? 'hidden md:flex' : 'flex'} min-h-0 flex-col border-slate-200 md:border-r`}>
        {picking ? (
          <PersonPicker
            people={people.filter((p) => p.id !== props.me.id)}
            presence={presence}
            now={now}
            onPick={(id) => { setPicking(false); onSelect(id); }}
            onClose={() => setPicking(false)}
          />
        ) : (
          <ConversationList
            conversations={conversations}
            presence={presence}
            now={now}
            loading={loading}
            myId={props.me.id}
            selectedId={selectedId}
            onSelect={onSelect}
            onNew={() => setPicking(true)}
          />
        )}
      </div>

      <div className={`${showThread ? 'flex' : 'hidden md:flex'} min-h-0 min-w-0 flex-col`}>
        {selectedPerson ? (
          <Thread key={selectedPerson.id} {...props} person={selectedPerson} conversation={conversation} online={isOnline(presence[selectedPerson.id], now)} lastSeen={presence[selectedPerson.id]} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <span className="rounded-2xl bg-blue-50 p-4 text-blue-600"><MessageSquarePlus className="h-7 w-7" aria-hidden="true" /></span>
            <p className="mt-4 text-base font-semibold text-slate-900">Your messages</p>
            <p className="mt-1 max-w-xs text-sm text-slate-500">Pick a conversation on the left, or start a new one with any colleague. Only you and the other person can read it.</p>
            <button onClick={() => setPicking(true)} className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 md:hidden">New message</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationList({
  conversations, presence, now, loading, myId, selectedId, onSelect, onNew,
}: {
  conversations: Conversation[]; presence: Record<string, string>; now: Date; loading: boolean; myId: string;
  selectedId: string | null; onSelect: (id: string) => void; onNew: () => void;
}) {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? conversations.filter((c) => c.name.toLowerCase().includes(q)) : conversations;
  }, [conversations, query]);

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-900">Messages</h2>
        <button onClick={onNew} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
          <MessageSquarePlus className="h-4 w-4" aria-hidden="true" /> New
        </button>
      </div>
      <div className="px-3 pt-3">
        <label className="relative block">
          <span className="sr-only">Search conversations</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations" className={`${FIELD} py-2 pl-9`} />
        </label>
      </div>
      <ul className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {loading && conversations.length === 0 && [0, 1, 2].map((i) => (
          <li key={i} className="flex animate-pulse items-center gap-3 p-2.5" aria-hidden="true">
            <div className="h-10 w-10 rounded-full bg-slate-100" />
            <div className="flex-1 space-y-2"><div className="h-3 w-24 rounded bg-slate-100" /><div className="h-3 w-40 rounded bg-slate-100" /></div>
          </li>
        ))}
        {!loading && shown.length === 0 && (
          <li className="px-3 py-10 text-center text-sm text-slate-500">
            {query ? 'No conversation matches.' : 'No messages yet. Choose New to write to a colleague.'}
          </li>
        )}
        {shown.map((c) => (
          <li key={c.personId}>
            <button
              onClick={() => onSelect(c.personId)}
              aria-current={selectedId === c.personId}
              className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${selectedId === c.personId ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
            >
              <Avatar id={c.personId} name={c.name} online={isOnline(presence[c.personId], now)} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={`truncate text-sm ${c.unread ? 'font-semibold text-slate-900' : 'font-medium text-slate-800'}`}>{c.name}</span>
                  <time dateTime={c.last.created_at} className="shrink-0 text-xs text-slate-500">{timeAgo(c.last.created_at, now)}</time>
                </span>
                <span className="mt-0.5 flex items-center justify-between gap-2">
                  <span className={`truncate text-sm ${c.unread ? 'font-medium text-slate-800' : 'text-slate-500'}`}>{previewOf(c.last, myId)}</span>
                  {c.unread > 0 && (
                    <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-semibold tabular-nums text-white">
                      {c.unread}<span className="sr-only"> unread</span>
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function PersonPicker({ people, presence, now, onPick, onClose }: { people: Person[]; presence: Record<string, string>; now: Date; onPick: (id: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const q = query.trim().toLowerCase();
  const shown = q ? people.filter((p) => p.fullName.toLowerCase().includes(q) || (p.designation ?? '').toLowerCase().includes(q)) : people;
  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-900">New message</h2>
        <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Close">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="px-3 pt-3">
        <label className="relative block">
          <span className="sr-only">Find a colleague</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input ref={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or designation" className={`${FIELD} py-2 pl-9`} />
        </label>
      </div>
      <ul className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {shown.length === 0 && <li className="px-3 py-10 text-center text-sm text-slate-500">No colleague matches.</li>}
        {shown.map((p) => (
          <li key={p.id}>
            <button onClick={() => onPick(p.id)} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <Avatar id={p.id} name={p.fullName} online={isOnline(presence[p.id], now)} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-900">{p.fullName}</span>
                {p.designation && <span className="block truncate text-xs text-slate-500">{p.designation}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function Thread({
  me, person, conversation, online, lastSeen, now, onSend, onMarkRead, onSelect, notify,
}: Props & { person: Person; conversation: Conversation | null; online: boolean; lastSeen: string | undefined }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const { pending, pick, clear } = useAttachment(notify);
  const messages = useMemo(() => conversation?.messages ?? [], [conversation]);

  const unreadIds = useMemo(
    () => messages.filter((m) => m.recipient_id === me.id && !m.read_at).map((m) => m.id),
    [messages, me.id]
  );
  useEffect(() => {
    if (unreadIds.length > 0 && document.visibilityState === 'visible') onMarkRead(unreadIds);
  }, [unreadIds, onMarkRead]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  useEffect(() => {
    area.current?.focus();
  }, []);

  const canSend = (text.trim().length > 0 || !!pending?.attachment) && !busy && !pending?.uploading;

  async function send() {
    if (!canSend) return;
    setBusy(true);
    const ok = await onSend(person.id, text, pending?.attachment ?? null);
    setBusy(false);
    if (ok) {
      setText('');
      clear();
      if (area.current) area.current.style.height = '';
    }
  }

  // The newest message I sent, to show "Seen" under it.
  const lastMine = [...messages].reverse().find((m) => m.sender_id === me.id);

  return (
    <>
      <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <button onClick={() => onSelect(null)} className="-ml-1 rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:hidden" aria-label="Back to messages">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <Avatar id={person.id} name={person.fullName} online={online} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{person.fullName}</p>
          <p className="truncate text-xs text-slate-500">
            {online ? <span className="text-emerald-700">Online</span> : lastSeen ? `Last seen ${timeAgo(lastSeen, now)}` : person.designation ?? 'Offline'}
            {online && person.designation ? `, ${person.designation}` : ''}
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-4 py-4" role="log" aria-live="polite" aria-label={`Conversation with ${person.fullName}`}>
        {messages.length === 0 && (
          <div className="mx-auto mt-10 max-w-xs text-center">
            <Avatar id={person.id} name={person.fullName} size="lg" />
            <p className="mt-3 text-sm font-semibold text-slate-900">Start a conversation with {person.fullName}</p>
            <p className="mt-1 text-sm text-slate-500">Only the two of you can read what you write here.</p>
          </div>
        )}
        <ul className="space-y-1">
          {messages.map((m, i) => {
            const mine = m.sender_id === me.id;
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const newDay = !prev || !sameDay(prev.created_at, m.created_at);
            const lastOfRun = !next || next.sender_id !== m.sender_id || !sameDay(next.created_at, m.created_at) || new Date(next.created_at).getTime() - new Date(m.created_at).getTime() > 5 * 60_000;
            return (
              <li key={m.id}>
                {newDay && (
                  <div className="my-3 flex justify-center"><span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200">{dayLabel(m.created_at, now)}</span></div>
                )}
                <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] sm:max-w-[70%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`space-y-2 rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${mine ? 'rounded-br-md bg-blue-600 text-white' : 'rounded-bl-md bg-white text-slate-800 ring-1 ring-inset ring-slate-200'}`}>
                      {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                      {m.attachment_path && m.attachment_name && (
                        <FileChip kind="dm" id={m.id} name={m.attachment_name} size={m.attachment_size} type={m.attachment_type} tone={mine ? 'dark' : 'light'} onError={notify} />
                      )}
                    </div>
                    {lastOfRun && (
                      <p className="mt-1 px-1 text-xs text-slate-500">
                        <time dateTime={m.created_at}>{clockTime(m.created_at)}</time>
                        {mine && m.id === lastMine?.id && m.read_at && <span> · Seen</span>}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={bottom} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="border-t border-slate-100 bg-white p-3">
        {pending && <div className="mb-2"><PendingFile name={pending.name} size={pending.size} uploading={pending.uploading} onRemove={clear} /></div>}
        <div className="flex items-end gap-2">
          <input ref={fileInput} type="file" className="sr-only" tabIndex={-1} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
          <button type="button" onClick={() => fileInput.current?.click()} className="rounded-full p-2.5 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Attach a file">
            <Paperclip className="h-5 w-5" aria-hidden="true" />
          </button>
          <textarea
            ref={area}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}
            rows={1}
            maxLength={5000}
            placeholder={`Message ${person.fullName.split(' ')[0]}`}
            aria-label="Write a message"
            className={`${FIELD} max-h-36 resize-none rounded-2xl py-2.5`}
          />
          <button type="submit" disabled={!canSend} className="rounded-full bg-blue-600 p-2.5 text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300" aria-label="Send message">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Send className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
        <p className="mt-1.5 px-1 text-xs text-slate-400">Enter to send, Shift+Enter for a new line.</p>
      </form>
    </>
  );
}
