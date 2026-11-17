// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { Document, Packer, Paragraph, Table, TableCell, TableRow } from 'docx';
import { parseAmount, parseForm3, type TextTables } from '../form3Import';
import { readDocxTables } from '../docxTables';

const ihh: TextTables = [
  [
    ['Project name: Distribution of Qurbani Meat 2026 Among the Rohingya Refugees'],
    ['Total Cost of Project: €69000', 'Amount Requested From IHH: €69000'],
    ['Project Duration: 2 Months'],
    ['Project manager: Md Abu Huraira', 'Phone Number: +8801716350626'],
  ],
  [
    ['', 'Region', 'City', 'Neighborhood/ Village', 'Item & Pack Quantity', 'Number of Beneficiaries (Family Qty)'],
    ['1', 'Chittagong', 'Ukhiya', 'Balukhali', '27', '1215'],
    ['2', 'Chittagong', 'Ukhiya', 'Jamtoli', '29', '1305'],
    ['3', 'Chittagong', 'Ukhiya', 'Palongkhali', '27', '1215'],
    ['4', 'Chittagong', 'Ukhiya', 'Saifullah Kata', '27', '1215'],
    ['Total', '4950 Families'],
  ],
  [
    ['Brief Description of the Project:', 'Distribution of Qurbani meat.'],
    ['Project Rationale:', 'Refugees cannot afford meat.'],
    ['Project Objectives:', 'Overall Objective\nImprove food security.'],
    ['Target group:', 'Vulnerable, Widow, Orphan Rohingya Refugees'],
    ['Total Number of Beneficiaries:', '4500 families'],
    ['Groups that may be negatively affected by the project: (if there is any)', 'None.'],
    ['Problems that may arise as a result of the project and measures that can be taken:', 'Crowding; volunteers manage queues.'],
  ],
  [
    ['PROJECT COST', 'TOTAL'],
    ['Items to be Purchased', 'Unit Price-EURO', 'Unit Price- Local', 'Quantity', 'Total Price in EURO', 'Total Price in Local'],
    ['Cattle', '623,00', '84105', '100', '62300,00', '8410500'],
    ['Transportation', '13,00', '1755', '100', '1300,00', '175500'],
    ['Feeding & Slaughtering Cost', '18,00', '2430', '100', '1800,00', '243000'],
    ['Distribution Cost', '3,14', '424,28', '100', '314,28', '42428'],
    ['Total Purchased Cost', '65714,28', '8871428'],
    ['Admin Cost', '3285,71', '443571'],
    ['TOTAL:', '69000', '9314999'],
  ],
];

describe('parseAmount', () => {
  it('reads European and plain numbers', () => {
    expect(parseAmount('623,00')).toBe(623);
    expect(parseAmount('424,28')).toBe(424.28);
    expect(parseAmount('8410500')).toBe(8410500);
    expect(parseAmount('1,755')).toBe(1755);
    expect(parseAmount('1.234,50')).toBe(1234.5);
    expect(parseAmount('4950 Families')).toBe(4950);
    expect(parseAmount('€69000')).toBe(69000);
    expect(parseAmount('N/A')).toBeNull();
    expect(parseAmount('')).toBeNull();
  });
});

