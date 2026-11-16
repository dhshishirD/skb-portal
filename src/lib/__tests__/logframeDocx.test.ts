// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildLogframeDocx } from '../logframeDocx';

describe('logframe Word file', () => {
  it('makes a real .docx (a zip with word/document.xml) that holds the text', async () => {
    const blob = await buildLogframeDocx('Test project', [
      { kind: 'goal', label: 'Goal', narrative: ['G  Better lives'], indicators: [], verification: [], assumptions: ['G  Peace holds'] },
    ]);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK');
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file('word/document.xml')!.async('string');
    expect(xml).toContain('Better lives');
    expect(xml).toContain('Peace holds');
    expect(xml).toContain('Test project');
  });
});
