import { describe, expect, it } from 'vitest';
import {
  canDeleteReceipts,
  canRecordReceipts,
  formatDate,
  formatMoney,
  friendlyReceiptError,
  fundReceiptSchema,
  isAckStatus,
  totalReceipts,
  type FundReceipt,
} from '../fundReceipts';
import { buildReceiptLetter, pdfSafe } from '../fundReceiptLetter';

const r = (id: string, amount: number, currency = 'EUR'): FundReceipt => ({
  id,
  receivedOn: '2026-10-05',
  amount,
  currency,
  reference: null,
  fromName: null,
  note: null,
  ackStatus: 'not_sent',
});

describe('totalReceipts', () => {
  it('adds in whole cents without floating point drift', () => {
    const t = totalReceipts([r('a', 0.1), r('b', 0.2), r('c', 4999.7)], 'EUR', 10000);
    expect(t.receivedCents).toBe(500000);
    expect(t.remainingCents).toBe(500000);
  });
  it('keeps other currencies apart and says so', () => {
    const t = totalReceipts([r('a', 1000), r('b', 500, 'USD')], 'EUR', 1000);
    expect(t.receivedCents).toBe(100000);
    expect(t.remainingCents).toBe(0);
    expect(t.otherCurrencies).toEqual(['USD']);
  });
  it('shows a negative remainder when too much is recorded, and null with no donor amount', () => {
    expect(totalReceipts([r('a', 1200)], 'EUR', 1000).remainingCents).toBe(-20000);
    expect(totalReceipts([r('a', 1200)], 'EUR', null).remainingCents).toBeNull();
    expect(totalReceipts([], 'EUR', 1000).receivedCents).toBe(0);
  });
});

describe('roles', () => {
  it('lets the Executive Director, Finance and Program Officers record; only the first two delete', () => {
    for (const role of ['executive', 'finance', 'project_officer'] as const) expect(canRecordReceipts([role])).toBe(true);
    for (const role of ['field_officer', 'donor', 'board', 'programme_manager'] as const) expect(canRecordReceipts([role])).toBe(false);
    expect(canDeleteReceipts(['executive'])).toBe(true);
    expect(canDeleteReceipts(['finance'])).toBe(true);
    expect(canDeleteReceipts(['project_officer'])).toBe(false);
  });
});

describe('formatting', () => {
  it('formats money and dates', () => {
    expect(formatMoney(1000000)).toBe('10,000.00');
    expect(formatMoney(null)).toBe('—');
    expect(formatDate('2026-10-05')).toBe('5 October 2026');
  });
  it('knows the letter statuses', () => {
    expect(isAckStatus('sent')).toBe(true);
    expect(isAckStatus('maybe')).toBe(false);
  });
});

describe('fundReceiptSchema', () => {
  const ok = { receivedOn: '2026-10-05', amount: '10,000.50', currency: 'eur', reference: ' TT-1 ', fromName: '', note: '' };
  it('accepts a good receipt and cleans it', () => {
    expect(fundReceiptSchema.parse(ok)).toEqual({
      receivedOn: '2026-10-05',
      amount: 10000.5,
      currency: 'EUR',
      reference: 'TT-1',
      fromName: null,
      note: null,
    });
  });
  it('rejects bad values with plain messages', () => {
    expect(fundReceiptSchema.safeParse({ ...ok, receivedOn: '' }).success).toBe(false);
    expect(fundReceiptSchema.safeParse({ ...ok, receivedOn: '2026-13-40' }).success).toBe(false);
    expect(fundReceiptSchema.safeParse({ ...ok, amount: '0' }).success).toBe(false);
    expect(fundReceiptSchema.safeParse({ ...ok, amount: '10.123' }).success).toBe(false);
    expect(fundReceiptSchema.safeParse({ ...ok, amount: 'abc' }).success).toBe(false);
    expect(fundReceiptSchema.safeParse({ ...ok, currency: 'EURO' }).success).toBe(false);
    expect(fundReceiptSchema.safeParse({ ...ok, note: 'x'.repeat(501) }).success).toBe(false);
  });
});

describe('friendlyReceiptError', () => {
  it('never leaks raw database text', () => {
    expect(friendlyReceiptError({ message: 'the fund receipts of a closed project cannot be changed', code: '42501' })).toMatch(/closed/);
    expect(friendlyReceiptError({ message: 'new row violates row-level security policy', code: '42501' })).toMatch(/permission/);
    expect(friendlyReceiptError({ code: '23514', message: 'violates check constraint "secret_name"' })).not.toMatch(/secret_name/);
    expect(friendlyReceiptError({ message: 'secret_table exploded' })).not.toMatch(/secret_table/);
  });
});

describe('acknowledgement letter', () => {
  it('makes a one-page PDF', async () => {
    const bytes = await buildReceiptLetter({
      organisationName: 'Test Organisation',
      registrationNo: 'REG-1',
      donorName: 'Test Donor',
      projectCode: 'TEST-1',
      projectTitle: 'A long project title '.repeat(8),
      receivedOn: '2026-10-05',
      amount: 10000,
      currency: 'EUR',
      reference: 'TT-1',
      issuedOn: '2026-11-05',
    });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(1000);
  });
  it('does not crash on characters the font cannot draw', async () => {
    expect(pdfSafe('Café – বাংলা\nline')).toBe('Café ? ????? line');
    const bytes = await buildReceiptLetter({
      organisationName: 'এসকেবি SKB',
      registrationNo: null,
      donorName: null,
      projectCode: 'X',
      projectTitle: 'আগুনে ক্ষতিগ্রস্ত',
      receivedOn: '2026-10-05',
      amount: 1,
      currency: 'EUR',
      reference: null,
      issuedOn: '2026-11-05',
    });
    expect(bytes.length).toBeGreaterThan(500);
  });
});
