'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Newspaper, Users, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { startPoll } from '@/lib/polling';
import * as api from '@/lib/community/client';
import {
  buildConversations,
  isOnline,
  totalUnread,
  type Attachment,
  type CommentRow,
  type DmRow,
  type Person,
  type PostRow,
} from '@/lib/community/model';
import { FeedView, type FeedActions } from './FeedView';
import { MessagesView } from './MessagesView';
import { PeopleView } from './PeopleView';

type Tab = 'feed' | 'messages' | 'people';

export interface CommunityMe {
  id: string;
  fullName: string;
  designation: string | null;
  canModerate: boolean;
}

const TABS: Array<{ id: Tab; label: string; icon: typeof Newspaper }> = [
  { id: 'feed', label: 'Feed', icon: Newspaper },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'people', label: 'People', icon: Users },
];

export function CommunityApp({ me, people }: { me: CommunityMe; people: Person[] }) {
  const [tab, setTab] = useState<Tab>('feed');
  const [limit, setLimit] = useState(api.PAGE_SIZE);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<DmRow[]>([]);
  const [presence, setPresence] = useState<Record<string, string>>({});
  const [feedLoading, setFeedLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const limitRef = useRef(limit);
  limitRef.current = limit;
  const knownMessageIds = useRef<Set<string> | null>(null);
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);

  // ---------- loading ----------

  const refreshFeed = useCallback(async () => {
    const res = await api.loadPosts(limitRef.current);
    if (!res.ok) {
      setLoadError(res.error);
      setFeedLoading(false);
      return;
    }
    setLoadError(null);
    setPosts(res.data);
    const ids = res.data.map((p) => p.id);
    const [c, l] = await Promise.all([api.loadComments(ids), api.loadLikesOf(me.id, ids)]);
    if (c.ok) setComments(c.data);
    if (l.ok) setLiked(new Set(l.data));
    setFeedLoading(false);
  }, [me.id]);

  const refreshMessages = useCallback(async () => {
    const res = await api.loadMessages();
    if (!res.ok) {
      setLoadError(res.error);
      setMessagesLoading(false);
      return;
    }
    setLoadError(null);
    // Tell the person about messages that arrived since the last load (not their own, not the open chat).
    const known = knownMessageIds.current;
    if (known) {
      const fresh = res.data.filter((m) => m.recipient_id === me.id && !known.has(m.id));
      const latest = fresh[0];
      const looking = tabRef.current === 'messages' && selectedRef.current === latest?.sender_id && document.visibilityState === 'visible';
      if (latest && !looking) notify(`New message from ${latest.sender_name}`);
    }
    knownMessageIds.current = new Set(res.data.map((m) => m.id));
    setMessages(res.data);
    setMessagesLoading(false);
  }, [me.id, notify]);

  const refreshPresence = useCallback(async () => {
    const res = await api.loadPresence();
    if (res.ok) setPresence(res.data);
  }, []);

  useEffect(() => {
    void refreshFeed();
    void refreshMessages();
    void refreshPresence();
  }, [refreshFeed, refreshMessages, refreshPresence]);

  // New posts, comments and messages arrive at once through Supabase Realtime. Polling is the safety net.
  useEffect(() => {
    const supabase = createClient();
    const timers: Record<string, ReturnType<typeof setTimeout>> = {};
    const later = (key: string, fn: () => void) => {
      clearTimeout(timers[key]);
      timers[key] = setTimeout(fn, 250);
    };
    const channel = supabase
      .channel(`community-${me.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, () => later('feed', () => void refreshFeed()))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_comments' }, () => later('feed', () => void refreshFeed()))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, () => later('dm', () => void refreshMessages()))
      .subscribe();
    const stops = [
      startPoll(() => Promise.all([refreshFeed(), refreshMessages()]), 30_000, { immediate: false }),
      startPoll(refreshPresence, 30_000, { immediate: false }),
      startPoll(() => api.touchPresence(), 60_000),
      startPoll(() => setNow(new Date()), 30_000, { immediate: false }),
    ];
    return () => {
      Object.values(timers).forEach(clearTimeout);
      void supabase.removeChannel(channel);
      stops.forEach((s) => s());
    };
  }, [me.id, refreshFeed, refreshMessages, refreshPresence]);

  // ---------- derived ----------

  const others = useMemo(() => people.filter((p) => p.id !== me.id), [people, me.id]);
  const conversations = useMemo(() => buildConversations(messages, me.id, people), [messages, me.id, people]);
  const unread = totalUnread(conversations);
  const online = useMemo(() => others.filter((p) => isOnline(presence[p.id], now)), [others, presence, now]);

  useEffect(() => {
    document.title = `${unread > 0 ? `(${unread}) ` : ''}Community | SKB Works Portal`;
  }, [unread]);

  // ---------- feed actions ----------

  const feedActions: FeedActions = useMemo(
    () => ({
      notify,
      async createPost(input) {
        const res = await api.createPost(input);
        if (!res.ok) { notify(res.error); return false; }
        notify('Posted');
        await refreshFeed();
        return true;
      },
      async editPost(id, input) {
        const res = await api.updatePost(id, input);
        if (!res.ok) { notify(res.error); return false; }
        notify('Changes saved');
        await refreshFeed();
        return true;
      },
      async deletePost(id) {
        const res = await api.deletePost(id);
        if (!res.ok) { notify(res.error); return; }
        setPosts((list) => list.filter((p) => p.id !== id));
        notify('Post deleted');
      },
      async togglePin(post) {
        const res = await api.setPinned(post.id, !post.pinned);
        if (!res.ok) { notify(res.error); return; }
        notify(post.pinned ? 'Post unpinned' : 'Post pinned to the top');
        await refreshFeed();
      },
      async toggleLike(post) {
        const wasLiked = liked.has(post.id);
        // Show the change at once; undo it if the database refuses.
        setLiked((s) => { const n = new Set(s); if (wasLiked) n.delete(post.id); else n.add(post.id); return n; });
        setPosts((list) => list.map((p) => (p.id === post.id ? { ...p, likes_count: Math.max(0, p.likes_count + (wasLiked ? -1 : 1)) } : p)));
        const res = await api.setLiked(post.id, me.id, !wasLiked);
        if (!res.ok) {
          notify(res.error);
          await refreshFeed();
        }
      },
      async addComment(postId, text) {
        const res = await api.addComment(postId, text);
        if (!res.ok) { notify(res.error); return false; }
        await refreshFeed();
        return true;
      },
      async deleteComment(id) {
        const res = await api.deleteComment(id);
        if (!res.ok) { notify(res.error); return; }
        setComments((list) => list.filter((c) => c.id !== id));
      },
      async loadMore() {
        const next = limitRef.current + api.PAGE_SIZE;
        limitRef.current = next;
        setLimit(next);
        await refreshFeed();
      },
    }),
    [liked, me.id, notify, refreshFeed]
  );

  // ---------- message actions ----------

  const sendMessage = useCallback(
    async (recipientId: string, text: string, attachment: Attachment | null) => {
      const res = await api.sendMessage(recipientId, text, attachment);
      if (!res.ok) { notify(res.error); return false; }
      await refreshMessages();
      return true;
    },
    [notify, refreshMessages]
  );

  const markRead = useCallback((ids: string[]) => {
    const stamp = new Date().toISOString();
    setMessages((list) => list.map((m) => (ids.includes(m.id) ? { ...m, read_at: m.read_at ?? stamp } : m)));
    void api.markRead(ids);
  }, []);

  const openChat = useCallback((personId: string | null) => {
    setSelectedId(personId);
    if (personId) setTab('messages');
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Community</h1>
          <p className="mt-1 text-sm text-slate-600">Updates, questions and private messages for SKB staff.</p>
        </div>
        <nav aria-label="Community sections" className="inline-flex self-start rounded-xl bg-slate-200/70 p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={`relative inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
              {id === 'messages' && unread > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-semibold tabular-nums text-white">
                  {unread}<span className="sr-only"> unread</span>
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {loadError && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>{loadError}</span>
          <button onClick={() => { void refreshFeed(); void refreshMessages(); }} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-medium ring-1 ring-inset ring-amber-200 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
          </button>
        </div>
      )}

      {tab === 'feed' && (
        <FeedView
          me={me}
          posts={posts}
          comments={comments}
          likedIds={liked}
          online={online}
          hasMore={posts.length >= limit}
          loading={feedLoading}
          now={now}
          actions={feedActions}
          onOpenChat={openChat}
        />
      )}
      {tab === 'messages' && (
        <MessagesView
          me={me}
          people={people}
          conversations={conversations}
          presence={presence}
          now={now}
          loading={messagesLoading}
          selectedId={selectedId}
          onSelect={openChat}
          onSend={sendMessage}
          onMarkRead={markRead}
          notify={notify}
        />
      )}
      {tab === 'people' && <PeopleView me={me} people={people} presence={presence} now={now} onMessage={openChat} />}

      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        {toast && <p className="pointer-events-auto rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</p>}
      </div>
    </div>
  );
}
