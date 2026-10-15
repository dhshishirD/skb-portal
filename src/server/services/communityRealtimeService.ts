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
   * Realtime Presence Tracking across active HQ officers cross-browser & cross-device
   */
  static trackPresence(
    rawOfficerName: string, 
    role: string, 
    onSync: (activeOfficers: string[]) => void
  ) {
    if (!rawOfficerName) return null;

    // Normalize officer name: remove any "(Role...)" suffixes to ensure clean matching
    const officerName = rawOfficerName.split('(')[0].trim();
    const cleanSelf = officerName.toLowerCase();

    const activeSet = new Set<string>();
    activeSet.add(cleanSelf);

    const broadcastSync = () => {
      onSync(Array.from(activeSet));
    };

    // Channel 1: Native HTML5 BroadcastChannel for instantaneous same-machine tab sync
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('skb_hq_officer_presence');
        bc.onmessage = (event) => {
          if (event.data?.type === 'JOIN' || event.data?.type === 'HEARTBEAT') {
            const name = (event.data?.name || '').trim().toLowerCase();
            if (name) {
              activeSet.add(name);
              broadcastSync();
            }
          } else if (event.data?.type === 'LEAVE') {
            const name = (event.data?.name || '').trim().toLowerCase();
            if (name && name !== cleanSelf) {
              activeSet.delete(name);
              broadcastSync();
            }
          }
        };

        bc.postMessage({ type: 'JOIN', name: cleanSelf, role });
      } catch (err) {
        console.warn('BroadcastChannel error', err);
      }
    }

    // Channel 2: Server-Backed Heartbeat API (/api/community/presence)
    const sendHeartbeat = async () => {
      try {
        if (typeof window !== 'undefined') {
          const res = await fetch('/api/community/presence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ officerName, role, action: 'heartbeat' }),
          });

          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.activeOfficers)) {
              json.activeOfficers.forEach((name: string) => {
                if (name) activeSet.add(name.toLowerCase());
              });
              broadcastSync();
            }
          }
        }
      } catch (e) {
        console.warn('Presence heartbeat error:', e);
      }
    };

    // Immediate heartbeat
    sendHeartbeat();
    const heartbeatInterval = setInterval(sendHeartbeat, 10000);

    // Channel 3: Supabase Realtime WebSocket presence channel
    const supabase = this.getSupabaseClient();
    let channel: any = null;
    if (supabase) {
      try {
        channel = supabase.channel('skb-community-presence', {
          config: {
            presence: { key: officerName },
          },
        });

        const handlePresenceUpdate = () => {
          try {
            const state = channel.presenceState();
            Object.keys(state).forEach((key) => {
              if (key) activeSet.add(key.toLowerCase());
            });
            broadcastSync();
          } catch {}
        };

        channel
          .on('presence', { event: 'sync' }, handlePresenceUpdate)
          .on('presence', { event: 'join' }, handlePresenceUpdate)
          .on('presence', { event: 'leave' }, handlePresenceUpdate)
          .subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
              try {
                await channel.track({
                  officerName,
                  role,
                  onlineAt: new Date().toISOString(),
                });
              } catch {}
            }
          });
      } catch (e) {
        console.warn('Supabase presence channel error:', e);
      }
    }

    // Unload hook: broadcast exit
    const handleUnload = () => {
      if (bc) {
        try {
          bc.postMessage({ type: 'LEAVE', name: cleanSelf });
        } catch {}
      }
      if (typeof window !== 'undefined' && navigator.sendBeacon) {
        try {
          navigator.sendBeacon('/api/community/presence', JSON.stringify({ officerName, action: 'leave' }));
        } catch {}
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleUnload);
    }

    // Return cleanup handle
    return {
      unsubscribe: () => {
        clearInterval(heartbeatInterval);
        handleUnload();
        if (typeof window !== 'undefined') {
          window.removeEventListener('beforeunload', handleUnload);
        }
        if (bc) {
          try { bc.close(); } catch {}
        }
        if (channel && typeof channel.unsubscribe === 'function') {
          try { channel.unsubscribe(); } catch {}
        }
      },
    };
  }
}
