'use client';

import { createClient } from '@/lib/supabase/client';
import type { Attachment, CommentRow, DmRow, PostRow } from './model';

/*
 * Browser-side data access for the staff community. Everything goes through the signed-in
 * person's own session, so Row Level Security (migration 0027) decides what they can read or
 * change. Names and designations are written by the database, not sent from here.
 */

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const FALLBACK = 'Something went wrong. Check your connection and try again.';

// The community tables are not in the generated types yet, so the client is used untyped here.
const db = (): any => createClient();

function fail<T>(error: { message?: string } | null | undefined): Result<T> {
  const message = error?.message ?? '';
  // Messages written by our own database rules are meant to be read by people.
  const friendly = /^(You can only|Only the|The author|The like count|Post not found|Comment not found|Not allowed)/.test(message);
  return { ok: false, error: friendly ? message : FALLBACK };
}

const POST_COLUMNS =
  'id, author_id, author_name, author_role, category, title, content, attachment_name, attachment_size, attachment_type, attachment_path, likes_count, pinned, created_at, edited_at';
const DM_COLUMNS =
  'id, sender_id, recipient_id, sender_name, recipient_name, text, attachment_name, attachment_size, attachment_type, attachment_path, read_at, created_at';

export const PAGE_SIZE = 20;

export async function loadPosts(limit: number): Promise<Result<PostRow[]>> {
  const { data, error } = await db()
    .from('community_posts')
    .select(POST_COLUMNS)
    .is('deleted_at', null)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  return error ? fail(error) : { ok: true, data: (data ?? []) as PostRow[] };
}

export async function loadComments(postIds: string[]): Promise<Result<CommentRow[]>> {
  if (postIds.length === 0) return { ok: true, data: [] };
  const { data, error } = await db()
    .from('community_comments')
    .select('id, post_id, author_id, author_name, author_role, text, created_at')
    .in('post_id', postIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(2000);
  return error ? fail(error) : { ok: true, data: (data ?? []) as CommentRow[] };
}

export async function loadLikesOf(userId: string, postIds: string[]): Promise<Result<string[]>> {
  if (postIds.length === 0) return { ok: true, data: [] };
  const { data, error } = await db()
    .from('community_post_likes')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds);
  return error ? fail(error) : { ok: true, data: ((data ?? []) as Array<{ post_id: string }>).map((r) => r.post_id) };
}

export async function createPost(input: {
  category: string;
  title: string;
  content: string;
  attachment?: Attachment | null;
}): Promise<Result<null>> {
  const a = input.attachment;
  const { error } = await db().from('community_posts').insert({
    category: input.category,
    title: input.title.trim(),
    content: input.content.trim(),
    author_name: '', // filled in by the database from the profile
    author_role: '',
    attachment_path: a?.path ?? null,
    attachment_name: a?.name ?? null,
    attachment_size: a?.size ?? null,
    attachment_type: a?.type ?? null,
  });
  return error ? fail(error) : { ok: true, data: null };
}

export async function updatePost(id: string, input: { category: string; title: string; content: string }): Promise<Result<null>> {
  const { error } = await db()
    .from('community_posts')
    .update({ category: input.category, title: input.title.trim(), content: input.content.trim() })
    .eq('id', id);
  return error ? fail(error) : { ok: true, data: null };
}

export async function setPinned(id: string, pinned: boolean): Promise<Result<null>> {
  const { error } = await db().from('community_posts').update({ pinned }).eq('id', id);
  return error ? fail(error) : { ok: true, data: null };
}

export async function deletePost(id: string): Promise<Result<null>> {
  const { error } = await db().rpc('delete_community_post', { _id: id });
  return error ? fail(error) : { ok: true, data: null };
}

export async function setLiked(postId: string, userId: string, liked: boolean): Promise<Result<null>> {
  const { error } = liked
    ? await db().from('community_post_likes').insert({ post_id: postId })
    : await db().from('community_post_likes').delete().eq('post_id', postId).eq('user_id', userId);
  // Liking twice (a double click) is not an error worth showing.
  if (error && (error as { code?: string }).code === '23505') return { ok: true, data: null };
  return error ? fail(error) : { ok: true, data: null };
}

export async function addComment(postId: string, text: string): Promise<Result<null>> {
  const { error } = await db()
    .from('community_comments')
    .insert({ post_id: postId, text: text.trim(), author_name: '', author_role: '' });
  return error ? fail(error) : { ok: true, data: null };
}

export async function deleteComment(id: string): Promise<Result<null>> {
  const { error } = await db().rpc('delete_community_comment', { _id: id });
  return error ? fail(error) : { ok: true, data: null };
}

export async function loadMessages(): Promise<Result<DmRow[]>> {
  const { data, error } = await db()
    .from('direct_messages')
    .select(DM_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(1000);
  return error ? fail(error) : { ok: true, data: (data ?? []) as DmRow[] };
}

export async function sendMessage(recipientId: string, text: string, attachment?: Attachment | null): Promise<Result<null>> {
  const { error } = await db().from('direct_messages').insert({
    recipient_id: recipientId,
    text: text.trim(),
    sender_name: '', // filled in by the database from the profile
    sender_role: '',
    recipient_name: '',
    attachment_path: attachment?.path ?? null,
    attachment_name: attachment?.name ?? null,
    attachment_size: attachment?.size ?? null,
    attachment_type: attachment?.type ?? null,
  });
  return error ? fail(error) : { ok: true, data: null };
}

export async function markRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db().from('direct_messages').update({ read_at: new Date().toISOString() }).in('id', ids);
}

export async function touchPresence(): Promise<void> {
  await db().rpc('touch_presence');
}

export async function loadPresence(): Promise<Result<Record<string, string>>> {
  const { data, error } = await db().from('staff_presence').select('user_id, last_seen_at');
  if (error) return fail(error);
  const map: Record<string, string> = {};
  for (const r of (data ?? []) as Array<{ user_id: string; last_seen_at: string }>) map[r.user_id] = r.last_seen_at;
  return { ok: true, data: map };
}

// ---------- files (go through the server: it checks the type and keeps the bucket private) ----------

export async function uploadFile(file: File): Promise<Result<Attachment>> {
  const form = new FormData();
  form.append('file', file);
  try {
    const res = await fetch('/api/community/files', { method: 'POST', body: form });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json?.error ?? FALLBACK };
    return { ok: true, data: json as Attachment };
  } catch {
    return { ok: false, error: FALLBACK };
  }
}

export async function fileLink(kind: 'post' | 'dm', id: string): Promise<Result<{ url: string; name: string }>> {
  try {
    const res = await fetch(`/api/community/files?kind=${kind}&id=${encodeURIComponent(id)}`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.url) return { ok: false, error: json?.error ?? 'This file is not available.' };
    return { ok: true, data: { url: json.url, name: json.name } };
  } catch {
    return { ok: false, error: FALLBACK };
  }
}
