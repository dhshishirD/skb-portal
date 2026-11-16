// @vitest-environment jsdom
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { parseCosting } from '../costingImport';
import { readXlsxSheets } from '../xlsxGrid';

const iftar: string[][] = [
  ['Ramadan Planning -2026 for Bangladeshi Vulerable People'],
  ['Iftar Packet Costing (One packet per Person Per day)'],
  ['Slno', 'Items to be Purchased', 'Unit of Measure', 'Quantity', 'Unit Cost', '', 'Total Packet Cost'],
  ['', '', '', '', 'BDT', 'EURO', 'BDT', 'EURO'],
  ['1', 'Dates', 'Piece', '2', '10', '0.07', '20', '0.14'],
  ['2', 'Chickpeas (cooked)', 'Kg', '0.2', '200', '1.48', '40', '0.296'],
  ['', 'Total Amount without Administrative Cost', '', '', '', '', '60', '0.436'],
  ['', 'Administrative Cost (5%)', '', '', '', '', '3', '0.02'],
  ['Conversion Rate: 1 Euro = BDT. 135'],
];

describe('parseCosting', () => {
  it('reads a packet costing sheet', () => {
    const p = parseCosting(iftar);
    expect(p.title).toBe('Iftar Packet Costing (One packet per Person Per day)');
    expect(p.lines).toEqual([
      { name: 'Dates', measure: 'Piece', quantity: 2, unitPriceBdt: 10, section: null },
      { name: 'Chickpeas (cooked)', measure: 'Kg', quantity: 0.2, unitPriceBdt: 200, section: null },
    ]);
    expect(p.adminPercent).toBe(5);
    expect(p.exchangeRate).toBe(135);
    expect(p.sheetTotalBdt).toBe(60);
    expect(p.warnings).toEqual([]);
  });
  it('flags a line whose total does not match, and a sheet total that does not match', () => {
    const bad = iftar.map((r) => [...r]);
    bad[4][6] = '25'; // Dates: 2 x 10 is 20, not 25
    bad[6][6] = '99';
    const p = parseCosting(bad);
    expect(p.warnings.some((w) => w.includes('Dates') && w.includes('25'))).toBe(true);
    expect(p.warnings.some((w) => w.includes('99'))).toBe(true);
  });
  it('skips a row with no quantity and uses Pcs when there is no measure column', () => {
    const t: string[][] = [
      ['Eid Dress'],
      ['Project Cost'],
      ['Items to Buy', 'Unit: Cost', '', 'Amount', 'Total Cost'],
      ['', 'EURO', 'BDT', '', 'EURO', 'BDT'],
      ['Pajama/Pant', '4.07', '550', '1', '4.07', '550'],
      ['Shoes', '4.81', '650', '', '4.81', '650'],
      ['Total: (without administrative cost)', '', '', '', '8.88', '550'],
    ];
    const p = parseCosting(t);
    expect(p.lines).toHaveLength(1);
    expect(p.lines[0]).toMatchObject({ name: 'Pajama/Pant', measure: 'Pcs', quantity: 1, unitPriceBdt: 550 });
    expect(p.warnings.some((w) => w.includes('Shoes'))).toBe(true);
  });
  it('keeps the section title when a sheet has two tables', () => {
    const t: string[][] = [
      ['Eid Dress Distribution'],
      ['Per Male Orphan’s Cost'],
      ['Items to Buy', 'Unit: Cost', '', 'Amount'],
      ['', 'EURO', 'BDT', ''],
      ['Pant', '4', '550', '1'],
      ['Total: (without administrative cost)'],
      ['Per Female Orphan’s Cost'],
      ['Items to Buy', 'Unit: Cost', '', 'Amount'],
      ['', 'EURO', 'BDT', ''],
      ['Salwar', '3', '460', '1'],
    ];
    const p = parseCosting(t);
    expect(p.title).toBe('Eid Dress Distribution');
    expect(p.lines.map((l) => l.section)).toEqual(['Per Male Orphan’s Cost', 'Per Female Orphan’s Cost']);
  });
  it('says so when there is no cost table', () => {
    const p = parseCosting([['Hello'], ['World']]);
    expect(p.lines).toEqual([]);
    expect(p.warnings[0]).toContain('No cost table');
  });
  it('rounds a unit cost to two decimals and says so', () => {
    const t = iftar.map((r) => [...r]);
    t[4][4] = '10.456';
    const p = parseCosting(t);
    expect(p.lines[0].unitPriceBdt).toBe(10.46);
    expect(p.warnings.some((w) => w.includes('rounded'))).toBe(true);
  });
});

describe('readXlsxSheets', () => {
  async function makeXlsx(): Promise<ArrayBuffer> {
    const zip = new JSZip();
    zip.file('xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Costing" sheetId="1" r:id="rId1"/></sheets></workbook>');
    zip.file('xl/_rels/workbook.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>');
    zip.file('xl/sharedStrings.xml', '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Rice</t></si><si><t>Kg</t></si></sst>');
    zip.file('xl/worksheets/sheet1.xml', '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="2"><c r="B2" t="s"><v>0</v></c><c r="C2" t="s"><v>1</v></c><c r="E2"><v>72.5</v></c></row><row r="3"><c r="B3" t="inlineStr"><is><t>Oil</t></is></c></row></sheetData></worksheet>');
    return (await zip.generateAsync({ type: 'uint8array' })).buffer as ArrayBuffer;
  }
  it('reads shared strings, numbers and inline text into a grid', async () => {
    const sheets = await readXlsxSheets(await makeXlsx());
    expect(sheets).toHaveLength(1);
    expect(sheets[0].name).toBe('Costing');
    expect(sheets[0].rows[1]).toEqual(['', 'Rice', 'Kg', '', '72.5']);
    expect(sheets[0].rows[2][1]).toBe('Oil');
  });
  it('refuses a file that is not an Excel file', async () => {
    await expect(readXlsxSheets(new TextEncoder().encode('hello').buffer as ArrayBuffer)).rejects.toThrow('not an Excel');
  });
});
