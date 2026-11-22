// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { buildLetterDocx, type LetterDocData } from '../letterDocx';

const template = readFileSync(join(process.cwd(), 'public/templates/SKB_Letterhead_Pad.docx'));
// 1x1 PNG
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const base: LetterDocData = {
  ref: 'SKB-001/26', date: '22 Nov 2026', toLines: 'The Director\nA & B <Ltd>', subject: 'Thanks', salutation: 'Dear Sir,',
  body: 'First paragraph.\n\nদ্বিতীয় অনুচ্ছেদ', closing: 'Sincerely,', signatoryName: 'Shishir', signatoryTitle: 'ED', cc: 'File',
  signature: null, stamp: null, isDraft: false,
};
async function open(d: LetterDocData) {
  const blob = await buildLetterDocx(d, template);
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  return { zip, xml: await zip.file('word/document.xml')!.async('string') };
}

describe('buildLetterDocx', () => {
  it('writes the text, escapes it, and keeps the footer', async () => {
    const { zip, xml } = await open(base);
    expect(xml).toContain('SKB-001/26');
    expect(xml).toContain('22 Nov 2026');
    expect(xml).toContain('A &amp; B &lt;Ltd&gt;');
    expect(xml).toContain('দ্বিতীয় অনুচ্ছেদ');
    expect(xml).not.toContain('DRAFT');
    expect(zip.file('word/footer1.xml')).toBeTruthy();
  });
  it('marks a draft', async () => {
    expect((await open({ ...base, isDraft: true })).xml).toMatch(/draft/i);
  });
  it('adds pictures only when given', async () => {
    const without = await open(base);
    expect(without.xml).not.toContain('r:embed="rId20"');
    const withPics = await open({ ...base, signature: PNG, stamp: PNG });
    expect(withPics.xml).toContain('r:embed="rId20"');
    expect(withPics.xml).toContain('r:embed="rId21"');
  });
});
