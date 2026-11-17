import { parseAmount } from './form3Import';

/**
 * Costing sheet import: the pure part. SKB's costing sheets (food packet, iftar packet, eid dress ...) list items with a
 * unit of measure, a quantity and a unit cost in BDT and EURO. The columns are found by their headings, so small
 * differences in layout do not matter. Nothing is saved here; the screen shows a preview first.
 */

export interface CostingLine {
  name: string;
  measure: string;
  quantity: number;
  /** Price of one unit in BDT, at most 2 decimals. */
  unitPriceBdt: number;
  /** Section title when a sheet has more than one table (for example "Per Male Orphan's Cost"). */
  section: string | null;
}

export interface CostingParsed {
  title: string | null;
  lines: CostingLine[];
  adminPercent: number | null;
  exchangeRate: number | null;
  /** Total of the lines as written in the sheet's "without administrative cost" row, in BDT. */
  sheetTotalBdt: number | null;
  warnings: string[];
}

const low = (s: string | undefined) => (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const text = (s: string | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

type Cols = { name: number; measure: number; qty: number; unit: number; total: number };

function findHeaders(rows: string[][]): Array<{ row: number; cols: Cols; skip: number }> {
  const found: Array<{ row: number; cols: Cols; skip: number }> = [];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const name = row.findIndex((c) => /^(items?( to be (purchased|puchased|buy))?|items to buy|particulars|definition)\b/.test(low(c)));
    if (name < 0) continue;
    const qty = row.findIndex((c) => /^(quantity|qty|amount)$/.test(low(c)));
    if (qty < 0) continue;
    const measure = row.findIndex((c) => /measur|unit of/.test(low(c)));

    // Layout 1: the heading says "Unit Price (Local)" / "Total Price (Local)" in one line (the donor Form 3 and Form 7 cost tables).
    const unitOne = row.findIndex((c) => /unit (price|cost)/.test(low(c)) && /local|bdt|taka/.test(low(c)));
    if (unitOne >= 0) {
      const totalOne = row.findIndex((c) => /total/.test(low(c)) && /local|bdt|taka/.test(low(c)));
      found.push({ row: r, skip: 1, cols: { name, measure, qty, unit: unitOne, total: totalOne } });
      continue;
    }

    // Layout 2: "Unit Cost" on one line and BDT / EURO under it on the next (SKB's own costing sheets).
    const sub = rows[r + 1] ?? [];
    const unitHeader = row.findIndex((c) => /unit[: ]*(cost|price)/.test(low(c)));
    const unit = sub.findIndex((c, i) => i >= unitHeader && /^bdt$/.test(low(c)));
    if (unitHeader < 0 || unit < 0) continue;
    const totalHeader = row.findIndex((c) => /total/.test(low(c)));
    const total = totalHeader >= 0 ? sub.findIndex((c, i) => i >= totalHeader && /^bdt$/.test(low(c))) : -1;
    found.push({ row: r, skip: 2, cols: { name, measure, qty, unit, total } });
  }
  return found;
}

export function parseCosting(rows: string[][]): CostingParsed {
  const warnings: string[] = [];
  const headers = findHeaders(rows);
  const all = rows.map((r) => (r ?? []).map(text).filter(Boolean).join(' ')).join('\n');

  const rate = /1\s*euro\s*[=:]?\s*bdt\.?\s*(\d+(?:\.\d+)?)/i.exec(all);
  const admin = /administrative[^\n\d]*\(?\s*(\d+(?:\.\d+)?)\s*%/i.exec(all);
  const titleRows = rows
    .slice(0, headers[0]?.row ?? 6)
    .map((r) => (r ?? []).map(text).filter(Boolean).join(' '))
    .filter((t) => t && !/^project cost$/i.test(t));
  // With one table the line just above it names it ("Iftar Packet Costing"); with several, the sheet's first line does.
  const title = titleRows.length ? (headers.length > 1 ? titleRows[0] : titleRows[titleRows.length - 1]) : null;

  const lines: CostingLine[] = [];
  let sheetTotalBdt: number | null = null;
  headers.forEach((h, idx) => {
    const end = headers[idx + 1]?.row ?? rows.length;
    const above = rows.slice(Math.max(0, h.row - 3), h.row).map((r) => (r ?? []).map(text).filter(Boolean).join(' ')).filter((t) => t && !/^project cost$/i.test(t));
    const section = headers.length > 1 ? (above[above.length - 1] ?? null) : null;
    for (let r = h.row + h.skip; r < end; r++) {
      const row = rows[r] ?? [];
      const name = text(row[h.cols.name]);
      if (/^(sub-?total|grand total|total)\b/.test(low(name))) {
        if (/without/.test(low(name)) && h.cols.total >= 0) {
          const t = parseAmount(row[h.cols.total]);
          if (t !== null && sheetTotalBdt === null) sheetTotalBdt = t;
        }
        break;
      }
      if (!name || /^admin/.test(low(name)) || /^etc\.?$/.test(low(name))) continue;
      const qty = parseAmount(row[h.cols.qty]);
      const price = parseAmount(row[h.cols.unit]);
      if ((qty === null || qty === 0) && (price === null || price === 0)) continue;
      if (qty === null || price === null || qty <= 0) {
        warnings.push(`Row "${name}" was skipped: it has no quantity or no BDT unit cost.`);
        continue;
      }
      const rounded = Math.round(price * 100) / 100;
      if (rounded !== price) warnings.push(`"${name}": the unit cost ${price} was rounded to ${rounded}.`);
      const lineTotal = h.cols.total >= 0 ? parseAmount(row[h.cols.total]) : null;
      if (lineTotal !== null && Math.abs(lineTotal - qty * price) > 1) {
        warnings.push(`"${name}": quantity × unit cost is ${Math.round(qty * price * 100) / 100}, but the sheet's total says ${lineTotal}.`);
      }
      lines.push({
        name: name.slice(0, 200),
        measure: (h.cols.measure >= 0 ? text(row[h.cols.measure]) : '') || 'Pcs',
        quantity: qty,
        unitPriceBdt: rounded,
        section,
      });
    }
  });

  const sum = lines.reduce((s, l) => s + l.quantity * l.unitPriceBdt, 0);
  // One "without administrative cost" figure per table; compare when there is just one table.
  if (sheetTotalBdt !== null && headers.length === 1 && Math.abs(sum - sheetTotalBdt) > 1) {
    warnings.push(`The lines add up to ${Math.round(sum).toLocaleString('en-US')} BDT, but the sheet's total says ${Math.round(sheetTotalBdt).toLocaleString('en-US')} BDT.`);
  }
  if (headers.length === 0) warnings.push('No cost table was found on this sheet. Look for a table with "Items", "Quantity" and "Unit Cost" (BDT).');
  return {
    title,
    lines,
    adminPercent: admin ? Number(admin[1]) : null,
    exchangeRate: rate ? Number(rate[1]) : null,
    sheetTotalBdt,
    warnings,
  };
}
