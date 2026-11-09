import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { wrapLine } from './charterPdf';
import { pdfSafe } from './fundReceiptLetter';
import { formatBdtCents, formatBp, formatMilli, type BudgetCalc, type BudgetItem } from './budget';
import { REPORT_FIELDS, type ReportText } from './closing';

/**
 * Form-7 (the donor's project feedback report) as a PDF to print, sign by hand and scan.
 * Every figure comes from the portal's own records (Budget, Fund receipts, Beneficiaries, Closing).
 * Nothing here is typed by hand, so the same numbers appear on every form.
 */

export interface Form7Input {
  organisationName: string;
  registrationNo: string | null;
  project: {
    code: string;
    title: string;
    donorName: string | null;
    ngoabRef: string | null;
    location: string | null;
    startDate: string | null;
    endDate: string | null;
    beneficiaryTarget: number | null;
  };
  /** Registered people by group; null when the person making the PDF may not read the registry. */
  counts: { women: number; men: number; girls: number; boys: number; unspecified: number; total: number } | null;
  currency: string;
  items: BudgetItem[];
  calc: BudgetCalc;
  exchangeRate: number | null;
  rateDate: string | null;
  receipts: Array<{ receivedOn: string; amount: number; currency: string; reference: string | null }>;
  report: ReportText;
  checklist: Array<{ label: string; done: boolean }>;
  signedOffOn: string | null;
  signedOffByName: string | null;
  madeOn: string; // yyyy-mm-dd
}

const PAGE = { w: 595.28, h: 841.89, margin: 50 };
const ink = rgb(0.1, 0.1, 0.1);
const grey = rgb(0.45, 0.45, 0.45);

