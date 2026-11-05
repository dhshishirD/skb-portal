import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import { formatDate, formatMoney } from './fundReceipts';

/**
 * The acknowledgement letter for one fund receipt, as a one-page PDF to print, sign by hand and scan
 * (current practice). Plain wording; the text is limited to characters the built-in font can draw.
 */
export interface ReceiptLetterInput {
  organisationName: string;
  registrationNo: string | null;
  donorName: string | null;
  projectCode: string;
  projectTitle: string;
  receivedOn: string; // yyyy-mm-dd
  amount: number;
  currency: string;
  reference: string | null;
  issuedOn: string; // yyyy-mm-dd
}

/** Replace anything the standard font cannot draw (outside Latin-1) with "?". */
export const pdfSafe = (text: string): string =>
  text.replace(/[\r\n\t]+/g, ' ').replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of pdfSafe(text).split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth || !line) line = test;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function buildReceiptLetter(input: ReceiptLetterInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(pdfSafe(`Fund receipt acknowledgement - ${input.projectCode}`));
  doc.setCreator('SKB Works Portal');
  const page = doc.addPage([595.28, 841.89]); // A4
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const left = 64;
  const width = 595.28 - left * 2;
  let y = 770;

  const line = (text: string, opts: { font?: PDFFont; size?: number; gap?: number } = {}) => {
    const font = opts.font ?? regular;
    const size = opts.size ?? 11;
    for (const l of wrap(text, font, size, width)) {
      page.drawText(l, { x: left, y, size, font, color: rgb(0.1, 0.1, 0.1) });
      y -= size * 1.5;
    }
    y -= opts.gap ?? 0;
  };

  line(input.organisationName, { font: bold, size: 16 });
  if (input.registrationNo) line(`Registration no. ${input.registrationNo}`, { size: 9, gap: 6 });
  page.drawLine({ start: { x: left, y }, end: { x: left + width, y }, thickness: 0.8, color: rgb(0.6, 0.6, 0.6) });
  y -= 28;

  line(`Date: ${formatDate(input.issuedOn)}`, { gap: 10 });
  line(`To: ${input.donorName?.trim() || 'The donor'}`, { gap: 14 });
  line('Acknowledgement of fund receipt', { font: bold, size: 14, gap: 10 });
  line(`Project: ${input.projectCode} - ${input.projectTitle}`, { gap: 12 });

  line(
    `We acknowledge with thanks the receipt of ${input.currency} ${formatMoney(Math.round(input.amount * 100))} ` +
      `on ${formatDate(input.receivedOn)}` +
      (input.reference ? ` (bank reference: ${input.reference})` : '') +
      ' for the above project.',
    { gap: 12 },
  );
  line('The amount will be used only for the purpose agreed with you, and we will report on its use as agreed.', { gap: 40 });

  line('With thanks and best regards,', { gap: 60 });
  page.drawLine({ start: { x: left, y: y + 14 }, end: { x: left + 200, y: y + 14 }, thickness: 0.6, color: rgb(0.2, 0.2, 0.2) });
  line('Executive Director', { font: bold, gap: 0 });
  line(input.organisationName, { size: 10 });
  line('Signature and stamp', { size: 9 });

  return doc.save();
}
