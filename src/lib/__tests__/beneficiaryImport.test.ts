import { describe, expect, it } from 'vitest';
import { IMPORT_MAX_ROWS, parseBeneficiaryRows, parseCsv, templateCsv } from '../beneficiaryImport';

const head = ['Full name', 'Sex (female/male/other)', 'Birth year', 'National ID (optional)', 'Phone (optional)'];

describe('parseCsv', () => {
  it('reads quotes, commas inside quotes, BOM and CRLF', () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([['a', 'b'], ['x, y', 'say "hi"']]);
  });
  it('detects semicolons', () => {
    expect(parseCsv('a;b\n1;2')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('parseBeneficiaryRows', () => {
  it('accepts good rows and the template header', () => {
    const r = parseBeneficiaryRows([head, ['Rahim Uddin', 'male', '1980', '1234567890', '01712345678'], ['Salma', 'F', '', '', '']], 2026);
    expect(r.fatal).toBeNull();
    expect(r.rows).toHaveLength(2);
    expect(r.problems).toHaveLength(0);
    expect(r.rows[1]!.values.sex).toBe('female');
  });
  it('lists problems with the sheet row number', () => {
    const r = parseBeneficiaryRows([head, ['A', 'male', '1980'], ['Salma Begum', 'x', ''], ['Karim Ali', 'male', '19x0'], ['Rina Das', 'female', '1990', '123', '']], 2026);
    expect(r.rows).toHaveLength(0);
    expect(r.problems.map((p) => p.line)).toEqual([2, 3, 4, 5]);
  });
  it('flags the same ID twice and skips empty lines and the template example', () => {
    const r = parseBeneficiaryRows(
      [head, ['Example Name (delete this line)', 'female', '1990', '', ''], ['', '', '', '', ''], ['Abul Hasan', 'male', '1970', '1234 567 890', ''], ['Abul Hasan Jr', 'male', '1995', '1234-567-890', '']],
      2026,
    );
    expect(r.rows).toHaveLength(1);
    expect(r.problems).toEqual([{ line: 5, message: 'The same national ID is already on row 4' }]);
    expect(r.total).toBe(2);
  });
  it('refuses a file without the required columns, an empty file and too many rows', () => {
    expect(parseBeneficiaryRows([['a', 'b'], ['1', '2']]).fatal).toMatch(/template/);
    expect(parseBeneficiaryRows([]).fatal).toMatch(/empty/);
    const many = [head, ...Array.from({ length: IMPORT_MAX_ROWS + 1 }, (_, i) => [`Person ${i}`, 'male', '1990', '', ''])];
    expect(parseBeneficiaryRows(many).fatal).toMatch(/up to/);
  });
  it('handles Excel number quirks', () => {
    const r = parseBeneficiaryRows([head, ['Rahim Uddin', 'male', '1980', '1.23456789E12', ''], ['Salma Begum', 'female', '1990', '', '1712345678']], 2026);
    expect(r.problems).toHaveLength(1);
    expect(r.problems[0]!.message).toMatch(/Format that column as Text/);
    expect(r.rows[0]!.values.phone).toBe('01712345678');
  });
  it('the template can be read back', () => {
    const r = parseBeneficiaryRows(parseCsv(templateCsv()));
    expect(r.fatal).toBe('No people were found below the column titles.');
  });
});
