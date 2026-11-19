import { AlignmentType, Document, ImageRun, Packer, Paragraph, type Table } from 'docx';
import { cell, para, row, run, t, table, W } from './form3Docx';
import { DAY_TYPE_LABELS, buildRows, monthTitle, shortDate, summarize, lastDay, firstDay, type StatementStatus, type WorkDay } from './workStatement';

/** The Word file of one monthly Work Statement (layout of the SKB Daily Work Statement). Runs in the browser. */

export interface SignerLine {
  name: string;
  /** "dd Mon yyyy" the step was done in the portal, or null when it is not done yet. */
  doneOn: string | null;
  /** A saved signature picture as a data URL, when the signer chose to add it. */
  signature: string | null;
}
export interface WorkStatementDocData {
  ownerName: string;
  role: string;
  month: string; // YYYY-MM
  status: StatementStatus;
  days: WorkDay[];
  prepared: SignerLine;
  verified: SignerLine | null; // null: this person has no verifier
  approved: SignerLine | null;
}

/** Width and height of a PNG or JPEG, or null when unknown. */
export function imageSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length > 24 && bytes[0] === 0x89 && bytes[1] === 0x50) {
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: v.getUint32(16), height: v.getUint32(20) };
  }
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = bytes[i + 1]!;
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: (bytes[i + 5]! << 8) | bytes[i + 6]!, width: (bytes[i + 7]! << 8) | bytes[i + 8]! };
      }
      i += 2 + ((bytes[i + 2]! << 8) | bytes[i + 3]!);
    }
  }
  return null;
}

function signatureImage(dataUrl: string | null): Paragraph | null {
  if (!dataUrl) return null;
  const m = /^data:image\/(png|jpeg);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  const bytes = Uint8Array.from(Buffer.from(m[2]!, 'base64'));
  const size = imageSize(bytes);
  if (!size || size.width === 0 || size.height === 0) return null;
  const scale = Math.min(130 / size.width, 48 / size.height, 1);
  return new Paragraph({
    spacing: { after: 20 },
    children: [new ImageRun({ type: m[1] === 'png' ? 'png' : 'jpg', data: bytes, transformation: { width: Math.round(size.width * scale), height: Math.round(size.height * scale) } })],
  });
}

function signerCell(label: string, s: SignerLine | null, width: number) {
  const parts: Paragraph[] = [];
  if (s === null) {
    parts.push(...t(`${label}`, true), ...t('Not required for this person'), new Paragraph({ children: [] }));
    return cell(parts, width);
  }
  const img = s.doneOn ? signatureImage(s.signature) : null;
  parts.push(...t(label, true));
  parts.push(img ?? new Paragraph({ spacing: { before: 360, after: 20 }, children: [run('______________________')] }));
  parts.push(new Paragraph({ spacing: { after: 20 }, children: [run(s.name, { bold: true })] }));
  parts.push(new Paragraph({ spacing: { after: 20 }, children: [run(s.doneOn ? `Done in the portal on ${s.doneOn}` : 'Not done yet', { italics: true, size: 16 })] }));
  return cell(parts, width);
}

export function buildWorkStatementDocument(d: WorkStatementDocData): Document {
  const rows = buildRows(d.month, d.days);
  const sum = summarize(rows);
  const title = monthTitle(d.month);
  const approved = d.status === 'approved';
  const aw = [1350, 700, 1950, W - 1350 - 700 - 1950];
  const half = W / 2;

  const children: Array<Paragraph | Table> = [
    para(`DAILY WORK STATEMENT - ${title.toUpperCase()}`, { bold: true, size: 30, align: AlignmentType.CENTER, after: 60 }),
    para(d.ownerName, { bold: true, size: 26, align: AlignmentType.CENTER, after: 120 }),
    table([half, half], [
      row([cell(t(`Role: ${d.role}`), half), cell(t(`Reporting Month: ${title} (${shortDate(firstDay(d.month)).slice(0, 6)} - ${shortDate(lastDay(d.month)).slice(0, 6)})`), half)]),
      row([cell(t('Organization: Small Kindness Bangladesh'), half), cell(t(`Document Status: ${approved ? 'Official Daily Work Log' : 'Draft, not yet approved'}`), half)]),
    ]),
    para('', { after: 80 }),
  ];

  const header = ['Date', 'Day', 'Location / Activity Type', 'Official Tasks & Key Accomplishments'];
  const body = rows.map((r) =>
    row([
      cell(t(shortDate(r.date)), aw[0]!),
      cell(t(r.weekday), aw[1]!),
      cell(t(r.dayType === null ? '(not filled in)' : r.place), aw[2]!),
      cell(t(r.dayType === null ? '' : r.tasks || (r.dayType === 'off' ? 'Off day' : DAY_TYPE_LABELS[r.dayType])), aw[3]!),
    ]),
  );
  children.push(table(aw, [row(header.map((h, i) => cell(t(h, true), aw[i]!, { fill: 'E5E7EB' })), true), ...body]));

  children.push(para('', { after: 80 }));
  children.push(para('Summary of Working Days', { bold: true, size: 22, after: 60 }));
  const q = W / 5;
  children.push(
    table([q, q, q, q, q], [
      row([cell(t('Total Days', true), q), cell(t('Office Duty', true), q), cell(t('Field / Camp Duty', true), q), cell(t('Official Tour', true), q), cell(t('Leave / Off Days', true), q)], false),
      row([cell(t(`${sum.total} Days`), q), cell(t(`${sum.office} Days`), q), cell(t(`${sum.field} Days`), q), cell(t(`${sum.tour} Days`), q), cell(t(`${sum.leave + sum.off} Days (${sum.leave} leave, ${sum.off} off)`), q)]),
    ]),
  );

  children.push(para('', { after: 160 }));
  const third = W / 3;
  children.push(
    table([third, third, third], [
      row([signerCell('Prepared by (P)', d.prepared, third), signerCell('Verified by (V)', d.verified, third), signerCell('Approved by (A)', d.approved, third)]),
    ]),
  );
  children.push(para('Prepared from the SKB Works Portal. A signature picture is added only when the signer chose to add it; the dates show when each step was done in the portal.', { italics: true, size: 16, before: 120 }));

  return new Document({
    creator: 'SKB Works Portal',
    title: `Daily Work Statement - ${d.ownerName} - ${title}`,
    styles: { default: { document: { run: { font: 'Arial', size: 20 } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children }],
  });
}

export async function buildWorkStatementDocx(d: WorkStatementDocData): Promise<Blob> {
  return Packer.toBlob(buildWorkStatementDocument(d));
}
