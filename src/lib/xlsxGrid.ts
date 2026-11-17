/**
 * Reads the cell values of an Excel (.xlsx) file as plain text, sheet by sheet. Runs in the browser; the file never
 * leaves it. Only what the costing import needs: sheet names, text, numbers and the saved result of formulas.
 */
export const MAX_XLSX_BYTES = 5 * 1024 * 1024;

export interface SheetGrid {
  name: string;
  /** rows[r][c], r and c from 0; every cell is text ('' when empty). */
  rows: string[][];
}

const colIndex = (ref: string): number => {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? 'A';
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

const parseXml = (xml: string): Document => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('This Excel file could not be read.');
  return doc;
};

const byName = (root: Document | Element, name: string): Element[] => Array.from(root.getElementsByTagName(name));
const textOf = (el: Element) => byName(el, 't').map((t) => t.textContent ?? '').join('');

export async function readXlsxSheets(buffer: ArrayBuffer): Promise<SheetGrid[]> {
  const { default: JSZip } = await import('jszip');
  let zip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error('This file is not an Excel (.xlsx) file.');
  }
  const wbFile = zip.file('xl/workbook.xml');
  if (!wbFile) throw new Error('This file is not an Excel (.xlsx) file.');
  const workbook = parseXml(await wbFile.async('string'));
  const relsFile = zip.file('xl/_rels/workbook.xml.rels');
  const rels = new Map<string, string>();
  if (relsFile) for (const r of byName(parseXml(await relsFile.async('string')), 'Relationship')) rels.set(r.getAttribute('Id') ?? '', r.getAttribute('Target') ?? '');

  const sharedFile = zip.file('xl/sharedStrings.xml');
  const shared: string[] = sharedFile ? byName(parseXml(await sharedFile.async('string')), 'si').map(textOf) : [];

  const sheets: SheetGrid[] = [];
  for (const s of byName(workbook, 'sheet')) {
    const rid = s.getAttribute('r:id') ?? s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ?? '';
    const target = rels.get(rid);
    if (!target) continue;
    const path = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
    const file = zip.file(path);
    if (!file) continue;
    const rows: string[][] = [];
    for (const c of byName(parseXml(await file.async('string')), 'c')) {
      const ref = c.getAttribute('r') ?? '';
      const r = Number(/\d+/.exec(ref)?.[0] ?? 0) - 1;
      if (r < 0 || r > 2000) continue;
      const col = colIndex(ref);
      if (col > 60) continue;
      const type = c.getAttribute('t');
      const v = byName(c, 'v')[0]?.textContent ?? '';
      let value = '';
      if (type === 's') value = shared[Number(v)] ?? '';
      else if (type === 'inlineStr') value = textOf(c);
      else if (type === 'b') value = v === '1' ? 'TRUE' : 'FALSE';
      else value = v;
      value = value.trim();
      if (value === '') continue;
      (rows[r] ??= [])[col] = value;
    }
    const dense = Array.from(rows, (row) => Array.from(row ?? [], (x) => x ?? ''));
    sheets.push({ name: s.getAttribute('name') ?? `Sheet ${sheets.length + 1}`, rows: dense.map((row) => row ?? []) });
  }
  if (sheets.length === 0) throw new Error('This Excel file has no sheets.');
  return sheets;
}
