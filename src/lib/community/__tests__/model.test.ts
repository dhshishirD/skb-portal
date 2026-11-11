import { describe, expect, it } from 'vitest';
import {
  avatarTone,
  buildConversations,
  clockTime,
  dayLabel,
  fileProblem,
  filterPosts,
  formatBytes,
  initials,
  isOnline,
  previewOf,
  sortPosts,
  timeAgo,
  totalUnread,
  type DmRow,
  type PostRow,
} from '../model';

const now = new Date(2026, 10, 11, 15, 30); // 11 Nov 2026, 3:30 PM

const post = (o: Partial<PostRow>): PostRow => ({
  id: 'p', author_id: 'a', author_name: 'Mizbah Uddin', author_role: 'Program Officer', category: 'General',
  title: 'Title', content: 'Body', attachment_name: null, attachment_size: null, attachment_type: null,
  attachment_path: null, likes_count: 0, pinned: false, created_at: now.toISOString(), edited_at: null, ...o,
});

const dm = (o: Partial<DmRow>): DmRow => ({
  id: 'm', sender_id: 'x', recipient_id: 'me', sender_name: 'Xan', recipient_name: 'Me', text: 'hi',
  attachment_name: null, attachment_size: null, attachment_type: null, attachment_path: null,
  read_at: null, created_at: now.toISOString(), ...o,
});

describe('initials', () => {
  it('skips titles and uses first and last name', () => {
    expect(initials('Md. Abu Huraira')).toBe('AH');
    expect(initials('Daloyar Hassan')).toBe('DH');
    expect(initials('Adv. Aminul Islam (Law Officer)')).toBe('AI');
    expect(initials('Emran')).toBe('E');
    expect(initials('')).toBe('?');
  });
});

describe('avatarTone', () => {
  it('is stable for one person', () => {
    expect(avatarTone('abc')).toEqual(avatarTone('abc'));
  });
});

describe('time', () => {
  it('writes a short relative time', () => {
    expect(timeAgo(new Date(now.getTime() - 10_000).toISOString(), now)).toBe('just now');
    expect(timeAgo(new Date(now.getTime() - 5 * 60_000).toISOString(), now)).toBe('5 min ago');
    expect(timeAgo(new Date(2026, 10, 11, 12, 0).toISOString(), now)).toBe('3 h ago');
    expect(timeAgo(new Date(2026, 10, 10, 23, 0).toISOString(), now)).toBe('Yesterday');
    expect(timeAgo(new Date(2026, 9, 20, 9, 0).toISOString(), now)).toBe('20 Oct');
    expect(timeAgo(new Date(2025, 9, 20, 9, 0).toISOString(), now)).toBe('20 Oct 2025');
  });
  it('labels days and clock times', () => {
    expect(dayLabel(now.toISOString(), now)).toBe('Today');
    expect(dayLabel(new Date(2026, 10, 10, 9).toISOString(), now)).toBe('Yesterday');
    expect(clockTime(new Date(2026, 10, 11, 0, 5).toISOString())).toBe('12:05 AM');
    expect(clockTime(new Date(2026, 10, 11, 15, 25).toISOString())).toBe('3:25 PM');
  });
  it('treats under two minutes as online', () => {
    expect(isOnline(new Date(now.getTime() - 60_000).toISOString(), now)).toBe(true);
    expect(isOnline(new Date(now.getTime() - 130_000).toISOString(), now)).toBe(false);
    expect(isOnline(null, now)).toBe(false);
  });
});

describe('posts', () => {
  it('puts pinned posts first, then newest', () => {
    const list = sortPosts([
      post({ id: 'old', created_at: new Date(2026, 10, 1).toISOString() }),
      post({ id: 'new', created_at: new Date(2026, 10, 9).toISOString() }),
      post({ id: 'pin', pinned: true, created_at: new Date(2026, 9, 1).toISOString() }),
    ]);
    expect(list.map((p) => p.id)).toEqual(['pin', 'new', 'old']);
  });
  it('filters by category and by words in title, text or author', () => {
    const list = [
      post({ id: '1', category: 'Field Updates', title: 'Distribution done' }),
      post({ id: '2', category: 'General', content: 'Eid holiday notice' }),
      post({ id: '3', category: 'General', author_name: 'Khondokar' }),
    ];
    expect(filterPosts(list, { category: 'Field Updates', query: '' }).map((p) => p.id)).toEqual(['1']);
    expect(filterPosts(list, { category: 'ALL', query: 'eid' }).map((p) => p.id)).toEqual(['2']);
    expect(filterPosts(list, { category: 'ALL', query: 'khond' }).map((p) => p.id)).toEqual(['3']);
    expect(filterPosts(list, { category: 'ALL', query: '' })).toHaveLength(3);
  });
});

describe('conversations', () => {
  const people = [{ id: 'x', fullName: 'Xan Officer', designation: null }];
  const msgs = [
    dm({ id: '1', created_at: new Date(2026, 10, 10, 9).toISOString() }),
    dm({ id: '2', sender_id: 'me', recipient_id: 'x', text: 'ok', created_at: new Date(2026, 10, 10, 10).toISOString() }),
    dm({ id: '3', created_at: new Date(2026, 10, 11, 9).toISOString() }),
    dm({ id: '4', sender_id: 'y', sender_name: 'Yan', created_at: new Date(2026, 10, 9).toISOString(), read_at: 'seen' }),
  ];
  it('groups by the other person, newest conversation first, with unread counts', () => {
    const c = buildConversations(msgs, 'me', people);
    expect(c.map((x) => x.personId)).toEqual(['x', 'y']);
    expect(c[0].name).toBe('Xan Officer');
    expect(c[0].messages.map((m) => m.id)).toEqual(['1', '2', '3']);
    expect(c[0].unread).toBe(2);
    expect(c[1].name).toBe('Yan');
    expect(totalUnread(c)).toBe(2);
  });
  it('never counts my own messages as unread', () => {
    const c = buildConversations([dm({ sender_id: 'me', recipient_id: 'x', read_at: null })], 'me', people);
    expect(c[0].unread).toBe(0);
  });
  it('writes a preview', () => {
    expect(previewOf(dm({ text: 'hello' }), 'me')).toBe('hello');
    expect(previewOf(dm({ sender_id: 'me', text: 'hello' }), 'me')).toBe('You: hello');
    expect(previewOf(dm({ text: '', attachment_name: 'a.pdf' }), 'me')).toBe('Attachment: a.pdf');
  });
});

describe('files', () => {
  it('formats sizes', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB');
  });
  it('explains what is wrong with a file', () => {
    expect(fileProblem({ size: 0, type: 'application/pdf' })).toMatch(/empty/);
    expect(fileProblem({ size: 11 * 1024 * 1024, type: 'application/pdf' })).toMatch(/10 MB/);
    expect(fileProblem({ size: 10, type: 'application/zip' })).toMatch(/PDF/);
    expect(fileProblem({ size: 10, type: 'image/png' })).toBeNull();
  });
});
