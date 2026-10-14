import { describe, it, expect } from 'vitest';
import { CloudStorageService } from '../cloudStorageService';

describe('Phase 2: CloudStorageService Supabase Bucket Linking', () => {
  it('should correctly format public CDN URL for a given storage path', () => {
    const path = 'BD-SKB-2026-COW-20/17912708-form7.pdf';
    const publicUrl = CloudStorageService.getPublicUrl(path);

    expect(publicUrl).toContain('supabase.co');
    expect(publicUrl).toContain('project-documents');
    expect(publicUrl).toContain(path);
  });

  it('should handle file upload and generate accessible fileUrl', async () => {
    const file = new File(['%PDF-1.4 Mock Bovine Health Certificate Content'], 'bovine-health.pdf', {
      type: 'application/pdf',
    });

    const result = await CloudStorageService.uploadFile(
      file,
      'BD-SKB-2026-COW-20',
      'bovine-health.pdf',
      'MANDATORY_PRIMARY'
    );

    expect(result.success).toBe(true);
    expect(result.fileName).toBe('bovine-health.pdf');
    expect(result.fileUrl).toBeDefined();
    expect(result.fileUrl.length).toBeGreaterThan(0);
    expect(result.fileType).toBe('application/pdf');
  });

  it('should support image uploads and capture correct MIME type and size', async () => {
    const imageFile = new File(['mock-image-bytes'], 'livestock-distribution.jpg', {
      type: 'image/jpeg',
    });

    const res = await CloudStorageService.uploadFile(
      imageFile,
      'BD-SKB-2026-COW-20',
      'livestock-distribution.jpg'
    );

    expect(res.success).toBe(true);
    expect(res.fileName).toBe('livestock-distribution.jpg');
    expect(res.fileType).toBe('image/jpeg');
    expect(res.fileSize).toBeDefined();
  });
});