const day = (iso: string | null) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '-';
const amount = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function buildForm7Pdf(input: Form7Input): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(pdfSafe(`Form-7 ${input.project.code}`));
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
  const write = (text: string, o: { font?: PDFFont; size?: number; gap?: number; indent?: number; color?: ReturnType<typeof rgb> } = {}) => {
    const font = o.font ?? regular;
    const size = o.size ?? 10;
    const indent = o.indent ?? 0;
    for (const l of wrapLine(pdfSafe(text), font, size, width - indent)) {
      ensure(size * 1.5);
      page.drawText(l, { x: PAGE.margin + indent, y, size, font, color: o.color ?? ink });
      y -= size * 1.45;
    }
    y -= o.gap ?? 0;
  };
  const heading = (n: number, text: string) => {
    ensure(50);
    y -= 6;
    write(`${n}. ${text}`, { font: bold, size: 12, gap: 2 });
    page.drawLine({ start: { x: PAGE.margin, y: y + 8 }, end: { x: PAGE.margin + width, y: y + 8 }, thickness: 0.5, color: rgb(0.75, 0.75, 0.75) });
    y -= 4;
  };
  const pair = (k: string, v: string) => {
    ensure(16);
    page.drawText(pdfSafe(k), { x: PAGE.margin, y, size: 9.5, font: bold, color: rgb(0.25, 0.25, 0.25) });
    const lines = wrapLine(pdfSafe(v), regular, 9.5, width - 170);
    for (const l of lines) {
      ensure(13);
      page.drawText(l, { x: PAGE.margin + 170, y, size: 9.5, font: regular, color: ink });
      y -= 13;
    }
  };
  /** A row of columns; widths are fractions of the page width, last columns right-aligned when `right` is true. */
  const row = (cells: string[], fractions: number[], o: { font?: PDFFont; right?: boolean[] } = {}) => {
    const font = o.font ?? regular;
    const size = 8.5;
    const wrapped = cells.map((c, i) => wrapLine(pdfSafe(c), font, size, width * fractions[i] - 6));
    const lines = Math.max(...wrapped.map((w) => w.length));
    ensure(lines * 11 + 4);
    let x = PAGE.margin;
    wrapped.forEach((w, i) => {
      w.forEach((l, li) => {
        const tx = o.right?.[i] ? x + width * fractions[i] - 6 - font.widthOfTextAtSize(l, size) : x;
        page.drawText(l, { x: tx, y: y - li * 11, size, font, color: ink });
      });
      x += width * fractions[i];
    });
    y -= lines * 11 + 3;
  };
  const rule = () => {
    page.drawLine({ start: { x: PAGE.margin, y: y + 7 }, end: { x: PAGE.margin + width, y: y + 7 }, thickness: 0.4, color: rgb(0.8, 0.8, 0.8) });
  };

  const p = input.project;
  write(input.organisationName, { font: bold, size: 15, gap: 1 });
  if (input.registrationNo) write(`Registration no. ${input.registrationNo}`, { size: 9, color: grey });
  write('Project Feedback Report (Form-7)', { font: bold, size: 13, gap: 2 });
  write(`Made from the portal on ${day(input.madeOn)}. Figures are taken from the project's own records.`, { size: 8.5, color: grey, gap: 4 });

  heading(1, 'Partner and project details');
  pair('Partner', input.organisationName);
  pair('Project code', p.code);
  pair('Project title', p.title);
  pair('Donor', p.donorName ?? '-');
  pair('NGO Affairs Bureau reference', p.ngoabRef ?? '-');
  pair('Location', p.location ?? '-');
  pair('Start', day(p.startDate));
  pair('End', day(p.endDate));

  heading(2, 'Beneficiaries');
  if (p.beneficiaryTarget !== null) pair('Target', p.beneficiaryTarget.toLocaleString('en-US'));
  if (input.counts) {
    const c = input.counts;
    pair('Registered people', c.total.toLocaleString('en-US'));
    pair('Women', String(c.women));
    pair('Men', String(c.men));
    pair('Girls (under 18)', String(c.girls));
    pair('Boys (under 18)', String(c.boys));
    if (c.unspecified > 0) pair('Not classified (no birth year or sex)', String(c.unspecified));
  } else {
    pair('Registered people', 'Not shown (no permission to read the registry)');
  }

  heading(3, 'Report');
  for (const f of REPORT_FIELDS) {
    ensure(34);
    write(f.label, { font: bold, size: 10.5, gap: 1 });
    const text = input.report[f.key].trim();
    if (!text) write('Not written.', { color: grey, gap: 5 });
    else text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).forEach((s, i, a) => write(s, { gap: i === a.length - 1 ? 5 : 2 }));
  }

  heading(4, 'Financial summary');
  const c = input.calc;
  const cur = input.currency;
  const conv = (m: number | null) => (m === null ? '-' : `${cur} ${formatMilli(m)}`);
  pair('Donor amount', conv(c.donorAmountMilli));
  const received = input.receipts.filter((r) => r.currency === cur).reduce((s, r) => s + Math.round(r.amount * 100), 0);
  pair('Received from the donor', `${cur} ${amount(received / 100)}`);
  pair('Number of packages', String(c.packagesCount));
  pair('Cost of one package', c.needsRate && !c.canConvert ? `BDT ${formatBdtCents(c.packageBdtCents)}` : `BDT ${formatBdtCents(c.packageBdtCents)}  (${conv(c.packageConvertedMilli)})`);
  pair('All packages', `BDT ${formatBdtCents(c.allPackagesBdtCents)}  (${conv(c.allPackagesConvertedMilli)})`);
  if (c.oneOffBdtCents > 0) pair('Other one-off costs', `BDT ${formatBdtCents(c.oneOffBdtCents)}  (${conv(c.oneOffConvertedMilli)})`);
  pair('Project cost', `BDT ${formatBdtCents(c.projectBdtCents)}  (${conv(c.projectConvertedMilli)})`);
  pair('Administration cost', `${conv(c.adminConvertedMilli)}  (${formatBp(c.adminBp)} of project cost)`);
  if (c.needsRate) pair('Exchange rate', input.exchangeRate ? `1 ${cur} = BDT ${input.exchangeRate}${input.rateDate ? ` (set ${day(input.rateDate)})` : ''}` : 'Not set');
  y -= 4;

  if (input.items.length > 0) {
    ensure(40);
    write('Package cost table', { font: bold, size: 10.5, gap: 2 });
    const f = [0.36, 0.1, 0.1, 0.14, 0.15, 0.15];
    row(['Item', 'Measure', 'Qty', 'Unit price BDT', 'Line BDT', `Line ${cur}`], f, { font: bold, right: [false, false, true, true, true, true] });
    rule();
    const ordered = [...input.items].sort((a, b) => (a.kind === b.kind ? a.position - b.position : a.kind === 'per_package' ? -1 : 1));
    let lastGroup: string | null | undefined;
    for (const it of ordered) {
      const groupLabel = it.kind === 'one_off' ? 'One-off costs' : it.groupName ?? 'Per package';
      if (groupLabel !== lastGroup) {
        ensure(16);
        write(groupLabel, { font: bold, size: 9, gap: 1 });
        lastGroup = groupLabel;
      }
      const line = c.lines[it.id];
      row(
        [it.name, it.measure, String(it.quantity), it.unitPriceBdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), line ? formatBdtCents(line.lineBdtCents) : '-', line ? formatMilli(line.lineConvertedMilli) : '-'],
        f,
        { right: [false, false, true, true, true, true] },
      );
    }
    y -= 4;
  }

  heading(5, 'Fund received');
  if (input.receipts.length === 0) write('No receipts recorded.', { color: grey, gap: 4 });
  else {
    const f = [0.22, 0.2, 0.58];
    row(['Date', 'Amount', 'Reference'], f, { font: bold, right: [false, true, false] });
    rule();
    for (const r of input.receipts) row([day(r.receivedOn), `${r.currency} ${amount(r.amount)}`, r.reference ?? '-'], f, { right: [false, true, false] });
  }
  y -= 4;

  heading(6, 'Document checklist');
  for (const item of input.checklist) {
    ensure(15);
    page.drawRectangle({ x: PAGE.margin, y: y - 1, width: 8, height: 8, borderColor: ink, borderWidth: 0.7 });
    if (item.done) page.drawText('x', { x: PAGE.margin + 1.5, y: y, size: 9, font: bold, color: ink });
    const lines = wrapLine(pdfSafe(item.label), regular, 9.5, width - 18);
    lines.forEach((l, i) => page.drawText(l, { x: PAGE.margin + 16, y: y - i * 12, size: 9.5, font: regular, color: ink }));
    y -= lines.length * 12 + 2;
  }

  heading(7, 'Undertaking');
  write(
    'We confirm that the information in this report is true and complete, that the funds were used only for the purpose agreed with the donor, and that the supporting documents are available for inspection.',
    { gap: 4 },
  );
  write(
    input.signedOffOn
      ? `Signed off in the portal by ${input.signedOffByName ?? 'the Executive Director'} on ${day(input.signedOffOn)}.`
      : 'Not yet signed off in the portal.',
    { size: 9, color: grey, gap: 34 },
  );
  ensure(40);
  const sigY = y;
  page.drawLine({ start: { x: PAGE.margin, y: sigY + 14 }, end: { x: PAGE.margin + 200, y: sigY + 14 }, thickness: 0.6, color: ink });
  page.drawLine({ start: { x: PAGE.margin + 260, y: sigY + 14 }, end: { x: PAGE.margin + 460, y: sigY + 14 }, thickness: 0.6, color: ink });
  page.drawText('Chairman - signature and stamp', { x: PAGE.margin, y: sigY, size: 9, font: regular, color: ink });
  page.drawText('Executive Director - signature and stamp', { x: PAGE.margin + 260, y: sigY, size: 9, font: regular, color: ink });

  const pages = doc.getPages();
  pages.forEach((pg, i) => {
    pg.drawText(`${pdfSafe(p.code)}  Form-7  -  page ${i + 1} of ${pages.length}`, { x: PAGE.margin, y: 28, size: 8, font: regular, color: grey });
  });
  return doc.save();
}
