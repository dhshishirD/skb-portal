// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';
import { parseCosting } from '../costingImport';
import { readXlsxSheets } from '../xlsxGrid';

it('the downloadable budget template can be imported by the portal', async () => {
  const b = fs.readFileSync(path.join(process.cwd(), 'public/templates/SKB-budget-template.xlsx'));
  const sheets = await readXlsxSheets(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
  expect(sheets.map((s) => s.name)).toEqual(['Cost table', 'How to fill']);
  const p = parseCosting(sheets[0].rows);
  expect(p.lines.map((l) => l.name)).toEqual(['Rice', 'Soya bean oil', 'Potato', 'Packaging']);
  expect(p.lines[0]).toMatchObject({ measure: 'Kg', quantity: 11, unitPriceBdt: 72 });
  expect(p.exchangeRate).toBe(135);
  expect(p.warnings).toEqual([]);
});
