import { describe, expect, it } from 'vitest';
import { bodyParagraphs, friendlyLetterError, letterFileName, letterSchema, missingForIssue, nonEmptyLines, padDate, refNo } from '../letters';

describe('refNo', () => {
  it('uses three digits and two-digit year', () => {
    expect(refNo(82, 2026)).toBe('SKB-082/26');
    expect(refNo(1, 2027)).toBe('SKB-001/27');
    expect(refNo(1234, 2026)).toBe('SKB-1234/26');
  });
});

describe('missingForIssue', () => {
  it('lists what is empty', () => {
    expect(missingForIssue({ toLines: ' ', subject: '', body: 'x', signatoryName: '' })).toEqual(['who the letter is to', 'the subject', 'the name of the person who signs']);
    expect(missingForIssue({ toLines: 'a', subject: 'b', body: 'c', signatoryName: 'd' })).toEqual([]);
  });
});

describe('text helpers', () => {
  it('splits paragraphs on blank lines', () => {
    expect(bodyParagraphs('One\nstill one\r\n\r\nTwo\n\n\n  \nThree')).toEqual(['One\nstill one', 'Two', 'Three']);
  });
  it('drops empty lines', () => {
    expect(nonEmptyLines('A\n\n B \r\n')).toEqual(['A', 'B']);
  });
  it('formats the pad date', () => {
    expect(padDate('2026-11-22')).toBe('22 Nov 2026');
    expect(padDate('nope')).toBe('');
  });
  it('makes a safe file name', () => {
    expect(letterFileName({ refNo: 'SKB-082/26', subject: 'Thanks / "Grant"!' })).toBe('SKB-Letter-SKB-082-26-Thanks-Grant.docx');
    expect(letterFileName({ refNo: null, subject: '' })).toBe('SKB-Letter-Draft.docx');
  });
});

describe('letterSchema', () => {
  it('fills defaults and enforces limits', () => {
    const r = letterSchema.parse({});
    expect(r.salutation).toBe('Dear Sir/Madam,');
    expect(r.closing).toBe('Sincerely,');
    expect(letterSchema.safeParse({ body: 'x'.repeat(8001) }).success).toBe(false);
  });
});

describe('friendlyLetterError', () => {
  it('maps known messages', () => {
    expect(friendlyLetterError({ message: 'Letter has already been issued' })).toMatch(/already been issued/);
    expect(friendlyLetterError({ code: '42501', message: 'x' })).toMatch(/permission/);
    expect(friendlyLetterError(null)).toMatch(/Nothing was saved/);
  });
});
