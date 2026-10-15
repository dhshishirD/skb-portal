import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Known active profile ID in Supabase profiles table for foreign key validation
const SYSTEM_PROFILE_ID = 'd963309c-1da4-4a4a-947c-c10785d43f1e';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await (supabase.from('notifications') as any)
      .select('*')
      .in('kind', ['community_post', 'community_comment', 'community_dm'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching community data:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const posts: any[] = [];
    const commentsByPost: Record<string, any[]> = {};
    const dms: any[] = [];

    (data || []).forEach((row: any) => {
      const payload = row.payload;
      if (!payload) return;

      if (row.kind === 'community_post') {
        posts.push({
          ...payload,
          dbId: row.id,
          createdAt: payload.createdAt || new Date(row.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
        });
      } else if (row.kind === 'community_comment') {
        const postId = payload.postId;
        if (postId) {
          if (!commentsByPost[postId]) commentsByPost[postId] = [];
          commentsByPost[postId].push({
            ...payload.comment,
            id: payload.comment?.id || row.id,
            createdAt: payload.comment?.createdAt || new Date(row.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
          });
        }
      } else if (row.kind === 'community_dm') {
        dms.push({
          ...payload,
          dbId: row.id,
        });
      }
    });

    // Merge comments into corresponding posts
    const postsWithComments = posts.map((p) => {
      const existingComments = p.comments || [];
      const extraComments = commentsByPost[p.id] || [];
      const commentMap = new Map();
      [...existingComments, ...extraComments].forEach((c) => {
        if (c && c.id) commentMap.set(c.id, c);
      });
      return {
        ...p,
        comments: Array.from(commentMap.values()),
      };
    });

    // Group DMs into conversation threads
    const directMessagesMap: Record<string, any[]> = {};
    dms.forEach((dm) => {
      const sender = dm.senderName;
      const recipient = dm.recipientName;
      if (sender && recipient) {
        if (!directMessagesMap[recipient]) directMessagesMap[recipient] = [];
        directMessagesMap[recipient].push(dm);

        if (!directMessagesMap[sender]) directMessagesMap[sender] = [];
        directMessagesMap[sender].push(dm);
      }
    });

    return NextResponse.json({
      success: true,
      posts: postsWithComments,
      directMessages: directMessagesMap,
    });
  } catch (err: any) {
    console.error('Community sync GET exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, payload } = body;
    const supabase = createAdminClient();

    if (type === 'POST') {
      const post = payload;
      // Check if post already exists to prevent duplicates
      const { data: existing } = await (supabase.from('notifications') as any)
        .select('id, payload')
        .eq('kind', 'community_post')
        .limit(20);

      const match = (existing || []).find((r: any) => r.payload?.id === post.id);

      if (match) {
        await (supabase.from('notifications') as any)
          .update({ payload: post })
          .eq('id', match.id);
      } else {
        await (supabase.from('notifications') as any).insert({
          user_id: SYSTEM_PROFILE_ID,
          kind: 'community_post',
          payload: post,
        });
      }

      return NextResponse.json({ success: true });
    }

    if (type === 'COMMENT') {
      const { postId, comment } = payload;
      await (supabase.from('notifications') as any).insert({
        user_id: SYSTEM_PROFILE_ID,
        kind: 'community_comment',
        payload: { postId, comment },
      });

      return NextResponse.json({ success: true });
    }

    if (type === 'DM') {
      const { dm } = payload;
      await (supabase.from('notifications') as any).insert({
        user_id: SYSTEM_PROFILE_ID,
        kind: 'community_dm',
        payload: dm,
      });

      return NextResponse.json({ success: true });
    }

    if (type === 'LIKE') {
      const { postId, likesCount } = payload;
      const { data: existing } = await (supabase.from('notifications') as any)
        .select('id, payload')
        .eq('kind', 'community_post')
        .limit(30);

      const match = (existing || []).find((r: any) => r.payload?.id === postId);
      if (match) {
        const updatedPayload = { ...match.payload, likesCount };
        await (supabase.from('notifications') as any)
          .update({ payload: updatedPayload })
          .eq('id', match.id);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: 'Invalid sync operation' }, { status: 400 });
  } catch (err: any) {
    console.error('Community sync POST exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
