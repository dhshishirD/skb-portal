export interface UploadResult {
  success: boolean;
  fileName: string;
  fileUrl: string;
  storagePath?: string;
  fileSize: string;
  fileType: string;
  error?: string;
}

export class CloudStorageService {
  /**
   * Upload a file directly to the Supabase cloud bucket 'project-documents' via API route.
   * If network is unavailable, safely falls back to local data URL.
   */
  public static async uploadFile(
    file: File,
    projectId: string,
    docName?: string,
    category?: string
  ): Promise<UploadResult> {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const sizeInKB = (file.size / 1024).toFixed(0);
    const fileSizeStr = file.size > 1024 * 1024 ? `${sizeInMB} MB` : `${sizeInKB} KB`;
    const resolvedDocName = docName || file.name;

    // Upload through the authenticated API route (the old check only uploaded on localhost:3000).
    if (typeof window !== 'undefined') {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', projectId);
        formData.append('docName', resolvedDocName);
        if (category) formData.append('category', category);

        const res = await fetch('/api/storage/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          return {
            success: true,
            fileName: data.fileName || resolvedDocName,
            fileUrl: data.fileUrl,
            storagePath: data.storagePath,
            fileSize: data.fileSize || fileSizeStr,
            fileType: data.fileType || file.type || 'application/pdf',
          };
        }
      } catch (err: any) {
        // Fallback to offline data URL
      }
    }

    // Offline / fallback data URL generation
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          success: true,
          fileName: resolvedDocName,
          fileUrl: (reader.result as string) || '',
          fileSize: fileSizeStr,
          fileType: file.type || 'application/pdf',
        });
      };
      reader.onerror = () => {
        resolve({
          success: false,
          error: 'Could not read the file on this device.',
          fileName: resolvedDocName,
          fileUrl: '',
          fileSize: fileSizeStr,
          fileType: file.type || 'application/pdf',
        });
      };
      reader.readAsDataURL(file);
    });
  }
}
