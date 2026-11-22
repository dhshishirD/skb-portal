import { getLetterPicturesAction } from '@/server/actions/letters';
import { letterFileName, padDate, type LetterInfo } from '@/lib/letters';
import { todayInDhaka } from '@/lib/workStatement';

/** Builds the Word file of a letter on the SKB pad and saves it. A draft shows "Draft" in place of the Ref number. */
export async function downloadLetterDocx(l: LetterInfo): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const [pictures, template] = await Promise.all([getLetterPicturesAction(l.id), fetch('/templates/SKB_Letterhead_Pad.docx')]);
    if (!template.ok) return { ok: false, error: 'Could not load the letterhead pad. Please try again.' };
    const { buildLetterDocx } = await import('@/lib/letterDocx');
    const draft = l.status === 'draft';
    const blob = await buildLetterDocx(
      {
        ref: l.refNo ?? 'Draft',
        date: padDate(l.letterDate ?? todayInDhaka()),
        toLines: l.toLines,
        subject: l.subject,
        salutation: l.salutation,
        body: l.body,
        closing: l.closing,
        signatoryName: l.signatoryName,
        signatoryTitle: l.signatoryTitle,
        cc: l.cc,
        signature: pictures.ok ? pictures.data.signature : null,
        stamp: pictures.ok ? pictures.data.stamp : null,
        isDraft: draft,
      },
      await template.arrayBuffer(),
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = letterFileName(l);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not make the Word file. Please try again.' };
  }
}
