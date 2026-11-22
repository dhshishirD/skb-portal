import type { BudgetCalc, BudgetData, BudgetItem } from './budget';
import { calculateBudget } from './budget';
import type { BudgetVsActual } from './budgetVsActual';

/**
 * The project budget as an Excel (.xlsx) file: the Budget sheet (items, package cost, one-off costs, project cost,
 * donor amount, administration cost) with live formulas so it can be edited in Excel, and, when the person may see
 * it, a "Budget vs Actual" sheet. Built in the browser with JSZip (no extra package). Figures come from the same
 * calculateBudget() the Budget tab uses, so the file and the page always agree.
 */

export interface BudgetXlsxInput {
  projectTitle: string;
  projectCode?: string | null;
  data: BudgetData;
  actual?: BudgetVsActual | null;
  /** YYYY-MM-DD, for the "Prepared on" line. */
  preparedOn: string;
}

// ----- style ids (see STYLES_XML) -----
export const S = { text: 0, title: 1, head: 2, money: 3, moneyBold: 4, bold: 5, qty: 6, milli: 7, milliBold: 8, pct: 9, note: 10, section: 11 } as const;

export type Cell = { v?: string | number | null; f?: string; s?: number };
export type Row = Array<Cell | null>;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Excel rejects control characters in XML text.
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
export const colName = (i: number): string => {
  let n = i + 1;
  let out = '';
  while (n > 0) {
    out = String.fromCharCode(65 + ((n - 1) % 26)) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
};

export function sheetXml(rows: Row[], widths: number[], opts: { freezeRow?: number } = {}): string {
  const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  const body = rows
    .map((row, r) => {
      const cells = row
        .map((c, i) => {
          if (!c || (c.v === undefined && c.f === undefined)) return '';
          const ref = `${colName(i)}${r + 1}`;
          const s = c.s ? ` s="${c.s}"` : '';
          if (c.f !== undefined) {
            const v = typeof c.v === 'number' && Number.isFinite(c.v) ? `<v>${c.v}</v>` : '';
            return `<c r="${ref}"${s}><f>${esc(c.f)}</f>${v}</c>`;
          }
          if (typeof c.v === 'number') return Number.isFinite(c.v) ? `<c r="${ref}"${s}><v>${c.v}</v></c>` : '';
          if (c.v === null || c.v === '') return c.s ? `<c r="${ref}"${s}/>` : '';
          return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(clean(String(c.v)))}</t></is></c>`;
        })
        .join('');
      return cells ? `<row r="${r + 1}">${cells}</row>` : '';
    })
    .join('');
  const pane = opts.freezeRow ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${opts.freezeRow}" topLeftCell="A${opts.freezeRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${pane}<cols>${cols}</cols><sheetData>${body}</sheetData><pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToHeight="0"/></worksheet>`;
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3"><numFmt numFmtId="164" formatCode="#,##0.00"/><numFmt numFmtId="165" formatCode="#,##0.000"/><numFmt numFmtId="166" formatCode="0.00&quot;%&quot;"/></numFmts>
<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><i/><sz val="10"/><color rgb="FF475569"/><name val="Calibri"/></font></fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FF94A3B8"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="12">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="2" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="2" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
</cellXfs>
</styleSheet>`;

const bdt = (cents: number) => cents / 100;
const cur = (milli: number | null) => (milli === null ? null : milli / 1000);
const money = (v: number | null, s: number = S.money): Cell => ({ v, s });

/** Rows and column widths of the Budget sheet. Exported for tests. */
export function budgetSheetRows(input: BudgetXlsxInput): { rows: Row[]; widths: number[]; calc: BudgetCalc } {
  const { data } = input;
  const calc = calculateBudget({
    items: data.items,
    packagesCount: data.settings.packagesCount,
    adminPercent: data.settings.adminPercent,
    exchangeRate: data.settings.exchangeRate,
    donorAmount: data.donorAmount,
    currency: data.currency,
  });
  const showCur = data.currency !== 'BDT' && calc.canConvert;
  const C = data.currency;
  const byId = new Map<string, BudgetItem>(data.items.map((i) => [i.id, i]));
  const rows: Row[] = [];
  const at = () => rows.length + 1; // the 1-based number of the row about to be pushed
  const push = (r: Row) => rows.push(r);

  push([{ v: `Budget: ${input.projectTitle}`, s: S.title }]);
  push([{ v: [input.projectCode ? `Project ${input.projectCode}` : '', `Prepared on ${input.preparedOn}`, 'Amounts in BDT unless stated'].filter(Boolean).join('  |  '), s: S.note }]);
  push([]);
  push([{ v: 'Donor currency', s: S.bold }, { v: C }]);
  const rateRow = at();
  push([{ v: `Exchange rate (BDT per 1 ${C})`, s: S.bold }, data.currency !== 'BDT' ? { v: data.settings.exchangeRate, s: S.milli } : { v: 'Not needed (BDT)' }]);
  if (data.currency !== 'BDT' && data.settings.rateDate) push([{ v: 'Rate date', s: S.bold }, { v: data.settings.rateDate }]);
  const pkgRow = at();
  push([{ v: 'Number of packages', s: S.bold }, { v: data.settings.packagesCount }]);
  push([{ v: 'Administration cost target', s: S.bold }, { v: data.settings.adminPercent, s: S.pct }]);
  push([]);

  const head: Row = [{ v: 'Item', s: S.head }, { v: 'Unit', s: S.head }, { v: 'Quantity', s: S.head }, { v: 'Unit price (BDT)', s: S.head }, { v: 'Line total (BDT)', s: S.head }];
  if (showCur) head.push({ v: `Unit price (${C})`, s: S.head }, { v: `Line total (${C})`, s: S.head });
  const section = (label: string) => push([{ v: label, s: S.section }, { s: S.section }, { s: S.section }, { s: S.section }, { s: S.section }, ...(showCur ? [{ s: S.section }, { s: S.section }] : [])]);
  const itemRow = (it: BudgetItem): number => {
    const r = at();
    const lc = calc.lines[it.id]!;
    const row: Row = [
      { v: it.name },
      { v: it.measure },
      { v: it.quantity, s: S.qty },
      { v: it.unitPriceBdt, s: S.money },
      { f: `C${r}*D${r}`, v: bdt(lc.lineBdtCents), s: S.money },
    ];
    if (showCur) row.push({ f: `D${r}/$B$${rateRow}`, v: cur(lc.unitConvertedMilli), s: S.milli }, { f: `E${r}/$B$${rateRow}`, v: cur(lc.lineConvertedMilli), s: S.milli });
    push(row);
    return r;
  };
  const totalRow = (label: string, cells: { bdtF?: string; bdt: number; curF?: string; cur: number | null }, bold = true) => {
    const r = at();
    const row: Row = [{ v: label, s: bold ? S.bold : S.text }, null, null, null, { f: cells.bdtF, v: cells.bdt, s: S.moneyBold }];
    if (showCur) row.push(null, { f: cells.curF, v: cells.cur, s: S.milliBold });
    push(row);
    return r;
  };

  push(head);
  const headerRow = rows.length;
  const subtotalRows: number[] = [];

  section('Items in one package');
  if (calc.groups.length === 0) push([{ v: 'No package items yet.', s: S.note }]);
  for (const g of calc.groups) {
    if (calc.groups.length > 1 || g.name) push([{ v: g.name ?? 'Other items', s: S.bold }]);
    const first = at();
    for (const id of g.itemIds) itemRow(byId.get(id)!);
    const last = at() - 1;
    subtotalRows.push(
      totalRow(g.name ? `Subtotal: ${g.name}` : 'Subtotal', { bdtF: `SUM(E${first}:E${last})`, bdt: bdt(g.bdtCents), curF: `SUM(G${first}:G${last})`, cur: cur(g.convertedMilli) }, false),
    );
  }
  const pkgCost = totalRow('Cost of one package', {
    bdtF: subtotalRows.length ? subtotalRows.map((r) => `E${r}`).join('+') : '0',
    bdt: bdt(calc.packageBdtCents),
    curF: subtotalRows.length ? subtotalRows.map((r) => `G${r}`).join('+') : '0',
    cur: cur(calc.packageConvertedMilli),
  });
  const allPkgs = totalRow('Cost of all packages', { bdtF: `E${pkgCost}*$B$${pkgRow}`, bdt: bdt(calc.allPackagesBdtCents), curF: `G${pkgCost}*$B$${pkgRow}`, cur: cur(calc.allPackagesConvertedMilli) });
  push([]);

  section('One-off costs');
  let oneOffTotal: number;
  if (calc.oneOffIds.length === 0) {
    push([{ v: 'No one-off costs.', s: S.note }]);
    oneOffTotal = totalRow('Total one-off costs', { bdtF: '0', bdt: 0, curF: '0', cur: showCur ? 0 : null });
  } else {
    const first = at();
    for (const id of calc.oneOffIds) itemRow(byId.get(id)!);
    const last = at() - 1;
    oneOffTotal = totalRow('Total one-off costs', { bdtF: `SUM(E${first}:E${last})`, bdt: bdt(calc.oneOffBdtCents), curF: `SUM(G${first}:G${last})`, cur: cur(calc.oneOffConvertedMilli) });
  }
  push([]);

  const project = totalRow('PROJECT COST', { bdtF: `E${allPkgs}+E${oneOffTotal}`, bdt: bdt(calc.projectBdtCents), curF: `G${allPkgs}+G${oneOffTotal}`, cur: cur(calc.projectConvertedMilli) });
  // Donor amount and administration cost are in the donor currency: the last column.
  const valueCol = showCur ? 6 : 4;
  const donorRow: Row = [{ v: `Donor amount (${C})`, s: S.bold }, null, null, null, null, null, null];
  donorRow[valueCol] = { v: cur(calc.donorAmountMilli), s: S.milli };
  donorRow.length = valueCol + 1;
  const donor = at();
  push(donorRow);
  const valueRef = `${colName(valueCol)}`;
  const adminRow: Row = [{ v: `Administration cost (${C}) = donor amount - project cost`, s: S.bold }];
  adminRow[valueCol] = calc.adminConvertedMilli === null ? { v: 'Set the donor amount and rate' } : { f: `${valueRef}${donor}-${valueRef}${project}`, v: cur(calc.adminConvertedMilli), s: S.milliBold };
  push(adminRow);
  const pctRow: Row = [{ v: 'Administration cost as % of project cost', s: S.bold }];
  pctRow[valueCol] = calc.adminBp === null ? { v: '—' } : { v: calc.adminBp / 100, s: S.pct };
  push(pctRow);

  push([]);
  push([{ v: `Rows ${headerRow + 1} and below are formulas: change a quantity or price and the totals follow. The portal remains the official record.`, s: S.note }]);

  return { rows, widths: showCur ? [46, 12, 11, 16, 18, 18, 20] : [52, 12, 11, 18, 20], calc };
}

export function actualSheetRows(input: BudgetXlsxInput & { actual: BudgetVsActual }): { rows: Row[]; widths: number[] } {
  const a = input.actual;
  const rows: Row[] = [];
  rows.push([{ v: `Budget vs Actual: ${input.projectTitle}`, s: S.title }]);
  rows.push([{ v: `Prepared on ${input.preparedOn}  |  Amounts in BDT. Counts claims approved or paid, orders issued and approved purchases.`, s: S.note }]);
  rows.push([]);
  const sum = (label: string, v: number, bold = false) => rows.push([{ v: label, s: bold ? S.bold : S.text }, null, null, null, money(bdt(v), bold ? S.moneyBold : S.money)]);
  sum('Planned (project cost)', a.plannedBdtCents, true);
  sum('Spent: claims approved by the director or paid', a.claimsSpentBdtCents);
  sum('Ordered: purchase orders issued', a.purchasesOrderedBdtCents);
  sum('Approved purchases not yet ordered (estimate)', a.purchasesApprovedBdtCents);
  sum('Committed (gone or promised)', a.committedBdtCents, true);
  sum('Remaining', a.remainingBdtCents, true);
  rows.push([{ v: 'Percent committed', s: S.bold }, null, null, null, a.percentCommitted === null ? { v: '—' } : { v: a.percentCommitted, s: S.pct }]);
  sum('Not counted yet: claims waiting', a.claimsWaitingBdtCents);
  sum('Not counted yet: purchase requests waiting (estimate)', a.purchasesWaitingBdtCents);
  if (a.overBudget) rows.push([{ v: 'Committed spending is above the project cost.', s: S.note }]);
  rows.push([]);
  rows.push([{ v: 'Date', s: S.head }, { v: 'Type', s: S.head }, { v: 'Description', s: S.head }, { v: 'Status', s: S.head }, { v: 'Amount (BDT)', s: S.head }, { v: 'Counted as', s: S.head }]);
  const COUNTED: Record<string, string> = { spent: 'Spent', ordered: 'Ordered', waiting: 'Waiting', none: 'Not counted' };
  for (const l of a.lines) {
    rows.push([{ v: l.date }, { v: l.kind === 'claim' ? 'Claim' : 'Purchase' }, { v: l.description }, { v: l.statusLabel }, money(bdt(l.bdtCents)), { v: COUNTED[l.counted] ?? l.counted }]);
  }
  if (a.lines.length === 0) rows.push([{ v: 'No claims or purchase requests yet.', s: S.note }]);
  return { rows, widths: [14, 11, 50, 26, 18, 14] };
}

const sheetName = (s: string) => s.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);

export async function buildBudgetXlsx(input: BudgetXlsxInput): Promise<Blob> {
  const budget = budgetSheetRows(input);
  const sheets: Array<{ name: string; xml: string }> = [{ name: 'Budget', xml: sheetXml(budget.rows, budget.widths) }];
  if (input.actual) {
    const act = actualSheetRows({ ...input, actual: input.actual });
    sheets.push({ name: 'Budget vs Actual', xml: sheetXml(act.rows, act.widths) });
  }
  return buildXlsxBlob(sheets);
}

/** Packs ready-made sheets into an .xlsx file (shared by the budget and the attendance downloads). */
export async function buildXlsxBlob(sheets: Array<{ name: string; xml: string }>): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets
      .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
      .join('')}</Types>`,
  );
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file(
    'xl/workbook.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
      .map((s, i) => `<sheet name="${esc(sheetName(s.name))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join('')}</sheets><calcPr fullCalcOnLoad="1"/></workbook>`,
  );
  zip.file(
    'xl/_rels/workbook.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
      .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
      .join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  );
  zip.file('xl/styles.xml', STYLES_XML);
  sheets.forEach((s, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, s.xml));
  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  return new Blob([bytes as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export const budgetFileName = (title: string, code: string | null | undefined, preparedOn: string): string => {
  const base = (code || title).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'Project';
  return `SKB-Budget-${base}-${preparedOn}.xlsx`;
};
