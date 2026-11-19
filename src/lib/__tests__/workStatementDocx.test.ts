// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildWorkStatementDocx, imageSize } from '../workStatementDocx';

// 1x1 transparent PNG
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

async function xmlOf(blob: Blob) {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(new Uint8Array(await blob.arrayBuffer()));
  return { xml: await zip.file('word/document.xml')!.async('string'), files: Object.keys(zip.files) };
}

describe('work statement Word file', () => {
  const base = {
    ownerName: 'Test Person',
    role: 'Program Officer',
    month: '2026-08',
    days: [
      { date: '2026-08-02', dayType: 'office' as const, place: '', tasks: 'Wrote the concept note', projectId: null },
      { date: '2026-08-03', dayType: 'tour' as const, place: 'KL', tasks: 'Visited', projectId: null },
    ],
  };
  it('holds the header, every day, the summary and the signers', async () => {
    const blob = await buildWorkStatementDocx({
      ...base,
      status: 'approved',
      prepared: { name: 'Test Person', doneOn: '31 Aug 2026', signature: null },
      verified: { name: 'Verifier One', doneOn: '01 Sep 2026', signature: null },
      approved: { name: 'Approver Two', doneOn: '02 Sep 2026', signature: null },
    });
    expect(String.fromCharCode(...new Uint8Array(await blob.slice(0, 2).arrayBuffer()))).toBe('PK');
    const { xml } = await xmlOf(blob);
    for (const s of ['DAILY WORK STATEMENT - AUGUST 2026', 'Test Person', 'Program Officer', 'Official Daily Work Log', '02 Aug 2026', 'Wrote the concept note', 'KL', 'Central Office', 'Total Days', '31 Days', 'Verifier One', 'Approver Two', 'Done in the portal on 02 Sep 2026']) {
      expect(xml).toContain(s);
    }
    expect(xml).toContain('Weekend');
  });
  it('is marked as a draft until approved, and says when there is no verifier', async () => {
    const { xml } = await xmlOf(
      await buildWorkStatementDocx({ ...base, status: 'draft', prepared: { name: 'Test Person', doneOn: null, signature: null }, verified: null, approved: { name: 'Approver Two', doneOn: null, signature: null } }),
    );
    expect(xml).toContain('Draft, not yet approved');
    expect(xml).toContain('Not required for this person');
    expect(xml).toContain('(not filled in)');
  });
  it('adds a signature picture only for a step that is done, and none otherwise', async () => {
    const sig = `data:image/png;base64,${PNG}`;
    const withSig = await xmlOf(
      await buildWorkStatementDocx({ ...base, status: 'submitted', prepared: { name: 'Test Person', doneOn: '31 Aug 2026', signature: sig }, verified: { name: 'V', doneOn: null, signature: sig }, approved: null }),
    );
    expect(withSig.files.filter((f) => f.startsWith('word/media/'))).toHaveLength(1); // prepared only: the verifier has not acted yet
  });
  it('reads the size of PNG pictures', () => {
    expect(imageSize(Uint8Array.from(Buffer.from(PNG, 'base64')))).toEqual({ width: 1, height: 1 });
    expect(imageSize(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});
