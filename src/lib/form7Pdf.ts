import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { wrapLine } from './charterPdf';
import { pdfSafe } from './fundReceiptLetter';
import { formatBp, type BudgetCalc, type BudgetItem } from './budget';
import { type ReportText } from './closing';

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
  /** Families served; when null the project's beneficiary target is used. */
  familiesCount: number | null;
  signedOffOn: string | null;
  signedOffByName: string | null;
  madeOn: string; // yyyy-mm-dd
}

const PAGE = { w: 595.28, h: 841.89, margin: 50 };
const ink = rgb(0.1, 0.1, 0.1);
const grey = rgb(0.45, 0.45, 0.45);

const day = (iso: string | null) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '-';

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
  const part = (text: string) => {
    ensure(50);
    y -= 8;
    write(text, { font: bold, size: 12, gap: 2 });
    page.drawLine({ start: { x: PAGE.margin, y: y + 8 }, end: { x: PAGE.margin + width, y: y + 8 }, thickness: 0.7, color: rgb(0.5, 0.5, 0.5) });
    y -= 4;
  };
  const sub = (text: string) => {
    ensure(30);
    y -= 2;
    write(text, { font: bold, size: 10.5, gap: 2 });
  };
  /** Label and value on one line; a missing value leaves a line to write on. */
  const pair = (k: string, v: string | null) => {
    ensure(16);
    page.drawText(pdfSafe(k), { x: PAGE.margin, y, size: 9.5, font: bold, color: rgb(0.25, 0.25, 0.25) });
    if (v === null || v === '') {
      page.drawLine({ start: { x: PAGE.margin + 170, y: y - 2 }, end: { x: PAGE.margin + width, y: y - 2 }, thickness: 0.4, color: rgb(0.6, 0.6, 0.6) });
      y -= 15;
      return;
    }
    const lines = wrapLine(pdfSafe(v), regular, 9.5, width - 170);
    for (const l of lines) {
      ensure(13);
      page.drawText(l, { x: PAGE.margin + 170, y, size: 9.5, font: regular, color: ink });
      y -= 13;
    }
  };
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
  /** A written section: the text, or "Not written." so a gap is obvious before printing. */
  const section = (label: string, text: string) => {
    ensure(34);
    write(label, { font: bold, size: 10, gap: 1 });
    const t = text.trim();
    if (!t) write('Not written.', { color: grey, gap: 5 });
    else t.split(/\r?\n/).map((x) => x.trim()).filter(Boolean).forEach((x, i, a) => write(x, { gap: i === a.length - 1 ? 5 : 2 }));
  };
  const blankLines = (n: number) => {
    for (let i = 0; i < n; i++) {
      ensure(18);
      page.drawLine({ start: { x: PAGE.margin, y: y - 2 }, end: { x: PAGE.margin + width, y: y - 2 }, thickness: 0.4, color: rgb(0.6, 0.6, 0.6) });
      y -= 18;
    }
  };
  const box = () => {
    ensure(15);
    page.drawRectangle({ x: PAGE.margin, y: y - 1, width: 8, height: 8, borderColor: ink, borderWidth: 0.7 });
  };

  const p = input.project;
  const c = input.calc;
  const cur = input.currency;
  // Whole numbers without separators, as in the donor's own form; unit prices keep up to 2 decimals.
  const num = (n: number) => String(Math.round(n * 100) / 100);
  const conv = (m: number | null) => (m === null ? '-' : String(Math.round(m / 1000)));
  const convUnit = (m: number | null) => (m === null ? '-' : num(m / 1000));
  const bdt = (cents: number | null) => (cents === null ? '-' : num(cents / 100));
  const rawNum = num;
  const families = input.familiesCount ?? p.beneficiaryTarget;
  const familiesNote = input.familiesCount === null && p.beneficiaryTarget !== null ? ' (target)' : '';

  // ----- title
  write('FORM 7', { font: bold, size: 18, gap: 0 });
  write('PROJECT FEEDBACK REPORT', { font: bold, size: 13, gap: 4 });
  write('Prepared for IHH - Humanitarian Relief Foundation by the partner organisation.', { size: 9, color: grey, gap: 4 });
  pair('Project Number', p.ngoabRef ?? p.code);
  pair('Project Date', day(p.startDate));
  pair('Partner Organization', input.organisationName);

  // ----- Part 1
  part('PART 1: Details of the Partner Institution Preparing the Project');
  pair('Official Name', input.organisationName);
  pair('Registration no.', input.registrationNo);
  pair('Official Address', null);
  pair('Phone / E-mail', null);

  // ----- Part 2
  part('PART 2: General Content of the Project');
  sub('2.1 Project general information');
  pair('Project Title', p.title);
  pair('Project Cost', `${cur} ${conv(c.projectConvertedMilli)}`);
  pair('Amount Requested from the donor', `${cur} ${conv(c.donorAmountMilli)}`);
  pair('Project Officer / Phone / E-mail', null);
  sub('2.2 Project address information');
  pair('Country', 'Bangladesh');
  pair('Location', p.location);
  pair('Region / City / County / Village', null);
  sub('2.3 Location for the implementation of the project');
  pair('Beneficiary', input.counts ? `${input.counts.total.toLocaleString('en-US')} registered people` : p.beneficiaryTarget !== null ? `${p.beneficiaryTarget.toLocaleString('en-US')} (target)` : null);

  // ----- Part 3
  part('PART 3: General Project Summary');
  sub('3.1 Project detail');
  section('Short description of the project', input.report.projectSummary);
  pair('Beneficiary of the project', p.beneficiaryTarget !== null ? `${p.beneficiaryTarget.toLocaleString('en-US')} (target)` : null);
  y -= 4;
  section('General impact of the project and benefits to beneficiaries', input.report.generalImpact);
  section('Groups negatively impacted by the project (if any)', input.report.negativeGroups);
  section('Problems encountered during the project and measures taken (if any)', input.report.challenges);

  sub('Number of beneficiaries');
  if (input.counts) {
    const k = input.counts;
    const f = [0.2, 0.14, 0.14, 0.14, 0.14, 0.24];
    row(['Total individuals', 'Women', 'Men', 'Girls', 'Boys', 'Number of families'], f, { font: bold });
    rule();
    row([String(k.total), String(k.women), String(k.men), String(k.girls), String(k.boys), families !== null ? `${families}${familiesNote}` : ''], f);
    if (k.unspecified > 0) write(`${k.unspecified} registered people have no birth year or sex and are only in the total.`, { size: 8.5, color: grey });
  } else {
    write('Not shown (you do not have permission to read the beneficiary registry).', { color: grey });
  }
  y -= 4;
  sub('Project duration');
  pair('Commencement Date', day(p.startDate));
  pair('Completion Date', day(p.endDate));

  // ----- Part 4
  part('PART 4: Feedback');
  section('4.1 Summary of project targets, goals, and the follow-up and success in achieving them', input.report.goalsAchieved);
  section('4.2 Local manpower and materials used', input.report.localManpower);
  section('4.3 Feedback from an end beneficiary (the beneficiary\'s own words; the STAKEHOLDER FORM is at the end)', input.report.beneficiaryStory);

  // ----- Part 5
  part('PART 5: Financial Summary');
  const received = input.receipts.filter((r) => r.currency === cur).reduce((s, r) => s + Math.round(r.amount * 100), 0);
  pair('Total cost of the project', `${cur} ${conv(c.projectConvertedMilli)}`);
  pair('Funds received from the donor', `${cur} ${num(received / 100)}`);
  pair('Bank charges on the donor fund', null);
  if (input.receipts.length > 0) {
    y -= 2;
    const f = [0.22, 0.24, 0.54];
    row(['Received on', 'Amount', 'Reference'], f, { font: bold, right: [false, true, false] });
    rule();
    for (const r of input.receipts) row([day(r.receivedOn), `${r.currency} ${num(r.amount)}`, r.reference ?? '-'], f, { right: [false, true, false] });
  }
  y -= 4;

  sub('5.1 Breakdown of the project costs (main cost table)');
  {
    const f = [0.4, 0.15, 0.15, 0.15, 0.15];
    row(['Items', 'Unit cost BDT', `Unit cost ${cur}`, 'Total BDT', `Total ${cur}`], f, { font: bold, right: [false, true, true, true, true] });
    rule();
    for (const g of c.groups) {
      const perPackageBdt = g.bdtCents;
      const perPackageConv = g.convertedMilli;
      const isPer = g.itemIds.some((id) => input.items.find((i) => i.id === id)?.kind === 'per_package');
      if (!isPer) continue;
      row(
        [`${g.name ?? 'Package items'} (x ${c.packagesCount} packages)`, bdt(perPackageBdt), convUnit(perPackageConv), bdt(perPackageBdt * c.packagesCount), perPackageConv === null ? '-' : conv(perPackageConv * c.packagesCount)],
        f,
        { right: [false, true, true, true, true] },
      );
    }
    if (c.oneOffBdtCents > 0) row(['One-off costs', '', '', bdt(c.oneOffBdtCents), conv(c.oneOffConvertedMilli)], f, { right: [false, true, true, true, true] });
    rule();
    row(['Total amount (without admin cost)', '', '', bdt(c.projectBdtCents), conv(c.projectConvertedMilli)], f, { font: bold, right: [false, true, true, true, true] });
    row([`Admin cost (${formatBp(c.adminBp)})`, '', '', c.adminConvertedMilli !== null && input.exchangeRate ? bdt(Math.round((c.adminConvertedMilli / 1000) * input.exchangeRate * 100)) : '-', conv(c.adminConvertedMilli)], f, { right: [false, true, true, true, true] });
    row(['Grand Total', '', '', '', conv(c.donorAmountMilli)], f, { font: bold, right: [false, true, true, true, true] });
    if (c.needsRate) write(input.exchangeRate ? `Conversion rate: 1 ${cur} = ${rawNum(input.exchangeRate)} BDT${input.rateDate ? ` (set ${day(input.rateDate)})` : ''}` : 'Conversion rate: not set', { size: 9, gap: 3 });
  }

  sub('5.2 Expenses incurred in implementing the project');
  {
    const f = [0.7, 0.3];
    row(['Type of expense', `Amount (${cur})`], f, { font: bold, right: [false, true] });
    rule();
    for (const g of c.groups) {
      const isPer = g.itemIds.some((id) => input.items.find((i) => i.id === id)?.kind === 'per_package');
      row([isPer ? `${g.name ?? 'Package items'} (x ${c.packagesCount})` : 'One-off costs', g.convertedMilli === null ? '-' : conv(isPer ? g.convertedMilli * c.packagesCount : g.convertedMilli)], f, { right: [false, true] });
    }
    row(['Sub-Total (b)', conv(c.projectConvertedMilli)], f, { font: bold, right: [false, true] });
    y -= 4;
    const ordered = [...input.items].sort((a, b) => (a.kind === b.kind ? a.position - b.position : a.kind === 'per_package' ? -1 : 1));
    if (ordered.length > 0) {
      write('Unit cost details', { font: bold, size: 9.5, gap: 1 });
      const g = [0.34, 0.1, 0.08, 0.12, 0.12, 0.12, 0.12];
      row(['Item', 'Measure', 'Qty', 'Unit BDT', `Unit ${cur}`, 'Total BDT', `Total ${cur}`], g, { font: bold, right: [false, false, true, true, true, true, true] });
      rule();
      let last: string | null | undefined;
      for (const it of ordered) {
        const label = it.kind === 'one_off' ? 'One-off costs' : it.groupName ?? 'Per package';
        if (label !== last) {
          ensure(16);
          write(label, { font: bold, size: 9, gap: 1 });
          last = label;
        }
        const line = c.lines[it.id];
        row(
          [it.name, it.measure, String(it.quantity), rawNum(it.unitPriceBdt), line ? convUnit(line.unitConvertedMilli) : '-', line ? bdt(line.lineBdtCents) : '-', line ? conv(line.lineConvertedMilli) : '-'],
          g,
          { right: [false, false, true, true, true, true, true] },
        );
      }
    }
  }
  y -= 4;

  sub('5.3 Administrative cost');
  pair('Administrative Cost', `${cur} ${conv(c.adminConvertedMilli)}`);
  pair('Total spent of the donor funds', `${cur} ${conv(c.projectConvertedMilli === null || c.adminConvertedMilli === null ? null : c.projectConvertedMilli + c.adminConvertedMilli)}`);
  pair('Amount unspent (if available)', null);

  sub('5.4 Documents attached (mark those enclosed)');
  for (const label of [
    'The formal receipt for all the goods above',
    'Photos of the general project taken with the donor banner (banner hung in the background)',
    'Video images (CD or DVD)',
    'News clippings published in local or national newspapers',
    'Special aid receipts documenting beneficiaries, signed next to their names',
    'Other (please specify)',
  ]) {
    ensure(15);
    box();
    const lines = wrapLine(pdfSafe(label), regular, 9.5, width - 18);
    lines.forEach((l, i) => page.drawText(l, { x: PAGE.margin + 16, y: y - i * 12, size: 9.5, font: regular, color: ink }));
    y -= lines.length * 12 + 2;
  }
  y -= 4;
  sub('Invoice declaration');
  write('Enter every invoice below and write its number on the invoice in pencil, so the reader can match them.', { size: 8.5, color: grey, gap: 2 });
  {
    const f = [0.28, 0.14, 0.24, 0.17, 0.17];
    row(['Company / institution issuing the invoice', 'Invoice date', 'Purchased goods / services', 'Amount (BDT)', `Total (${cur})`], f, { font: bold });
    rule();
    for (let i = 0; i < 5; i++) {
      ensure(22);
      page.drawLine({ start: { x: PAGE.margin, y: y - 6 }, end: { x: PAGE.margin + width, y: y - 6 }, thickness: 0.3, color: rgb(0.75, 0.75, 0.75) });
      y -= 20;
    }
    row(['TOTAL', '', '', bdt(c.projectBdtCents), conv(c.projectConvertedMilli)], f, { font: bold, right: [false, false, false, true, true] });
  }

  // ----- Part 6
  part('PART 6: PROJECT FEEDBACK UNDERTAKING');
  write(
    `We, the undersigned ${input.organisationName}, acting as the Chairman of the Board and the Chief Executive Officer / General Manager, confirm that we have read all the content of the donor's Funding Agreement and agreed to it in writing, and that the information in this report is true and complete.`,
    { gap: 3 },
  );
  write('Note: to be signed by the signatories only. All pages must be signed with a wet signature, then scanned and sent (PDF, JPG).', { size: 8.5, color: grey, gap: 3 });
  write(
    input.signedOffOn ? `Signed off in the portal by ${input.signedOffByName ?? 'the Executive Director'} on ${day(input.signedOffOn)}.` : 'Not yet signed off in the portal.',
    { size: 9, color: grey, gap: 10 },
  );
  ensure(110);
  const sy = y;
  const colW = (width - 30) / 2;
  for (const [i, who] of ['Chairman of the Board', 'General Manager / Secretary / Executive Director'].entries()) {
    const x = PAGE.margin + i * (colW + 30);
    page.drawText(pdfSafe(who), { x, y: sy, size: 9.5, font: bold, color: ink });
    ['Full Name:', 'Signature:', 'Date:'].forEach((lab, j) => {
      const ly = sy - 26 - j * 24;
      page.drawText(lab, { x, y: ly, size: 9, font: regular, color: ink });
      page.drawLine({ start: { x: x + 62, y: ly - 2 }, end: { x: x + colW, y: ly - 2 }, thickness: 0.5, color: ink });
    });
  }
  y = sy - 110;

  // ----- Stakeholder form
  doc.addPage([PAGE.w, PAGE.h]);
  page = doc.getPages()[doc.getPageCount() - 1];
  y = PAGE.h - PAGE.margin;
  write('DETAILS OF A SAMPLE END BENEFICIARY (STAKEHOLDER FORM)', { font: bold, size: 12, gap: 4 });
  write('Fill in by hand with the beneficiary. The feedback must be in the beneficiary\'s own words. Attach photos of the person or family. Names and ID numbers are not stored in the portal.', { size: 8.5, color: grey, gap: 6 });
  for (const lab of ['Full Name of the Beneficiary', 'Date of Birth', 'Place of Residence', 'Number of People in Family']) pair(lab, null);
  y -= 4;
  for (const lab of [
    'Information about the family (how many members work, professions, education, those under 18)',
    'Problems suffered before the project',
    'Post-project impact on the family',
    'Expectations and wishes',
    'Remarks / Comments',
  ]) {
    write(lab, { font: bold, size: 9.5, gap: 1 });
    blankLines(3);
    y -= 4;
  }

  const pages = doc.getPages();
  pages.forEach((pg, i) => {
    pg.drawText(`${pdfSafe(p.code)}  Form-7  -  page ${i + 1} of ${pages.length}`, { x: PAGE.margin, y: 28, size: 8, font: regular, color: grey });
  });
  return doc.save();
}
