'use client';

import { useCallback, useState } from 'react';
import { uploadFile } from '@/lib/community/client';
import { fileProblem, formatBytes, type Attachment } from '@/lib/community/model';

export interface PendingAttachment {
  name: string;
  size: string;
  uploading: boolean;
  attachment: Attachment | null;
}

/** Picks a file, checks it, and uploads it right away so sending is instant. */
export function useAttachment(onError: (message: string) => void) {
  const [pending, setPending] = useState<PendingAttachment | null>(null);

  const pick = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      const problem = fileProblem(file);
      if (problem) {
        onError(problem);
        return;
      }
      setPending({ name: file.name, size: formatBytes(file.size), uploading: true, attachment: null });
      const res = await uploadFile(file);
      if (!res.ok) {
        setPending(null);
        onError(res.error);
        return;
      }
      setPending({ name: file.name, size: formatBytes(file.size), uploading: false, attachment: res.data });
    },
    [onError]
  );

  const clear = useCallback(() => setPending(null), []);
  return { pending, pick, clear };
}
