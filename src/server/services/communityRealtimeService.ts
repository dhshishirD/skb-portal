import { createClient } from '@/lib/supabase/client';
import { CommunityPost, DirectMessage } from '@/app/(staff)/community/page';

export class CommunityRealtimeService {
  private static getSupabaseClient() {
    try {
      return createClient();
    } catch (e) {
      return null;
    }
  }

  /**
   * Fetch all community posts from Supabase database with fallback
   */
  static async fetchPosts(): Promise<CommunityPost[] | null> {
    const supabase = this.getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError || !postsData) return null;

      const { data: commentsData } = await supabase
        .from('community_comments')
        .select('*')
        .order('created_at', { ascending: true });

      const commentsMap: Record<string, any[]> = {};
      (commentsData as any[] || []).forEach((c: any) => {
        if (!commentsMap[c.post_id]) commentsMap[c.post_id] = [];
        commentsMap[c.post_id].push({
          id: c.id,
          authorName: c.author_name,
          authorRole: c.author_role,
          authorAvatar: c.author_avatar,
          text: c.text,
          createdAt: new Date(c.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
        });
      });

      return (postsData as any[]).map((p: any) => ({
        id: p.id,
        authorName: p.author_name,
        authorRole: p.author_role,
        authorAvatar: p.author_avatar,
        category: p.category,
        title: p.title,
        content: p.content,
        attachment: p.attachment_name
          ? {
              name: p.attachment_name,
              size: p.attachment_size,
              type: p.attachment_type,
              dataUrl: p.attachment_url,
            }
          : undefined,
        likesCount: p.likes_count || 1,
        likedByMe: false,
        createdAt: new Date(p.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
        comments: commentsMap[p.id] || [],
      }));
    } catch (e) {
      return null;
    }
  }

  /**
   * Insert new community post into Supabase
   */
  static async insertPost(post: CommunityPost): Promise<boolean> {
    const supabase = this.getSupabaseClient();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('community_posts').insert({
        id: post.id,
        author_name: post.authorName,
        author_role: post.authorRole,
        author_avatar: post.authorAvatar,
        category: post.category,
        title: post.title,
        content: post.content,
        attachment_name: post.attachment?.name,
        attachment_size: post.attachment?.size,
        attachment_type: post.attachment?.type,
        attachment_url: post.attachment?.dataUrl,
        likes_count: post.likesCount,
      } as any);

      return !error;
    } catch (e) {
      return false;
    }
  }

  /**
   * Insert comment into Supabase
   */
  static async insertComment(postId: string, comment: { authorName: string; authorRole: string; text: string }): Promise<boolean> {
    const supabase = this.getSupabaseClient();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('community_comments').insert({
        post_id: postId,
        author_name: comment.authorName,
        author_role: comment.authorRole,
        text: comment.text,
      } as any);

      return !error;
    } catch (e) {
      return false;
    }
  }

  /**
   * Fetch Direct Messages for a thread
   */
  static async fetchDirectMessages(user1: string, user2: string): Promise<DirectMessage[] | null> {
    const supabase = this.getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_name.eq.${user1},recipient_name.eq.${user2}),and(sender_name.eq.${user2},recipient_name.eq.${user1})`)
        .order('created_at', { ascending: true });

      if (error || !data) return null;

      return (data as any[]).map((d: any) => ({
        id: d.id,
        senderName: d.sender_name,
        senderRole: d.sender_role,
        recipientName: d.recipient_name,
        text: d.text,
        attachment: d.attachment_name
          ? {
              name: d.attachment_name,
              size: d.attachment_size,
              type: d.attachment_type,
              dataUrl: d.attachment_url,
            }
          : undefined,
        timestamp: new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMine: d.sender_name === user1,
      }));
    } catch (e) {
      return null;
    }
  }

  /**
   * Insert Direct Message into Supabase
   */
  static async insertDirectMessage(dm: DirectMessage): Promise<boolean> {
    const supabase = this.getSupabaseClient();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('direct_messages').insert({
        id: dm.id,
        sender_name: dm.senderName,
        sender_role: dm.senderRole,
        recipient_name: dm.recipientName,
        text: dm.text,
        attachment_name: dm.attachment?.name,
        attachment_size: dm.attachment?.size,
        attachment_type: dm.attachment?.type,
        attachment_url: dm.attachment?.dataUrl,
      } as any);

      return !error;
    } catch (e) {
      return false;
    }
  }

  /**
   * Subscribe to Supabase Realtime changes for Direct Messages
   */
  static subscribeRealtimeDms(callback: (payload: any) => void) {
    const supabase = this.getSupabaseClient();
    if (!supabase) return null;

    const channel = supabase
      .channel('public:direct_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
        callback(payload.new);
      })
      .subscribe();

    return channel;
  }
}
