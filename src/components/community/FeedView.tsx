'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Pin,
  PinOff,
  Search,
  Send,
  Trash2,
  Loader2,
} from 'lucide-react';
import {
  POST_CATEGORIES,
  categoryLabel,
  filterPosts,
  timeAgo,
  type CommentRow,
  type Person,
  type PostRow,
} from '@/lib/community/model';
import { Avatar } from './Avatar';
import { FileChip, PendingFile } from './FileChip';
import { useAttachment } from './useAttachment';

export interface FeedActions {
  createPost: (input: { category: string; title: string; content: string; attachment: import('@/lib/community/model').Attachment | null }) => Promise<boolean>;
  editPost: (id: string, input: { category: string; title: string; content: string }) => Promise<boolean>;
  deletePost: (id: string) => Promise<void>;
  togglePin: (post: PostRow) => Promise<void>;
  toggleLike: (post: PostRow) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<boolean>;
  deleteComment: (id: string) => Promise<void>;
  loadMore: () => Promise<void>;
  notify: (message: string) => void;
}

interface Props {
  me: { id: string; fullName: string; designation: string | null; canModerate: boolean };
  posts: PostRow[];
  comments: CommentRow[];
  likedIds: Set<string>;
  online: Person[];
  hasMore: boolean;
  loading: boolean;
  now: Date;
  actions: FeedActions;
  onOpenChat: (personId: string) => void;
}

const FIELD =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

