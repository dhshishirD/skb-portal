import { createClient } from '@/lib/supabase/client';
import { CommunityPost, DirectMessage } from '@/app/(staff)/community/page';

export class CommunityRealtimeService {
  private static getSupabaseClient() {
    try {
      return createClient();
    } catch {
      return null;
    }
  }

  /**
   * Fetch all persistent community posts from Supabase database via persistent sync API
   */
  static async fetchPosts(): Promise<CommunityPost[] | null> {
    try {
      if (typeof window !== 'undefined') {
        const res = await fetch('/api/community/sync');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.posts) && json.posts.length > 0) {
            return json.posts;
          }
        }
      }
    } catch (e) {
      console.warn('API sync fetch error, falling back to local cache', e);
    }

    // LocalStorage fallback if offline
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('skb_hq_community_posts');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
    }
    return null;
  }

  /**
   * Insert new community post into Supabase & Broadcast via WebSocket
   */
  static async insertPost(post: CommunityPost): Promise<boolean> {
    // 1. Persist to Supabase Database
    try {
      if (typeof window !== 'undefined') {
        fetch('/api/community/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'POST', payload: post }),
        }).catch((err) => console.warn('Background sync POST error:', err));
      }
    } catch (e) {
      console.warn('Post persist exception:', e);
    }

    // 2. Realtime WebSocket Broadcast to all connected browsers (Chrome, Edge, mobile)
    const supabase = this.getSupabaseClient();
    if (supabase) {
      try {
        const channel = supabase.channel('skb-community-sync');
        channel.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'new-post',
              payload: post,
            });
          }
        });
      } catch (err) {
        console.warn('Broadcast exception:', err);
      }
    }

    return true;
  }

  /**
   * Insert comment into Supabase & Broadcast via WebSocket
   */
  static async insertComment(postId: string, comment: { id?: string; authorName: string; authorRole: string; authorAvatar?: string; text: string; createdAt?: string }): Promise<boolean> {
    try {
      if (typeof window !== 'undefined') {
        fetch('/api/community/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'COMMENT', payload: { postId, comment } }),
        }).catch((err) => console.warn('Background comment sync error:', err));
      }
    } catch (e) {
      console.warn('Comment persist exception:', e);
    }

    // Realtime Broadcast
    const supabase = this.getSupabaseClient();
    if (supabase) {
      try {
        const channel = supabase.channel('skb-community-sync');
        channel.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'new-comment',
              payload: { postId, comment },
            });
          }
        });
      } catch (err) {
        console.warn('Broadcast comment exception:', err);
      }
    }

    return true;
  }

  /**
   * Broadcast post like update
   */
  static async likePost(postId: string, likesCount: number): Promise<boolean> {
    try {
      if (typeof window !== 'undefined') {
        fetch('/api/community/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'LIKE', payload: { postId, likesCount } }),
        }).catch((err) => console.warn('Background like sync error:', err));
      }
    } catch {}

    const supabase = this.getSupabaseClient();
    if (supabase) {
      try {
        const channel = supabase.channel('skb-community-sync');
        channel.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'like-post',
              payload: { postId, likesCount },
            });
          }
        });
      } catch {}
    }

    return true;
  }

  /**
   * Fetch Direct Messages for a thread
   */
  static async fetchDirectMessages(user1: string, user2: string): Promise<DirectMessage[] | null> {
    try {
      if (typeof window !== 'undefined') {
        const res = await fetch('/api/community/sync');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.directMessages) {
            const thread = json.directMessages[user2] || json.directMessages[user1] || [];
            return thread.map((d: any) => ({
              ...d,
              isMine: d.senderName === user1,
            }));
          }
        }
      }
    } catch (e) {
      console.warn('API sync DM fetch error', e);
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('skb_hq_direct_messages');
      if (stored) {
        try {
          const map = JSON.parse(stored);
          return map[user2] || [];
        } catch {}
      }
    }
    return null;
  }

  /**
   * Insert Direct Message into Supabase & Broadcast via WebSocket
   */
  static async insertDirectMessage(dm: DirectMessage): Promise<boolean> {
    try {
      if (typeof window !== 'undefined') {
        fetch('/api/community/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'DM', payload: { dm } }),
        }).catch((err) => console.warn('Background DM sync error:', err));
      }
    } catch (e) {
      console.warn('DM persist exception:', e);
    }

    // Realtime Broadcast
    const supabase = this.getSupabaseClient();
    if (supabase) {
      try {
        const channel = supabase.channel('skb-community-sync');
        channel.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'new-dm',
              payload: dm,
            });
          }
        });
      } catch (err) {
        console.warn('Broadcast DM exception:', err);
      }
    }

    return true;
  }

  /**
   * Subscribe to Supabase Realtime Broadcast changes for Community Posts, Comments, and Likes
   */
  static subscribeRealtimePosts(
    onNewPost: (post: CommunityPost) => void,
    onNewComment?: (payload: { postId: string; comment: any }) => void,
    onLikePost?: (payload: { postId: string; likesCount: number }) => void
  ) {
    const supabase = this.getSupabaseClient();
    if (!supabase) return null;

    try {
      const channel = supabase
        .channel('skb-community-sync')
        .on('broadcast', { event: 'new-post' }, (msg: any) => {
          if (msg.payload) onNewPost(msg.payload);
        })
        .on('broadcast', { event: 'new-comment' }, (msg: any) => {
          if (msg.payload && onNewComment) onNewComment(msg.payload);
        })
        .on('broadcast', { event: 'like-post' }, (msg: any) => {
          if (msg.payload && onLikePost) onLikePost(msg.payload);
        })
        .subscribe();

      return channel;
    } catch (e) {
      console.warn('Realtime sync subscribe failed:', e);
      return null;
    }
  }

  /**
   * Subscribe to Supabase Realtime changes for Direct Messages
   */
  static subscribeRealtimeDms(callback: (dm: DirectMessage) => void) {
    const supabase = this.getSupabaseClient();
    if (!supabase) return null;

    try {
      const channel = supabase
        .channel('skb-community-sync')
        .on('broadcast', { event: 'new-dm' }, (msg: any) => {
          if (msg.payload) callback(msg.payload);
        })
        .subscribe();

      return channel;
    } catch (e) {
      console.warn('Realtime DM subscribe failed:', e);
      return null;
    }
  }

  /**
   * Realtime Presence Tracking across active HQ officers cross-browser
   */
  static trackPresence(
    rawOfficerName: string, 
    role: string, 
    onSync: (activeOfficers: string[]) => void
  ) {
    const supabase = this.getSupabaseClient();
    if (!supabase) return null;

    // Normalize officer name: remove any "(Role...)" suffixes to ensure clean matching
    const officerName = rawOfficerName.split('(')[0].trim();

    try {
      const channel = supabase.channel('skb-community-presence', {
        config: {
          presence: { key: officerName },
        },
      });

      const handlePresenceUpdate = () => {
        const state = channel.presenceState();
        const active = Object.keys(state);
        onSync(active);
      };

      channel
        .on('presence', { event: 'sync' }, handlePresenceUpdate)
        .on('presence', { event: 'join' }, handlePresenceUpdate)
        .on('presence', { event: 'leave' }, handlePresenceUpdate)
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              officerName,
              role,
              onlineAt: new Date().toISOString(),
            });
          }
        });

      return channel;
    } catch (e) {
      console.warn('Presence tracking exception:', e);
      return null;
    }
  }
}
