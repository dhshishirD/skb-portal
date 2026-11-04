import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireActiveRole } from '@/lib/auth/guards';
import { canModerateCommunity, canReadDirectMessage, canSeeDonorTickets, isStaff, sameName } from '@/lib/apiAccess';

// Known active profile ID in Supabase profiles table for foreign key validation
const SYSTEM_PROFILE_ID = 'd963309c-1da4-4a4a-947c-c10785d43f1e';

/*
 * Community feed. This route uses the service-role client (it bypasses Row Level Security), so
 * every rule is enforced HERE: staff only, direct messages only for their two people, donor
 * tickets only for the roles that deal with donors, and the author/sender name always comes
 * from the signed-in profile, never from the request body.
 * (Phase 2 moves chat to the community_* tables, where RLS does this.)
 */
export async function GET() {
  const guard = await requireActiveRole(isStaff);
  if (!guard.ok) return guard.response;

  try {
    const supabase = createAdminClient();
    const { data, error } = await (supabase.from('notifications') as any)
      .select('*')
      .in('kind', ['community_post', 'community_comment', 'community_dm', 'donor_ticket'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching community data:', error);
      return NextResponse.json({ success: false, error: 'Could not load community data' }, { status: 500 });
    }

    const posts: any[] = [];
    const commentsByPost: Record<string, any[]> = {};
    const dms: any[] = [];
    const donorTickets: any[] = [];

    (data || []).forEach((row: any) => {
      const payload = row.payload;
      if (!payload) return;

      if (row.kind === 'community_post') {
        if (!payload || !payload.id || !payload.title) return;
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
        if (!payload || !payload.id || !payload.senderName || !payload.recipientName) return;
        if (!canReadDirectMessage(guard.fullName, payload)) return;
        dms.push({
          ...payload,
          dbId: row.id,
          createdAtIso: row.created_at,
        });
      } else if (row.kind === 'donor_ticket') {
        if (!payload || !payload.id || !canSeeDonorTickets(guard.roles)) return;
        donorTickets.push({
          ...payload,
          dbId: row.id,
          createdAt: payload.createdAt || new Date(row.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
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

    // Sort DMs chronologically (oldest to newest for chat timeline)
    const chronologicalDms = [...dms].sort(
      (a, b) => new Date(a.createdAtIso || 0).getTime() - new Date(b.createdAtIso || 0).getTime()
    );

    return NextResponse.json({
      success: true,
      posts: postsWithComments,
      directMessages: chronologicalDms,
      directMessagesMap,
      donorTickets,
    });
  } catch (err: any) {
    console.error('Community sync GET exception:', err);
    return NextResponse.json({ success: false, error: 'Could not load community data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requireActiveRole(isStaff);
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const { type, payload } = body;
    const supabase = createAdminClient();

    if (type === 'POST') {
      if (!payload || typeof payload !== 'object') {
        return NextResponse.json({ success: false, message: 'Invalid post' }, { status: 400 });
      }
      const post = { ...payload, authorName: guard.fullName };
      // Check if post already exists to prevent duplicates
      const { data: existing } = await (supabase.from('notifications') as any)
        .select('id, payload')
        .eq('kind', 'community_post')
        .limit(20);

      const match = (existing || []).find((r: any) => r.payload?.id === post.id);

      if (match) {
        // Only the author (or the Executive Director / Super Admin) may change an existing post.
        if (!sameName(match.payload?.authorName, guard.fullName) && !canModerateCommunity(guard.roles)) {
          return NextResponse.json({ success: false, message: 'You can only edit your own posts' }, { status: 403 });
        }
        await (supabase.from('notifications') as any)
          .update({ payload: { ...post, authorName: match.payload?.authorName ?? post.authorName } })
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
      const { postId, comment } = payload ?? {};
      if (!postId || !comment || typeof comment !== 'object') {
        return NextResponse.json({ success: false, message: 'Invalid comment' }, { status: 400 });
      }
      await (supabase.from('notifications') as any).insert({
        user_id: SYSTEM_PROFILE_ID,
        kind: 'community_comment',
        payload: { postId, comment: { ...comment, authorName: guard.fullName } },
      });

      return NextResponse.json({ success: true });
    }

    if (type === 'DM') {
      const { dm } = payload ?? {};
      if (!dm || typeof dm !== 'object' || !dm.recipientName) {
        return NextResponse.json({ success: false, message: 'Invalid message' }, { status: 400 });
      }
      const { error: insertError } = await (supabase.from('notifications') as any).insert({
        user_id: SYSTEM_PROFILE_ID,
        kind: 'community_dm',
        payload: { ...dm, senderName: guard.fullName },
      });

      if (insertError) {
        console.error('Error inserting DM:', insertError);
        return NextResponse.json({ success: false, error: 'Could not send the message' }, { status: 500 });
      }

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

    if (type === 'DONOR_TICKET') {
      if (!canSeeDonorTickets(guard.roles)) {
        return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
      }
      const { ticket } = payload ?? {};
      if (!ticket || !ticket.id) {
        return NextResponse.json({ success: false, message: 'Invalid ticket payload' }, { status: 400 });
      }

      const { data: existing } = await (supabase.from('notifications') as any)
        .select('id, payload')
        .eq('kind', 'donor_ticket')
        .limit(100);

      const match = (existing || []).find((r: any) => r.payload?.id === ticket.id);

      if (match) {
        await (supabase.from('notifications') as any)
          .update({ payload: ticket })
          .eq('id', match.id);
      } else {
        await (supabase.from('notifications') as any).insert({
          user_id: SYSTEM_PROFILE_ID,
          kind: 'donor_ticket',
          payload: ticket,
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: 'Invalid sync operation' }, { status: 400 });
  } catch (err: any) {
    console.error('Community sync POST exception:', err);
    return NextResponse.json({ success: false, error: 'Could not save' }, { status: 500 });
  }
}
