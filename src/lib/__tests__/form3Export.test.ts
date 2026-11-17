// @vitest-environment jsdom
import { Packer } from 'docx';
import { describe, expect, it } from 'vitest';
import type { BudgetItem, BudgetSettings } from '../budget';
import { buildForm3Data, durationText, EMPTY_APPLICANT, splitRisks, targetGroupOf } from '../form3Export';
import { buildForm3Document } from '../form3Docx';
import { parseForm3 } from '../form3Import';
import { readDocxTables } from '../docxTables';
import type { CharterProjectFacts, CharterText } from '../charter';
import type { ProjectArea } from '../projectAreas';

const facts: CharterProjectFacts = {
  code: 'P-1', title: 'Distribution of Qurbani Meat 2026', donorName: 'IHH', location: null,
  budgetAmount: 69000, currency: 'EUR', beneficiaryTarget: null, startDate: '2026-05-20', endDate: '2026-07-09',
};
const charter: CharterText = {
  background: 'Refugees cannot afford meat.', objectives: 'Improve food security.',
  scopeIn: 'Target group: Widow, Orphan Rohingya Refugees\n\nTotal number of beneficiaries: 4500 families',
  scopeOut: '', deliverables: 'Buy cattle, slaughter, distribute.',
  risks: 'Groups that may be negatively affected:\nNone.\n\nProblems that may arise and how to handle them:\nCrowding; volunteers manage queues.',
  team: '',
};
const area = (position: number, village: string, qty: number, fam: number): ProjectArea => ({ id: `a${position}`, position, region: 'Chittagong', cities: 'Ukhiya', villages: village, itemQuantity: qty, itemUnit: null, families: fam });
const areas = [area(1, 'Balukhali', 40, 1800), area(2, 'Jamtoli', 60, 2700)];
const item = (position: number, name: string, quantity: number, unitPriceBdt: number, kind: BudgetItem['kind'] = 'per_package'): BudgetItem => ({ id: `i${position}`, kind, groupName: null, position, name, measure: 'Pcs', quantity, unitPriceBdt });
const items = [item(1, 'Cattle', 1, 84105), item(2, 'Transportation', 1, 1755)];
const settings: BudgetSettings = { packagesCount: 100, adminPercent: 5, exchangeRate: 135, rateDate: null, rateNote: null, rateSetByName: null, rateSetAt: null };
const applicant = { ...EMPTY_APPLICANT, address: 'House 4, Uttara, Dhaka', managerName: 'Md Abu Huraira', managerPhone: '+8801700000000', generalManagerName: 'Md Abu Huraira' };

describe('buildForm3Data', () => {
  const d = buildForm3Data({ applicant, facts, charter, areas, items, settings });
  it('works out the cost table from the budget', () => {
    expect(d.cost.rows[0]).toMatchObject({ name: 'Cattle', quantity: 100, unitLocal: 84105, totalLocal: 8410500, unitDonor: 623 });
    expect(d.cost.purchasedLocal).toBe(8586000);
    expect(d.cost.adminLocal).toBe(429300);
    expect(d.cost.totalLocal).toBe(9015300);
    expect(d.project.requestedText).toBe('€69,000.00');
    expect(d.project.duration).toBe('2 Months');
    expect(d.areaTotals.families).toBe(4500);
  });
  it('splits the charter back into the form boxes', () => {
    expect(d.details.targetGroup).toBe('Widow, Orphan Rohingya Refugees');
    expect(d.details.negative).toBe('None.');
    expect(d.details.problems).toContain('Crowding');
    expect(d.implementation).toContain('distribute');
  });
  it('says so when there is no exchange rate', () => {
    const x = buildForm3Data({ applicant, facts, charter, areas, items, settings: { ...settings, exchangeRate: null } });
    expect(x.cost.rows[0].unitDonor).toBeNull();
    expect(x.cost.notes.some((n) => n.includes('exchange rate'))).toBe(true);
  });
  it('helpers', () => {
    expect(durationText(null, '2026-07-09')).toBe('');
    expect(durationText('2026-05-20', '2026-05-25')).toBe('1 Month');
    expect(splitRisks('Just one text').problems).toBe('Just one text');
    expect(targetGroupOf('nothing here')).toBe('');
  });
});

describe('Form 3 Word file', () => {
  it('can be read back by the Form 3 import (round trip)', async () => {
    const d = buildForm3Data({ applicant, facts, charter, areas, items, settings });
    const buf = await Packer.toBuffer(buildForm3Document(d));
    const tables = await readDocxTables(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    const p = parseForm3(tables);
    expect(p.title).toBe('Distribution of Qurbani Meat 2026');
    expect(p.manager).toBe('Md Abu Huraira');
    expect(p.duration).toBe('2 Months');
    expect(p.areas).toHaveLength(2);
    expect(p.areas[1]).toEqual({ region: 'Chittagong', cities: 'Ukhiya', villages: 'Jamtoli', itemQuantity: 60, families: 2700 });
    expect(p.areasFamiliesTotal).toBe(4500);
    expect(p.budget.lines.map((l) => [l.name, l.quantity, l.unitPriceLocal])).toEqual([['Cattle', 100, 84105], ['Transportation', 100, 1755]]);
    expect(p.budget.purchasedTotalLocal).toBe(8586000);
    expect(p.charter.background).toContain('cannot afford meat');
    expect(p.charter.objectives).toContain('food security');
    expect(p.charter.risks).toContain('Crowding');
    expect(p.warnings).toEqual([]);
  });
});

describe('buildForm3Data notes', () => {
  it('warns when the donor amount and the budget total differ', () => {
    const x = buildForm3Data({ applicant, facts, charter, areas, items, settings });
    expect(x.cost.notes.some((n) => n.includes('not the same as the budget total'))).toBe(true);
    const y = buildForm3Data({ applicant, facts: { ...facts, budgetAmount: 66780 }, charter, areas, items, settings });
    expect(y.cost.notes).toEqual([]);
  });
});
