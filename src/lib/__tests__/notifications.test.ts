import { describe, expect, it } from 'vitest';
import { badgeText, newArrivals, safeLink, titleWithCount, unreadCount, type NotificationRow } from '../notifications';
import { canOpenPath } from '../desks';

describe('notifications helpers', () => {
  it('counts only unread rows', () => {
    expect(unreadCount([{ read_at: null }, { read_at: '2026-11-22T10:00:00Z' }, { read_at: null }])).toBe(2);
    expect(unreadCount([])).toBe(0);
  });
  it('keeps the badge short', () => {
    expect(badgeText(3)).toBe('3');
    expect(badgeText(9)).toBe('9');
    expect(badgeText(10)).toBe('9+');
    expect(badgeText(250)).toBe('9+');
  });
  it('puts the unread count in the tab title without stacking it', () => {
    expect(titleWithCount('SKB Works Portal', 3)).toBe('(3) SKB Works Portal');
    expect(titleWithCount('(3) SKB Works Portal', 5)).toBe('(5) SKB Works Portal');
    expect(titleWithCount('(5) SKB Works Portal', 0)).toBe('SKB Works Portal');
    expect(titleWithCount('Portal', 150)).toBe('(99+) Portal');
  });
  it('follows only links inside the portal', () => {
    expect(safeLink('/community')).toBe('/community');
    expect(safeLink('https://evil.example')).toBe('/notifications');
    expect(safeLink('//evil.example')).toBe('/notifications');
  });
  it('lets staff, not donors, open the notifications page', () => {
    expect(canOpenPath('/notifications', ['project_officer'])).toBe(true);
    expect(canOpenPath('/notifications', ['donor'])).toBe(false);
  });

  const row = (id: string, read: string | null = null): NotificationRow => ({
    id, kind: 'message', title: 't', body: null, link: '/community', read_at: read, created_at: '2026-11-22T10:00:00Z',
  });
  it('announces only unread items it has not seen, and nothing on the first look', () => {
    expect(newArrivals(null, [row('a'), row('b')])).toEqual([]);
    const seen = new Set(['a']);
    expect(newArrivals(seen, [row('b'), row('a'), row('c', '2026-11-22T11:00:00Z')]).map((r) => r.id)).toEqual(['b']);
    expect(newArrivals(new Set(['a', 'b']), [row('a'), row('b')])).toEqual([]);
  });
});
