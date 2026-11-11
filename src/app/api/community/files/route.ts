import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requireActiveRole } from '@/lib/auth/guards';
import { contentMatchesMime, isStaff, isUuid } from '@/lib/apiAccess';
import { ALLOWED_FILE_TYPES, MAX_FILE_BYTES, formatBytes } from '@/lib/community/model';

/*
 * Files shared in the staff community (posts and direct messages).
 *
 * The bucket is private. This route uses the service-role client, which bypasses Row Level
 * Security, so it checks the person itself:
 *   POST  staff only; the type, size and first bytes are checked; the file is stored under the
 *         uploader's own id.
 *   GET   the post or message is read with the person's OWN session (so RLS decides whether they
 *         may see it), and the file must belong to the row's author or sender. Only then is a
 *         short-lived signed link made.
 */
const BUCKET = 'community-files';
const LINK_SECONDS = 60 * 10;

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const guard = await requireActiveRole(isStaff);
  if (!guard.ok) return guard.response;

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a file to attach.' }, { status: 400 });
    if (file.size === 0 || file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'The file must be between 1 byte and 10 MB.' }, { status: 413 });
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Attach a PDF, Word, Excel, CSV or image (JPG, PNG, WEBP) file.' }, { status: 415 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!contentMatchesMime(file.type, buffer.subarray(0, 16))) {
      return NextResponse.json({ error: 'The file content does not match its type.' }, { status: 415 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'file';
    const path = `${guard.user.id}/${crypto.randomUUID()}-${safeName}`;
    const admin = createAdminClient();
    const { error } = await admin.storage.from(BUCKET).upload(path, buffer, { contentType: file.type, upsert: false });
    if (error) {
      console.error('Community file upload failed:', error.message);
      return NextResponse.json({ error: 'The file could not be uploaded. Try again.' }, { status: 500 });
    }
    return NextResponse.json({ path, name: file.name.slice(0, 200), size: formatBytes(file.size), type: file.type });
  } catch (err) {
    console.error('Community file upload exception:', err);
    return NextResponse.json({ error: 'The file could not be uploaded. Try again.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const guard = await requireActiveRole(isStaff);
  if (!guard.ok) return guard.response;

  const kind = req.nextUrl.searchParams.get('kind');
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if ((kind !== 'post' && kind !== 'dm') || !isUuid(id)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const supabase = await createClient();
  const query =
    kind === 'post'
      ? (supabase.from('community_posts') as any).select('author_id, attachment_path, attachment_name').eq('id', id).is('deleted_at', null)
      : (supabase.from('direct_messages') as any).select('sender_id, attachment_path, attachment_name').eq('id', id);
  const { data } = await query.maybeSingle();
  const owner: string | undefined = kind === 'post' ? data?.author_id : data?.sender_id;
  const path: string | undefined = data?.attachment_path ?? undefined;
  // RLS returned nothing, or the path does not belong to the person who wrote the row.
  if (!data || !owner || !path || !path.startsWith(`${owner}/`)) {
    return NextResponse.json({ error: 'This file is not available.' }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, LINK_SECONDS, { download: data.attachment_name ?? true });
  if (error || !signed?.signedUrl) return NextResponse.json({ error: 'This file is not available.' }, { status: 404 });
  return NextResponse.json({ url: signed.signedUrl, name: data.attachment_name ?? 'file' }, { headers: { 'Cache-Control': 'private, no-store' } });
}