describe('parseForm3 (IHH Qurbani form)', () => {
  const p = parseForm3(ihh);
  it('reads the project facts', () => {
    expect(p.title).toContain('Distribution of Qurbani Meat 2026');
    expect(p.duration).toBe('2 Months');
    expect(p.manager).toBe('Md Abu Huraira');
    expect(p.totalCost).toBe('€69000');
  });
  it('reads the four areas', () => {
    expect(p.areas).toHaveLength(4);
    expect(p.areas[1]).toEqual({ region: 'Chittagong', cities: 'Ukhiya', villages: 'Jamtoli', itemQuantity: 29, families: 1305 });
    expect(p.areasFamiliesTotal).toBe(4950);
  });
  it('reads the cost lines in local money and the purchased total', () => {
    expect(p.budget.hasLocalPrices).toBe(true);
    expect(p.budget.lines.map((l) => l.name)).toEqual(['Cattle', 'Transportation', 'Feeding & Slaughtering Cost', 'Distribution Cost']);
    expect(p.budget.lines[0]).toMatchObject({ quantity: 100, unitPriceLocal: 84105, unitPriceDonor: 623 });
    expect(p.budget.lines[3].unitPriceLocal).toBe(424.28);
    expect(p.budget.purchasedTotalLocal).toBe(8871428);
  });
  it('fills the charter parts', () => {
    expect(p.charter.background).toContain('Distribution of Qurbani meat.');
    expect(p.charter.background).toContain('cannot afford meat');
    expect(p.charter.objectives).toContain('Improve food security');
    expect(p.charter.scopeIn).toContain('Target group: Vulnerable, Widow, Orphan Rohingya Refugees');
    expect(p.charter.risks).toContain('Crowding');
    expect(p.charter.team).toContain('Md Abu Huraira');
  });
  it('flags the numbers that disagree (4,950 vs 4,500 families, 110 vs 100 cattle)', () => {
    expect(p.warnings.some((w) => w.includes('4,950') && w.includes('4,500'))).toBe(true);
    expect(p.warnings.some((w) => w.includes('110') && w.includes('100') && w.includes('Cattle'))).toBe(true);
    expect(p.warnings.some((w) => w.includes('Total Purchased'))).toBe(false);
  });
});

describe('parseForm3 (empty Mavi Marmara template and odd files)', () => {
  it('finds nothing and does not crash on an empty template', () => {
    const empty: TextTables = [
      [['Project Title:'], ['Project Total Cost:', 'Amount Requested from Mavi Marmara:']],
      [['', 'Region', 'City', 'District', 'Neighborhood / Village', 'Quantity'], ['1', ''], ['2', '']],
      [['Short Description of Project:', ''], ['Project Cause:', '']],
      [['PROJECT COST', 'Total'], ['Items to be Purchased', 'Unit Price', 'Quantity', 'Total'], [''], ['TOTAL:', '']],
    ];
    const p = parseForm3(empty);
    expect(p.areas).toEqual([]);
    expect(p.budget.lines).toEqual([]);
    expect(p.charter).toEqual({});
    expect(p.warnings.some((w) => w.includes('local money'))).toBe(true);
  });
  it('reads a district column and a single price column', () => {
    const t: TextTables = [
      [['', 'Region', 'City', 'District', 'Neighborhood / Village', 'Quantity'], ['1', 'Dhaka', 'Dhaka', 'Savar', 'Ashulia', '40']],
      [['PROJECT COST', 'Total'], ['Items to be Purchased', 'Unit Price', 'Quantity', 'Total'], ['Rice', '50', '10', '500']],
    ];
    const p = parseForm3(t);
    expect(p.areas[0]).toMatchObject({ cities: 'Dhaka, Savar', villages: 'Ashulia', itemQuantity: 40, families: null });
    expect(p.budget.hasLocalPrices).toBe(false);
    expect(p.budget.lines).toEqual([]);
  });
});

describe('readDocxTables', () => {
  const cell = (t: string) => new TableCell({ children: t.split('\n').map((l) => new Paragraph(l)) });
  it('turns a real .docx into rows of text', async () => {
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph('Heading outside a table'),
            new Table({ rows: [new TableRow({ children: [cell('Target group:'), cell('Widows\nOrphans')] })] }),
          ],
        },
      ],
    });
    const buf = await Packer.toBuffer(doc);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    const tables = await readDocxTables(ab);
    expect(tables).toEqual([[['Target group:', 'Widows\nOrphans']]]);
  });
  it('refuses a file that is not a Word file', async () => {
    await expect(readDocxTables(new TextEncoder().encode('hello').buffer as ArrayBuffer)).rejects.toThrow('not a Word');
  });
});

describe('parseForm3 (empty boxes)', () => {
  it('does not take the next label or a hint for an answer', () => {
    const t: TextTables = [
      [['Project Title:'], ['Project Total Cost:', 'Amount Requested from Mavi Marmara:'], ['Project Officer:', 'Telephone:']],
      [['Groups Negatively Impacted by Project: (If any)', '']],
    ];
    const p = parseForm3(t);
    expect(p.title).toBeNull();
    expect(p.totalCost).toBeNull();
    expect(p.manager).toBeNull();
    expect(p.charter.risks).toBeUndefined();
  });
});
