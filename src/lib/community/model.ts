/*
 * Staff community: the shapes of the data and the small pure functions the screens use.
 * No network and no React here, so everything in this file is unit-tested.
 */

export const POST_CATEGORIES = [
  { value: 'HQ Announcements', label: 'Announcements' },
  { value: 'Field Updates', label: 'Field updates' },
  { value: 'Donor Objections & Corrections', label: 'Donor feedback' },
  { value: 'NGO Best Practices', label: 'Best practices' },
  { value: 'General', label: 'General' },
] as const;

export type PostCategory = (typeof POST_CATEGORIES)[number]['value'];

export const categoryLabel = (value: string): string =>
  POST_CATEGORIES.find((c) => c.value === value)?.label ?? value;

export interface Person {
  id: string;
  fullName: string;
  designation: string | null;
}

export interface PostRow {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  category: string;
  title: string;
  content: string;
  attachment_name: string | null;
  attachment_size: string | null;
  attachment_type: string | null;
  attachment_path: string | null;
  likes_count: number;
  pinned: boolean;
  created_at: string;
  edited_at: string | null;
}

export interface CommentRow {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  text: string;
  created_at: string;
}

export interface DmRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  sender_name: string;
  recipient_name: string;
  text: string;
  attachment_name: string | null;
  attachment_size: string | null;
  attachment_type: string | null;
  attachment_path: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Attachment {
  path: string;
  name: string;
  size: string;
  type: string;
}

// ---------- names and avatars ----------

/** "Md. Abu Huraira" -> "AH"; leading titles are skipped. */
export function initials(name: string): string {
  const parts = name
    .replace(/\(.*?\)/g, '')
    .split(/\s+/)
    .filter((p) => p && !/^(md\.?|mr\.?|mrs\.?|ms\.?|dr\.?|adv\.?|engr\.?)$/i.test(p));
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** Soft background + dark text pairs. The same person always gets the same pair. */
export const AVATAR_TONES = [
  { bg: '#dbeafe', fg: '#1e3a8a' },
  { bg: '#d1fae5', fg: '#065f46' },
  { bg: '#fef3c7', fg: '#78350f' },
  { bg: '#fce7f3', fg: '#831843' },
  { bg: '#e0e7ff', fg: '#3730a3' },
  { bg: '#ccfbf1', fg: '#115e59' },
  { bg: '#ffe4e6', fg: '#9f1239' },
  { bg: '#ede9fe', fg: '#5b21b6' },
] as const;

export function avatarTone(id: string): (typeof AVATAR_TONES)[number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

// ---------- time ----------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** 3:25 PM */
export function clockTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "just now", "5 min ago", "3 h ago", "Yesterday", "12 Nov", "12 Nov 2025" */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days === 0) return `${Math.floor(diff / 3_600_000)} h ago`;
  if (days === 1) return 'Yesterday';
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** Divider in a chat: "Today", "Yesterday", "12 Nov" or "12 Nov 2025". */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

export const sameDay = (a: string, b: string): boolean => startOfDay(new Date(a)) === startOfDay(new Date(b));

/** Someone is "online" when their last heartbeat is under two minutes old. */
export const ONLINE_WINDOW_MS = 120_000;
export function isOnline(lastSeenIso: string | null | undefined, now: Date = new Date()): boolean {
  if (!lastSeenIso) return false;
  return now.getTime() - new Date(lastSeenIso).getTime() < ONLINE_WINDOW_MS;
}

// ---------- posts ----------

/** Pinned posts first, then newest first. */
export function sortPosts<T extends Pick<PostRow, 'pinned' | 'created_at'>>(posts: T[]): T[] {
  return [...posts].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function filterPosts(
  posts: PostRow[],
  opts: { category: string; query: string }
): PostRow[] {
  const q = opts.query.trim().toLowerCase();
  return posts.filter((p) => {
    if (opts.category !== 'ALL' && p.category !== opts.category) return false;
    if (!q) return true;
    return [p.title, p.content, p.author_name, p.author_role].some((s) => s.toLowerCase().includes(q));
  });
}

// ---------- messages ----------

export interface Conversation {
  personId: string;
  name: string;
  last: DmRow;
  unread: number;
  messages: DmRow[]; // oldest first
}

/** One conversation per other person, newest conversation first. */
export function buildConversations(messages: DmRow[], myId: string, people: Person[]): Conversation[] {
  const byPerson = new Map<string, DmRow[]>();
  for (const m of messages) {
    const other = m.sender_id === myId ? m.recipient_id : m.sender_id;
    const list = byPerson.get(other);
    if (list) list.push(m);
    else byPerson.set(other, [m]);
  }
  const out: Conversation[] = [];
  for (const [personId, list] of byPerson) {
    list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const last = list[list.length - 1];
    const person = people.find((p) => p.id === personId);
    out.push({
      personId,
      name: person?.fullName ?? (last.sender_id === myId ? last.recipient_name : last.sender_name),
      last,
      unread: list.filter((m) => m.recipient_id === myId && !m.read_at).length,
      messages: list,
    });
  }
  return out.sort((a, b) => new Date(b.last.created_at).getTime() - new Date(a.last.created_at).getTime());
}

export const totalUnread = (conversations: Conversation[]): number =>
  conversations.reduce((n, c) => n + c.unread, 0);

/** The line shown under a name in the conversation list. */
export function previewOf(m: DmRow, myId: string): string {
  const body = m.text.trim() || (m.attachment_name ? `Attachment: ${m.attachment_name}` : '');
  return m.sender_id === myId ? `You: ${body}` : body;
}

// ---------- files ----------

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Returns a message for the person, or null when the file is fine. */
export function fileProblem(file: { size: number; type: string }): string | null {
  if (file.size === 0) return 'This file is empty.';
  if (file.size > MAX_FILE_BYTES) return 'This file is larger than 10 MB.';
  if (!ALLOWED_FILE_TYPES.includes(file.type)) return 'Attach a PDF, Word, Excel, CSV or image (JPG, PNG, WEBP) file.';
  return null;
}
