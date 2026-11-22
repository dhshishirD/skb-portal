import JSZip from 'jszip';
import { bodyParagraphs, nonEmptyLines } from './letters';
import { imageSize } from './workStatementDocx';

/**
 * Builds a letter as a Word file on the SKB letterhead pad. The pad (public/templates/SKB_Letterhead_Pad.docx) keeps
 * its picture, page size and the footer with the address; only the text of the page is replaced here. The Ref and
 * Date go on the pad's own lines, then the letter. A signature and a stamp are added only when given.
 */

export interface LetterDocData {
  /** "SKB-082/26", or "Draft" before the letter is issued. */
  ref: string;
  /** "22 Nov 2026". */
  date: string;
  toLines: string;
  subject: string;
  salutation: string;
  body: string;
  closing: string;
  signatoryName: string;
  signatoryTitle: string;
  cc: string;
  /** data: URLs (PNG or JPEG) or null. */
  signature: string | null;
  stamp: string | null;
  isDraft: boolean;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const RFONTS = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Nirmala UI"/>';

interface RunOpts { bold?: boolean; italics?: boolean; underline?: boolean; size?: number; color?: string }
function runs(text: string, o: RunOpts = {}): string {
  const size = o.size ?? 24;
  const rpr = `<w:rPr>${RFONTS}${o.bold ? '<w:b/><w:bCs/>' : ''}${o.italics ? '<w:i/><w:iCs/>' : ''}${o.color ? `<w:color w:val="${o.color}"/>` : ''}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>${o.underline ? '<w:u w:val="single"/>' : ''}</w:rPr>`;
  return text
    .split('\n')
    .map((line, i) => `<w:r>${rpr}${i > 0 ? '<w:br/>' : ''}<w:t xml:space="preserve">${esc(line)}</w:t></w:r>`)
    .join('');
}

interface ParaOpts extends RunOpts {
  align?: 'left' | 'both' | 'center' | 'right';
  before?: number;
  after?: number;
  keepNext?: boolean;
  keepLines?: boolean;
  ind?: string;
  tabs?: string;
}
function para(inner: string, o: ParaOpts = {}): string {
  return `<w:p><w:pPr>${o.keepNext ? '<w:keepNext/>' : ''}${o.keepLines ? '<w:keepLines/>' : ''}${o.tabs ?? ''}<w:spacing w:before="${o.before ?? 0}" w:after="${o.after ?? 0}" w:line="276" w:lineRule="auto"/>${o.ind ?? ''}<w:jc w:val="${o.align ?? 'left'}"/></w:pPr>${inner}</w:p>`;
}
const text = (t: string, o: ParaOpts = {}) => para(runs(t, o), o);

interface Pic { rid: string; cx: number; cy: number; id: number; name: string }
const EMU = 9525;
function picture(p: Pic): string {
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${p.cx}" cy="${p.cy}"/><wp:docPr id="${p.id}" name="${p.name}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="${p.name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${p.rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${p.cx}" cy="${p.cy}"/></a:xfrm><a:prstGeom prst="rect"/></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

interface Img { bytes: Uint8Array; ext: 'png' | 'jpeg'; width: number; height: number }
function readImage(dataUrl: string | null): Img | null {
  if (!dataUrl) return null;
  const m = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  const bytes = Uint8Array.from(atob(m[2]!), (c) => c.charCodeAt(0));
  const size = imageSize(bytes);
  if (!size || size.width === 0 || size.height === 0) return null;
  return { bytes, ext: m[1] === 'png' ? 'png' : 'jpeg', ...size };
}
const fit = (img: Img, maxW: number, maxH: number) => {
  const s = Math.min(maxW / img.width, maxH / img.height, 1);
  return { cx: Math.round(img.width * s) * EMU, cy: Math.round(img.height * s) * EMU };
};

export async function buildLetterDocx(d: LetterDocData, template: ArrayBuffer | Uint8Array): Promise<Blob> {
  const zip = await JSZip.loadAsync(template);
  const docFile = zip.file('word/document.xml');
  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (!docFile || !relsFile) throw new Error('The letterhead pad file is not valid.');
  const original = await docFile.async('string');
  const open = /<w:document[^>]*>/.exec(original)?.[0];
  const sect = /<w:sectPr[\s\S]*<\/w:sectPr>/.exec(original)?.[0];
  if (!open || !sect) throw new Error('The letterhead pad file is not valid.');

  const sig = readImage(d.signature);
  const stamp = readImage(d.stamp);
  let rels = await relsFile.async('string');
  const pics: string[] = [];
  const addMedia = (img: Img, rid: string, file: string, name: string, id: number, maxW: number, maxH: number) => {
    zip.file(`word/media/${file}.${img.ext}`, img.bytes);
    rels = rels.replace('</Relationships>', `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${file}.${img.ext}"/></Relationships>`);
    pics.push(picture({ rid, ...fit(img, maxW, maxH), id, name }));
  };
  if (sig) addMedia(sig, 'rId20', 'letter-signature', 'Signature', 21, 160, 60);
  if (stamp) addMedia(stamp, 'rId21', 'letter-stamp', 'Stamp', 22, 100, 100);

  const body: string[] = [];
  // Ref and Date sit on the pad's own lines: they start a little left of the page margin, where the pad prints them.
  body.push(
    para(`${runs(d.ref, { bold: true, size: 22 })}<w:r>${RFONTS}<w:tab/></w:r>${runs(d.date, { bold: true, size: 22 })}`, {
      ind: '<w:ind w:left="-294" w:right="-700"/>',
      tabs: '<w:tabs><w:tab w:val="left" w:pos="8656"/></w:tabs>',
    }),
  );
  if (d.isDraft) body.push(text('DRAFT: not issued yet, no Ref number', { bold: true, size: 18, color: 'B45309', before: 60 }));

  const to = nonEmptyLines(d.toLines);
  if (to.length) {
    body.push(text('To', { before: 360, after: 40, keepNext: true }));
    to.forEach((line, i) => body.push(text(line, { bold: i === 0, after: 0, keepNext: i < to.length - 1 })));
  }
  if (d.subject.trim()) body.push(text(`Subject: ${d.subject.trim()}`, { bold: true, underline: true, before: 280, after: 200, keepNext: true }));
  if (d.salutation.trim()) body.push(text(d.salutation.trim(), { before: d.subject.trim() ? 0 : 280, after: 160, keepNext: true }));
  for (const p of bodyParagraphs(d.body)) body.push(text(p, { align: 'both', after: 160 }));

  // The closing, the signature and the stamp stay together on one page.
  body.push(text(d.closing.trim() || 'Sincerely,', { before: 200, after: 60, keepNext: true, keepLines: true }));
  if (pics.length) body.push(para(pics.join('<w:r><w:t xml:space="preserve">   </w:t></w:r>'), { before: 40, after: 40, keepNext: true }));
  else body.push(text('', { before: 480, after: 0, keepNext: true }));
  if (d.signatoryName.trim()) body.push(text(d.signatoryName.trim(), { bold: true, keepNext: !!(d.signatoryTitle.trim() || d.cc.trim()) }));
  if (d.signatoryTitle.trim()) body.push(text(d.signatoryTitle.trim(), { keepNext: true }));
  body.push(text('Small Kindness Bangladesh (SKB)', { keepNext: !!d.cc.trim() }));
  const cc = nonEmptyLines(d.cc);
  if (cc.length) {
    body.push(text('Cc:', { bold: true, size: 22, before: 240, after: 20, keepNext: true }));
    cc.forEach((line, i) => body.push(text(line, { size: 22, keepNext: i < cc.length - 1 })));
  }

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${open}<w:body>${body.join('')}${sect}</w:body></w:document>`);
  zip.file('word/_rels/document.xml.rels', rels);
  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  return new Blob([bytes as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
