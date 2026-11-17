// @vitest-environment jsdom
import { Packer } from 'docx';
import { describe, expect, it } from 'vitest';
import type { BudgetItem, BudgetSettings } from '../budget';
import type { CharterProjectFacts, CharterText } from '../charter';
import { buildForm7Data, longDate, shortDate } from '../form7Export';
import { buildForm7Document } from '../form7Docx';
import { EMPTY_APPLICANT } from '../form3Export';
import { readDocxTables } from '../docxTables';
import type { ProjectArea } from '../projectAreas';

const facts: CharterProjectFacts = { code: 'P-1', title: 'Qurbani 2026', donorName: 'IHH', location: null, budgetAmount: 32500, currency: 'EUR', beneficiaryTarget: null, startDate: '2026-05-20', endDate: '2026-07-09' };
const charter: CharterText = { background: 'Need.', objectives: 'Feed families.', scopeIn: '', scopeOut: '', deliverables: '', risks: '', team: '' };
const areas: ProjectArea[] = [{ id: 'a', position: 1, region: 'Chittagong', cities: 'Ukhiya', villages: 'Jamtoli', itemQuantity: 50, itemUnit: null, families: 2250 }];
const items: BudgetItem[] = [{ id: 'i', kind: 'per_package', groupName: null, position: 1, name: 'Cattle', measure: 'Pcs', quantity: 1, unitPriceBdt: 78975 }];
const settings: BudgetSettings = { packagesCount: 50, adminPercent: 5, exchangeRate: 135, rateDate: null, rateNote: null, rateSetByName: null, rateSetAt: null };
const base = { applicant: { ...EMPTY_APPLICANT, generalManagerName: 'Md Abu Huraira' }, facts, charter, areas, items, settings };

describe('buildForm7Data', () => {
  const d = buildForm7Data({
    ...base,
    claims: [{ id: 'c1', description: 'Transport of cattle', amount: 87750, fxRateToBdt: 1, expenseDate: '2026-06-16' }],
    orders: [{ id: 'o1', description: 'Sacrificial cows', vendorName: 'National Cattle Market', totalBdt: 3948750, issuedOn: '2026-06-15' }],
    receipts: [{ receivedOn: '2026-05-25', amount: 32500, currency: 'EUR' }],
  });
  it('adds up the spending, the admin share and what is unspent', () => {
    expect(d.spend.totalLocal).toBe(4036500);
    expect(d.admin.local).toBe(201825);
    expect(d.totalExpenditureText).toBe('€31,395.00');
    expect(d.fundsReceivedText).toBe('€32,500.00');
    expect(d.unspentText).toBe('€1,105.00');
    expect(d.families).toBe(2250);
    expect(d.individuals).toBe(11250);
    expect(d.rateText).toBe('1 EUR = 135 BDT');
  });
  it('lists the invoices oldest first, with the supplier for purchase orders', () => {
    expect(d.invoices.map((i) => [i.no, i.date, i.store, i.goods])).toEqual([
      ['1', '15/06/2026', 'National Cattle Market', 'Sacrificial cows'],
      ['2', '16/06/2026', '', 'Transport of cattle'],
    ]);
  });
  it('converts a claim in another currency with its own rate', () => {
    const x = buildForm7Data({ ...base, claims: [{ id: 'c', description: 'Fee', amount: 10, fxRateToBdt: 135, expenseDate: '2026-06-01' }], orders: [], receipts: [] });
    expect(x.spend.totalLocal).toBe(1350);
    expect(x.fundsReceivedText).toBe('');
    expect(x.unspentText).toBe('');
    expect(x.notes.some((n) => n.includes('No fund receipt'))).toBe(true);
  });
  it('says so when nothing was spent yet', () => {
    const x = buildForm7Data({ ...base, claims: [], orders: [], receipts: [] });
    expect(x.invoices).toEqual([]);
    expect(x.notes.some((n) => n.includes('No approved expense claim'))).toBe(true);
  });
  it('uses the shop name and invoice number recorded on claims and purchase orders', () => {
    const x = buildForm7Data({
      ...base,
      claims: [{ id: 'c', description: 'Rice', amount: 5000, fxRateToBdt: 1, expenseDate: '2026-06-01', vendorName: 'Rahim Store', receiptRef: 'INV-77', quantity: 100, measure: 'kg' }],
      orders: [{ id: 'o', description: 'Cows', vendorName: 'Cattle Market', totalBdt: 10000, issuedOn: '2026-06-02', invoiceNo: 'PO-9' }],
      receipts: [],
    });
    expect(x.invoices.map((i) => [i.no, i.store])).toEqual([['INV-77', 'Rahim Store'], ['PO-9', 'Cattle Market']]);
    expect(x.notes.some((n) => n.includes('no shop name or invoice number'))).toBe(false);
  });
  it('shows quantity and unit price, and adds up the same item bought twice', () => {
    const claim = (id: string, amount: number, qty: number) => ({ id, description: 'Rice', amount, fxRateToBdt: 1, expenseDate: '2026-06-01', vendorName: 'S', receiptRef: id, quantity: qty, measure: 'kg' });
    const x = buildForm7Data({ ...base, claims: [claim('a', 5000, 100), claim('b', 2500, 50)], orders: [], receipts: [] });
    expect(x.spend.rows).toHaveLength(1);
    expect(x.spend.rows[0]).toMatchObject({ name: 'Rice', measure: 'kg', quantity: 150, unitLocal: 50, totalLocal: 7500 });
    expect(x.invoices).toHaveLength(2);
  });
  it('puts the local-support text in section 4.2', async () => {
    const x = buildForm7Data({ ...base, claims: [], orders: [], receipts: [], texts: { rationale: '', experience: '', internalControl: '', otherFunding: '', sustainability: '', localSupport: 'Bought from local farmers.' } });
    const buf = await Packer.toBuffer(buildForm7Document(x));
    const tables = await readDocxTables(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    expect(JSON.stringify(tables)).toContain('Bought from local farmers.');
  });
  it('formats dates', () => {
    expect(longDate('2026-05-20')).toBe('20 May 2026');
    expect(longDate(null)).toBe('');
    expect(shortDate('2026-06-16')).toBe('16/06/2026');
  });
});

describe('Form 7 Word file', () => {
  it('holds the invoice list and the totals', async () => {
    const d = buildForm7Data({
      ...base,
      claims: [{ id: 'c1', description: 'Transport of cattle', amount: 87750, fxRateToBdt: 1, expenseDate: '2026-06-16' }],
      orders: [],
      receipts: [{ receivedOn: '2026-05-25', amount: 32500, currency: 'EUR' }],
    });
    const buf = await Packer.toBuffer(buildForm7Document(d));
    const tables = await readDocxTables(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    const flat = tables.flatMap((tb) => tb.map((r) => r.join(' | '))).join('\n');
    expect(flat).toContain('Transport of cattle');
    expect(flat).toContain('16/06/2026');
    expect(flat).toContain('20 May 2026');
    expect(flat).toContain('11,250');
    expect(flat).toContain('€32,500.00');
  });
});
