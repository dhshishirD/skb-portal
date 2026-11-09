import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { CHARTER_FIELDS, formatCharterDate, type CharterProjectFacts, type CharterText } from './charter';
import { pdfSafe } from './fundReceiptLetter';

export interface CharterPdfInput {
  organisationName: string;
  facts: CharterProjectFacts;
  version: number;
  text: CharterText;
  changeNote: string | null;
  savedOn: string; // ISO timestamp of the version
  approvedOn: string | null;
  approvedByName: string | null;
}

const PAGE = { w: 595.28, h: 841.89, margin: 56 };

export function wrapLine(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    let w = word;
    // a single very long word is cut so it cannot run off the page
    while (font.widthOfTextAtSize(w, size) > maxWidth && w.length > 1) {
      let cut = w.length - 1;
      while (cut > 1 && font.widthOfTextAtSize(w.slice(0, cut), size) > maxWidth) cut--;
      if (line) { out.push(line); line = ''; }
      out.push(w.slice(0, cut));
      w = w.slice(cut);
    }
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth || !line) line = test;
    else { out.push(line); line = w; }
  }
  if (line) out.push(line);
  return out;
}

/** The charter (one saved version) plus the project facts, as a PDF to print, sign and scan. */
export async function buildCharterPdf(input: CharterPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(pdfSafe(`Project charter ${input.facts.code} v${input.version}`));
  doc.setCreator('SKB Works Portal');
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const width = PAGE.w - PAGE.margin * 2;
  let page: PDFPage = doc.addPage([PAGE.w, PAGE.h]);
  let y = PAGE.h - PAGE.margin;

  const ensure = (need: number) => {
    if (y - need < PAGE.margin + 24) {
      page = doc.addPage([PAGE.w, PAGE.h]);
      y = PAGE.h - PAGE.margin;
    }
  };
  const write = (text: string, opts: { font?: PDFFont; size?: number; gap?: number; indent?: number } = {}) => {
    const font = opts.font ?? regular;
    const size = opts.size ?? 10.5;
    const indent = opts.indent ?? 0;
    for (const l of wrapLine(pdfSafe(text), font, size, width - indent)) {
      ensure(size * 1.5);
      page.drawText(l, { x: PAGE.margin + indent, y, size, font, color: rgb(0.1, 0.1, 0.1) });
      y -= size * 1.45;
    }
    y -= opts.gap ?? 0;
  };
  // each non-empty line the author typed is its own paragraph
  const paragraphs = (text: string) => text.split(/\r?\n/).map((p) => p.trim()).filter(Boolean);

  write(input.organisationName, { font: bold, size: 15, gap: 2 });
  write('Project charter', { font: bold, size: 12, gap: 8 });
  page.drawLine({ start: { x: PAGE.margin, y: y + 6 }, end: { x: PAGE.margin + width, y: y + 6 }, thickness: 0.8, color: rgb(0.6, 0.6, 0.6) });
  y -= 10;

  const f = input.facts;
  const money = f.budgetAmount === null ? '—' : `${f.currency} ${f.budgetAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const facts: Array<[string, string]> = [
    ['Project', `${f.code} - ${f.title}`],
    ['Donor', f.donorName ?? '—'],
    ['Location', f.location ?? '—'],
    ['Donor amount', money],
    ['Target beneficiaries', f.beneficiaryTarget === null ? '—' : f.beneficiaryTarget.toLocaleString('en-US')],
    ['Start', formatCharterDate(f.startDate ? `${f.startDate}T00:00:00+06:00` : null)],
    ['End', formatCharterDate(f.endDate ? `${f.endDate}T00:00:00+06:00` : null)],
    ['Charter version', `${input.version} (saved ${formatCharterDate(input.savedOn)})`],
  ];
  for (const [k, v] of facts) {
    ensure(16);
    page.drawText(pdfSafe(k), { x: PAGE.margin, y, size: 10, font: bold, color: rgb(0.25, 0.25, 0.25) });
    const lines = wrapLine(pdfSafe(v), regular, 10, width - 140);
    for (const l of lines) {
      ensure(14);
      page.drawText(l, { x: PAGE.margin + 140, y, size: 10, font: regular, color: rgb(0.1, 0.1, 0.1) });
      y -= 14;
    }
  }
  y -= 8;

  for (const fld of CHARTER_FIELDS) {
    ensure(40);
    write(fld.label, { font: bold, size: 12, gap: 2 });
    const text = input.text[fld.key];
    const ps = paragraphs(text);
    if (ps.length === 0) write('Not yet written.', { gap: 8 });
    else ps.forEach((p, i) => write(p, { gap: i === ps.length - 1 ? 8 : 3 }));
  }
  if (input.changeNote) write(`What changed in this version: ${input.changeNote}`, { size: 9.5, gap: 8 });

  ensure(130);
  y -= 16;
  write('Approval', { font: bold, size: 12, gap: 4 });
  write(
    input.approvedOn
      ? `Approved in the portal by ${input.approvedByName ?? 'the Executive Director'} on ${formatCharterDate(input.approvedOn)}.`
      : 'Not yet approved in the portal.',
    { gap: 40 },
  );
  page.drawLine({ start: { x: PAGE.margin, y: y + 14 }, end: { x: PAGE.margin + 200, y: y + 14 }, thickness: 0.6, color: rgb(0.2, 0.2, 0.2) });
  write('Executive Director - signature and stamp', { size: 9 });

  // page numbers
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(`${pdfSafe(input.facts.code)}  charter v${input.version}  -  page ${i + 1} of ${pages.length}`, {
      x: PAGE.margin, y: 30, size: 8, font: regular, color: rgb(0.45, 0.45, 0.45),
    });
  });
  return doc.save();
}
