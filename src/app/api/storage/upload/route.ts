import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requireActiveRole } from '@/lib/auth/guards';
import { contentMatchesMime, isUuid } from '@/lib/apiAccess';
import { hasPermission } from '@/lib/permissions';

const BUCKET = 'project-documents';
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const SIGNED_URL_SECONDS = 60 * 60; // 1 hour
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/** Only simple identifiers are allowed in storage paths (prevents path traversal like "../"). */
function safeSegment(value: string, fallback: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned.length > 0 && cleaned.length <= 64 ? cleaned : fallback;
}

export async function POST(req: NextRequest) {
  // The service-role client below bypasses Row Level Security, so check the person here:
  // active, with permission to add documents.
  const guard = await requireActiveRole((roles) => hasPermission(roles, 'document.write'));
  if (!guard.ok) return guard.response;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const projectId = ((formData.get('projectId') as string) || '').trim();
    const category = safeSegment((formData.get('category') as string) || '', 'MANDATORY_PRIMARY');
    const docName = ((formData.get('docName') as string) || (file ? file.name : 'document')).slice(0, 200);

    if (!file) {
      return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
    }

    // The project must be a real one that THIS person may access (checked with their own
    // access rights, not the service role).
    if (!isUuid(projectId)) {
      return NextResponse.json({ error: 'Choose a project to attach this document to.' }, { status: 400 });
    }
    const userClient = await createClient();
    const { data: project } = await (userClient.from('projects') as any)
      .select('id')
      .eq('id', projectId)
      .is('deleted_at', null)
      .maybeSingle();
    if (!project) {
      return NextResponse.json({ error: 'You do not have access to this project.' }, { status: 403 });
    }
    if (file.size === 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File must be between 1 byte and 25 MB.' }, { status: 413 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed. Upload PDF, Word, Excel, CSV, JPG, PNG or WEBP.' },
        { status: 415 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!contentMatchesMime(file.type, buffer.subarray(0, 16))) {
      return NextResponse.json({ error: 'The file content does not match its type.' }, { status: 415 });
    }
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    const storagePath = `${projectId}/${Date.now()}-${crypto.randomUUID()}-${sanitizedFileName}`;

    // Service role is used only AFTER the caller is authenticated above.
    const supabase = createAdminClient();

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false, // never overwrite an existing document
    });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return NextResponse.json({ error: 'Storage upload failed.' }, { status: 500 });
    }

    // Private bucket: return a short-lived signed link, never a permanent public URL.
    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_SECONDS);

    if (signError || !signed) {
      console.error('Supabase signed URL error:', signError);
      return NextResponse.json({ error: 'Uploaded, but could not create a download link.' }, { status: 500 });
    }

    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const sizeInKB = (file.size / 1024).toFixed(0);
    const fileSizeStr = file.size > 1024 * 1024 ? `${sizeInMB} MB` : `${sizeInKB} KB`;

    return NextResponse.json({
      success: true,
      fileName: docName,
      fileUrl: signed.signedUrl,
      storagePath,
      fileSize: fileSizeStr,
      fileType: file.type,
      category,
      projectId,
      uploadedBy: guard.user.id,
      uploadedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Storage route exception:', err);
    return NextResponse.json({ error: 'Internal server error while uploading.' }, { status: 500 });
  }
}
