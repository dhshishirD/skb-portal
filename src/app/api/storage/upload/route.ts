import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const projectId = (formData.get('projectId') as string) || 'GENERAL';
    const category = (formData.get('category') as string) || 'MANDATORY_PRIMARY';
    const docName = (formData.get('docName') as string) || (file ? file.name : 'document.pdf');

    if (!file) {
      return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize file name
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${projectId}/${Date.now()}-${sanitizedFileName}`;

    const supabase = createAdminClient();

    // Upload binary directly to Supabase storage bucket project-documents
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-documents')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Retrieve public CDN URL
    const { data: publicData } = supabase.storage
      .from('project-documents')
      .getPublicUrl(storagePath);

    const publicUrl = publicData.publicUrl;

    // Format file size string
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const sizeInKB = (file.size / 1024).toFixed(0);
    const fileSizeStr = file.size > 1024 * 1024 ? `${sizeInMB} MB` : `${sizeInKB} KB`;

    return NextResponse.json({
      success: true,
      fileName: docName,
      fileUrl: publicUrl,
      storagePath,
      fileSize: fileSizeStr,
      fileType: file.type || 'application/pdf',
      category,
      projectId,
      uploadedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Storage route exception:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error while uploading to cloud storage' },
      { status: 500 }
    );
  }
}
