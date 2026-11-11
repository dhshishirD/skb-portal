'use client';

import { useState } from 'react';
import { FileText, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { fileLink } from '@/lib/community/client';

function Icon({ type }: { type: string | null }) {
  return type?.startsWith('image/') ? (
    <ImageIcon className="h-4 w-4" aria-hidden="true" />
  ) : (
    <FileText className="h-4 w-4" aria-hidden="true" />
  );
}

/** A file attached to a post or message. Opening it asks the server for a short-lived link. */
export function FileChip({
  kind,
  id,
  name,
  size,
  type,
  tone = 'light',
  onError,
}: {
  kind: 'post' | 'dm';
  id: string;
  name: string;
  size: string | null;
  type: string | null;
  tone?: 'light' | 'dark';
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function open() {
    setBusy(true);
    const res = await fileLink(kind, id);
    setBusy(false);
    if (!res.ok) {
      onError(res.error);
      return;
    }
    const a = document.createElement('a');
    a.href = res.data.url;
    a.rel = 'noopener';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const colours =
    tone === 'dark'
      ? 'bg-white/15 text-white hover:bg-white/25 focus-visible:ring-white'
      : 'bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-100 focus-visible:ring-blue-500';

  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      className={`inline-flex max-w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 disabled:opacity-70 ${colours}`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Icon type={type} />}
      <span className="min-w-0 truncate font-medium">{name}</span>
      {size && <span className="shrink-0 text-xs opacity-70">{size}</span>}
    </button>
  );
}

/** A file picked but not sent yet. */
export function PendingFile({
  name,
  size,
  uploading,
  onRemove,
}: {
  name: string;
  size: string;
  uploading: boolean;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900 ring-1 ring-inset ring-blue-100">
      {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
      <span className="min-w-0 truncate font-medium">{name}</span>
      <span className="shrink-0 text-xs opacity-70">{uploading ? 'Uploading' : size}</span>
      <button
        type="button"
        onClick={onRemove}
        className="-mr-1 rounded p-1 text-blue-700 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label={`Remove ${name}`}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </span>
  );
}