export function FeedView({ me, posts, comments, likedIds, online, hasMore, loading, now, actions, onOpenChat }: Props) {
  const [category, setCategory] = useState<string>('ALL');
  const [query, setQuery] = useState('');
  const visible = useMemo(() => filterPosts(posts, { category, query }), [posts, category, query]);
  const filtering = category !== 'ALL' || query.trim() !== '';

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0 space-y-4">
        <Composer me={me} actions={actions} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-1.5 sm:flex-1" role="tablist" aria-label="Post category">
            {[{ value: 'ALL', label: 'All' }, ...POST_CATEGORIES].map((c) => (
              <button
                key={c.value}
                role="tab"
                aria-selected={category === c.value}
                onClick={() => setCategory(c.value)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  category === c.value ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <label className="relative block sm:w-52">
            <span className="sr-only">Search posts</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search posts" className={`${FIELD} pl-9`} />
          </label>
        </div>

        {loading && posts.length === 0 ? (
          <FeedSkeleton />
        ) : visible.length === 0 ? (
          <EmptyFeed filtering={filtering} onClear={() => { setCategory('ALL'); setQuery(''); }} />
        ) : (
          <ul className="space-y-4">
            {visible.map((post) => (
              <li key={post.id}>
                <PostCard
                  post={post}
                  comments={comments.filter((c) => c.post_id === post.id)}
                  liked={likedIds.has(post.id)}
                  me={me}
                  now={now}
                  actions={actions}
                />
              </li>
            ))}
          </ul>
        )}

        {hasMore && !filtering && (
          <div className="flex justify-center pt-1">
            <LoadMore onClick={actions.loadMore} />
          </div>
        )}
      </div>

      <aside className="hidden space-y-4 lg:sticky lg:top-24 lg:block lg:self-start">
        <section className="rounded-2xl border border-slate-200 bg-white p-4" aria-labelledby="online-heading">
          <h2 id="online-heading" className="text-sm font-semibold text-slate-900">
            Online now
            <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">{online.length}</span>
          </h2>
          {online.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nobody else is online right now.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {online.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => onOpenChat(p.id)}
                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    title={`Message ${p.fullName}`}
                  >
                    <Avatar id={p.id} name={p.fullName} size="sm" online />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900">{p.fullName}</span>
                      {p.designation && <span className="block truncate text-xs text-slate-500">{p.designation}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

function LoadMore({ onClick }: { onClick: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => { setBusy(true); await onClick(); setBusy(false); }}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60"
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      Show older posts
    </button>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {[0, 1].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-100" />
            <div className="space-y-2">
              <div className="h-3 w-32 rounded bg-slate-100" />
              <div className="h-3 w-20 rounded bg-slate-100" />
            </div>
          </div>
          <div className="mt-4 h-4 w-2/3 rounded bg-slate-100" />
          <div className="mt-3 h-3 w-full rounded bg-slate-100" />
          <div className="mt-2 h-3 w-5/6 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function EmptyFeed({ filtering, onClear }: { filtering: boolean; onClear: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-base font-semibold text-slate-900">{filtering ? 'No posts match' : 'No posts yet'}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
        {filtering
          ? 'Try another category or different words.'
          : 'Share a field update, a notice or a question with the team. It appears here for every staff member.'}
      </p>
      {filtering && (
        <button onClick={onClear} className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
          Show all posts
        </button>
      )}
    </div>
  );
}

// ---------- composer ----------

function Composer({ me, actions }: { me: Props['me']; actions: FeedActions }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>('General');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const { pending, pick, clear } = useAttachment(actions.notify);

  useEffect(() => {
    if (open) titleInput.current?.focus();
  }, [open]);

  const canPost = title.trim().length > 0 && content.trim().length > 0 && !busy && !pending?.uploading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canPost) return;
    setBusy(true);
    const ok = await actions.createPost({ category, title, content, attachment: pending?.attachment ?? null });
    setBusy(false);
    if (ok) {
      setTitle('');
      setContent('');
      setCategory('General');
      clear();
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Avatar id={me.id} name={me.fullName} />
        <span className="flex-1 rounded-full bg-slate-50 px-4 py-2.5 text-sm text-slate-500">Share an update with the team</span>
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar id={me.id} name={me.fullName} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{me.fullName}</p>
          {me.designation && <p className="truncate text-xs text-slate-500">{me.designation}</p>}
        </div>
      </div>

      <fieldset>
        <legend className="sr-only">Category</legend>
        <div className="flex flex-wrap gap-1.5">
          {POST_CATEGORIES.map((c) => (
            <label
              key={c.value}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition focus-within:ring-2 focus-within:ring-blue-500 ${
                category === c.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <input type="radio" name="category" value={c.value} checked={category === c.value} onChange={() => setCategory(c.value)} className="sr-only" />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      <input
        ref={titleInput}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={300}
        placeholder="Title, for example: Distribution at Ukhiya completed"
        className={FIELD}
        aria-label="Title"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={5}
        maxLength={20000}
        placeholder="What should the team know?"
        className={`${FIELD} resize-y`}
        aria-label="Message"
      />
      {pending && <PendingFile name={pending.name} size={pending.size} uploading={pending.uploading} onRemove={clear} />}

      <div className="flex items-center justify-between gap-3">
        <div>
          <input ref={fileInput} type="file" className="sr-only" tabIndex={-1} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
          <button type="button" onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <Paperclip className="h-4 w-4" aria-hidden="true" />
            Attach file
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            Cancel
          </button>
          <button type="submit" disabled={!canPost} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            Post
          </button>
        </div>
      </div>
    </form>
  );
}

// ---------- one post ----------

function PostCard({
  post, comments, liked, me, now, actions,
}: {
  post: PostRow;
  comments: CommentRow[];
  liked: boolean;
  me: Props['me'];
  now: Date;
  actions: FeedActions;
}) {
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const mine = post.author_id === me.id;
  const long = post.content.length > 480 || post.content.split('\n').length > 8;

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menu]);

  return (
    <article className={`rounded-2xl border bg-white p-5 ${post.pinned ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-200'}`} aria-label={post.title}>
      {post.pinned && (
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
          <Pin className="h-3.5 w-3.5" aria-hidden="true" /> Pinned by management
        </p>
      )}
      <header className="flex items-start gap-3">
        <Avatar id={post.author_id} name={post.author_name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{post.author_name}</p>
          <p className="truncate text-xs text-slate-500">
            {post.author_role}, <time dateTime={post.created_at}>{timeAgo(post.created_at, now)}</time>
            {post.edited_at && <span title="This post was edited"> (edited)</span>}
          </p>
        </div>
        <span className="hidden shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline">{categoryLabel(post.category)}</span>
        {(mine || me.canModerate) && (
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setMenu((v) => !v); }}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Post options"
              aria-expanded={menu}
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            </button>
            {menu && (
              <div role="menu" className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                {mine && (
                  <MenuItem icon={<Pencil className="h-4 w-4" />} onClick={() => { setEditing(true); setMenu(false); }}>Edit post</MenuItem>
                )}
                {me.canModerate && (
                  <MenuItem icon={post.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />} onClick={() => { void actions.togglePin(post); setMenu(false); }}>
                    {post.pinned ? 'Unpin' : 'Pin to top'}
                  </MenuItem>
                )}
                <MenuItem danger icon={<Trash2 className="h-4 w-4" />} onClick={() => { setConfirmDelete(true); setMenu(false); }}>Delete post</MenuItem>
              </div>
            )}
          </div>
        )}
      </header>

      {confirmDelete && (
        <div role="alertdialog" aria-label="Delete this post" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-900">
          <span>Delete this post and its comments? This cannot be undone.</span>
          <span className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} className="rounded-lg px-3 py-1.5 font-medium hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">Keep</button>
            <button onClick={() => void actions.deletePost(post.id)} className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2">Delete post</button>
          </span>
        </div>
      )}

      {editing ? (
        <EditPost post={post} onCancel={() => setEditing(false)} onSave={async (v) => { const ok = await actions.editPost(post.id, v); if (ok) setEditing(false); }} />
      ) : (
        <div className="mt-4">
          <h3 className="text-base font-semibold leading-snug text-slate-900">{post.title}</h3>
          <p className={`mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 ${long && !expanded ? 'line-clamp-6' : ''}`}>{post.content}</p>
          {long && (
            <button onClick={() => setExpanded((v) => !v)} className="mt-1 text-sm font-medium text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
          {post.attachment_path && post.attachment_name && (
            <div className="mt-3">
              <FileChip kind="post" id={post.id} name={post.attachment_name} size={post.attachment_size} type={post.attachment_type} onError={actions.notify} />
            </div>
          )}
        </div>
      )}

      <footer className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3">
        <button
          onClick={() => void actions.toggleLike(post)}
          aria-pressed={liked}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${liked ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Heart className={`h-4 w-4 ${liked ? 'fill-rose-500' : ''}`} aria-hidden="true" />
          {liked ? 'Liked' : 'Like'}
          {post.likes_count > 0 && <span className="tabular-nums">{post.likes_count}</span>}
        </button>
        <button
          onClick={() => setShowComments((v) => !v)}
          aria-expanded={showComments}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {comments.length === 0 ? 'Comment' : comments.length === 1 ? '1 comment' : `${comments.length} comments`}
        </button>
      </footer>

      {showComments && <Comments comments={comments} me={me} now={now} postId={post.id} actions={actions} />}
    </article>
  );
}

function MenuItem({ icon, children, onClick, danger }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button role="menuitem" onClick={(e) => { e.stopPropagation(); onClick(); }} className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none ${danger ? 'text-rose-700' : 'text-slate-700'}`}>
      {icon}
      {children}
    </button>
  );
}

function EditPost({ post, onCancel, onSave }: { post: PostRow; onCancel: () => void; onSave: (v: { category: string; title: string; content: string }) => Promise<void> }) {
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [category, setCategory] = useState(post.category);
  const [busy, setBusy] = useState(false);
  const ok = title.trim() !== '' && content.trim() !== '' && !busy;
  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={async (e) => { e.preventDefault(); if (!ok) return; setBusy(true); await onSave({ category, title, content }); setBusy(false); }}
    >
      <select value={category} onChange={(e) => setCategory(e.target.value)} className={FIELD} aria-label="Category">
        {POST_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} className={FIELD} aria-label="Title" />
      <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} maxLength={20000} className={`${FIELD} resize-y`} aria-label="Message" />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Cancel</button>
        <button type="submit" disabled={!ok} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:bg-slate-300">Save changes</button>
      </div>
    </form>
  );
}

function Comments({ comments, me, now, postId, actions }: { comments: CommentRow[]; me: Props['me']; now: Date; postId: string; actions: FeedActions }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    const ok = await actions.addComment(postId, text);
    setBusy(false);
    if (ok) setText('');
  }

  return (
    <div className="mt-3 space-y-3 border-t border-slate-100 pt-4">
      {comments.length === 0 && <p className="text-sm text-slate-500">No comments yet. Start the conversation.</p>}
      <ul className="space-y-3">
        {comments.map((c) => (
          <li key={c.id} className="group flex gap-3">
            <Avatar id={c.author_id} name={c.author_name} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="rounded-2xl rounded-tl-md bg-slate-50 px-3.5 py-2.5">
                <p className="text-xs">
                  <span className="font-semibold text-slate-900">{c.author_name}</span>
                  <span className="text-slate-500">, {c.author_role}</span>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-700">{c.text}</p>
              </div>
              <p className="mt-1 flex items-center gap-3 px-1 text-xs text-slate-500">
                <time dateTime={c.created_at}>{timeAgo(c.created_at, now)}</time>
                {(c.author_id === me.id || me.canModerate) && (
                  <button onClick={() => void actions.deleteComment(c.id)} className="font-medium text-slate-500 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">Delete</button>
                )}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="flex items-end gap-2">
        <Avatar id={me.id} name={me.fullName} size="sm" />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit(e); } }}
          rows={1}
          maxLength={5000}
          placeholder="Write a comment"
          aria-label="Write a comment"
          className={`${FIELD} resize-none rounded-2xl py-2`}
        />
        <button type="submit" disabled={!text.trim() || busy} className="rounded-full bg-blue-600 p-2.5 text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:bg-slate-300" aria-label="Send comment">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
        </button>
      </form>
    </div>
  );
}
