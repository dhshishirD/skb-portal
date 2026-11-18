import { beneficiarySchema, normalizeNationalId, normalizePhone, type BeneficiaryFormValues } from './beneficiaries';

/**
 * Bulk upload of beneficiaries from a CSV or Excel sheet. Nothing here needs the encryption key: this file turns
 * the rows of a sheet into checked people and plain-words problems. The server checks the same rows again.
 */

export const IMPORT_MAX_ROWS = 2000;

/** Column titles of the template, in order. */
export const TEMPLATE_HEADERS = ['Full name', 'Sex (female/male/other)', 'Birth year', 'National ID (optional)', 'Phone (optional)'] as const;

export interface ImportRow {
  /** Row number as in the sheet (the header is row 1). */
  line: number;
  values: BeneficiaryFormValues;
}
export interface ImportProblem {
  line: number;
  message: string;
}
export interface ImportParsed {
  rows: ImportRow[];
  problems: ImportProblem[];
  /** Rows read from the sheet, not counting the header and empty lines. */
  total: number;
  /** Set when the whole file cannot be used (missing columns, too many rows). */
  fatal: string | null;
}

/** The template as CSV text (with a byte-order mark so Excel shows it correctly). */
export function templateCsv(): string {
  const example = ['Example Name (delete this line)', 'female', '1990', '', ''];
  return '﻿' + [TEMPLATE_HEADERS.map(csvCell).join(','), example.map(csvCell).join(',')].join('\r\n') + '\r\n';
}
const csvCell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Reads CSV text (comma, semicolon or tab; quotes allowed) into rows of text. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const first = src.split(/\r?\n/, 1)[0] ?? '';
  const delim = [',', ';', '\t'].map((d) => [d, first.split(d).length] as const).sort((a, b) => b[1] - a[1])[0]![0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

type Field = 'fullName' | 'sex' | 'birthYear' | 'nationalId' | 'phone';
const ALIASES: Record<Field, string[]> = {
  fullName: ['fullname', 'name', 'beneficiaryname', 'nameofbeneficiary'],
  sex: ['sex', 'gender', 'sexfemalemaleother'],
  birthYear: ['birthyear', 'yearofbirth', 'born', 'dobyear'],
  nationalId: ['nationalid', 'nid', 'nationalidoptional', 'idnumber'],
  phone: ['phone', 'mobile', 'phonenumber', 'phoneoptional', 'mobilenumber'],
};
const squash = (h: string) => h.toLowerCase().replace(/[^a-z]/g, '');
const SEX_WORDS: Record<string, 'female' | 'male' | 'other'> = {
  female: 'female', f: 'female', woman: 'female', girl: 'female',
  male: 'male', m: 'male', man: 'male', boy: 'male',
  other: 'other', o: 'other',
};
/** Excel may turn an ID into a number like 1.234E+12 or drop leading zeros; only whole-number text is accepted. */
const clean = (v: string | undefined) => (v ?? '').trim();

/** Turns the rows of a sheet (first row = column titles) into checked people and problems. */
export function parseBeneficiaryRows(grid: string[][], thisYear = new Date().getFullYear()): ImportParsed {
  const out: ImportParsed = { rows: [], problems: [], total: 0, fatal: null };
  if (grid.length === 0) return { ...out, fatal: 'The file is empty.' };
  const header = (grid[0] ?? []).map(squash);
  const col: Partial<Record<Field, number>> = {};
  (Object.keys(ALIASES) as Field[]).forEach((f) => {
    const i = header.findIndex((h) => ALIASES[f].includes(h));
    if (i >= 0) col[f] = i;
  });
  const missing = (['fullName', 'sex'] as Field[]).filter((f) => col[f] === undefined);
  if (missing.length > 0) {
    return { ...out, fatal: 'The first row must hold the column titles. Please use the template: columns "Full name" and "Sex" are required.' };
  }

  const seenIds = new Map<string, number>();
  for (let r = 1; r < grid.length; r++) {
    const cells = grid[r] ?? [];
    if (cells.every((c) => clean(c) === '')) continue;
    out.total += 1;
    if (out.total > IMPORT_MAX_ROWS) return { ...out, rows: [], problems: [], fatal: `A file may hold up to ${IMPORT_MAX_ROWS} people. Please split it into smaller files.` };
    const line = r + 1;
    const get = (f: Field) => clean(col[f] === undefined ? '' : cells[col[f]!]);
    const rawSex = get('sex').toLowerCase();
    const sex = SEX_WORDS[rawSex];
    if (/^\(?delete this line\)?$/i.test(get('fullName')) || /\(delete this line\)/i.test(get('fullName'))) {
      out.total -= 1;
      continue;
    }
    if (!sex) {
      out.problems.push({ line, message: 'Sex must be female, male or other' });
      continue;
    }
    const nidText = get('nationalId');
    if (/^\d(\.\d+)?e\+?\d+$/i.test(nidText)) {
      out.problems.push({ line, message: 'Excel changed the national ID into a short number. Format that column as Text and type the IDs again' });
      continue;
    }
    // Excel drops the leading zero of a phone number stored as a number
    const phoneText = /^1\d{9}$/.test(get('phone')) ? `0${get('phone')}` : get('phone');
    const values = { fullName: get('fullName'), sex, birthYear: get('birthYear'), nationalId: nidText, phone: phoneText } as BeneficiaryFormValues;
    const parsed = beneficiarySchema.safeParse(values);
    if (!parsed.success) {
      out.problems.push({ line, message: parsed.error.issues[0]?.message ?? 'Please check this row' });
      continue;
    }
    if (parsed.data.birthYear !== null && parsed.data.birthYear > thisYear) {
      out.problems.push({ line, message: 'Enter a 4-digit birth year' });
      continue;
    }
    if (parsed.data.nationalId) {
      const nid = normalizeNationalId(parsed.data.nationalId);
      const before = seenIds.get(nid);
      if (before !== undefined) {
        out.problems.push({ line, message: `The same national ID is already on row ${before}` });
        continue;
      }
      seenIds.set(nid, line);
    }
    out.rows.push({ line, values });
  }
  if (out.total === 0) out.fatal = 'No people were found below the column titles.';
  return out;
}

/** Plain-text summary used by the server and the page: normalises the optional fields the same way everywhere. */
export const normalisedPhone = (v: string | null | undefined) => (v ? normalizePhone(v) : null);
