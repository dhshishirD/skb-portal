import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireActiveRole } from '@/lib/auth/guards';
import { canReadDirectMessage, isStaff, isUuid } from '@/lib/apiAccess';

/*
 * Returns one inline attachment of a community post or direct message, on demand.
 * The feed (/api/community/sync) leaves large files out so that it stays small.
 * Staff only; a direct message's file is only given to its sender and recipient.
 */
export async function GET(request: Request) {
  const guard = await requireActiveRole(isStaff);
  if (!guard.ok) return guard.response;

  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!isUuid(id)) return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });

  try {
    const supabase = createAdminClient();
    const { data, error } = await (supabase.from('notifications') as any)
      .select('kind, payload')
      .eq('id', id)
      .in('kind', ['community_post', 'community_dm'])
      .maybeSingle();
    if (error) return NextResponse.json({ success: false, error: 'Could not load the file' }, { status: 500 });
    if (!data?.payload?.attachment) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    if (data.kind === 'community_dm' && !canReadDirectMessage(guard.fullName, data.payload)) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    const { name, size, type, dataUrl } = data.payload.attachment;
    if (typeof dataUrl !== 'string') return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, attachment: { name, size, type, dataUrl } });
  } catch {
    return NextResponse.json({ success: false, error: 'Could not load the file' }, { status: 500 });
  }
}
