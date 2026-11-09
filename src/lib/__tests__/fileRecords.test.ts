import { describe, expect, it } from 'vitest';
import { canDeleteFileRecords, canReadFileRecords, canWriteFileRecords, fileRecordSchema, friendlyFileRecordError, kindLabel, statusLabel } from '../fileRecords';

const ok = { kind: 'nid_sheet', name: 'NID sheet batch 1', status: 'prepared', link: '', note: '' };

describe('file record roles', () => {
  it('field officers write but do not delete; donors see nothing', () => {
    expect(canWriteFileRecords(['field_officer'])).toBe(true);
    expect(canDeleteFileRecords(['field_officer'])).toBe(false);
    expect(canDeleteFileRecords(['project_officer'])).toBe(true);
    expect(canReadFileRecords(['me_officer'])).toBe(true);
    expect(canReadFileRecords(['donor'])).toBe(false);
    expect(canReadFileRecords(['finance'])).toBe(false);
  });
});

describe('fileRecordSchema', () => {
  it('accepts a normal record and turns empty link and note into null', () => {
    const r = fileRecordSchema.parse(ok);
    expect(r.link).toBeNull();
    expect(r.note).toBeNull();
  });
  it('only accepts https links without spaces', () => {
    expect(fileRecordSchema.safeParse({ ...ok, link: 'https://drive.google.com/x' }).success).toBe(true);
    expect(fileRecordSchema.safeParse({ ...ok, link: 'http://example.com' }).success).toBe(false);
    expect(fileRecordSchema.safeParse({ ...ok, link: 'javascript:alert(1)' }).success).toBe(false);
    expect(fileRecordSchema.safeParse({ ...ok, link: 'https://a b' }).success).toBe(false);
  });
  it('checks kind, status and name length', () => {
    expect(fileRecordSchema.safeParse({ ...ok, kind: 'other' }).success).toBe(false);
    expect(fileRecordSchema.safeParse({ ...ok, status: 'lost' }).success).toBe(false);
    expect(fileRecordSchema.safeParse({ ...ok, name: 'ab' }).success).toBe(false);
  });
  it('has readable labels', () => {
    expect(kindLabel('nid_sheet')).toBe('NID sheet');
    expect(statusLabel('received')).toBe('Received');
  });
  it('explains database errors', () => {
    expect(friendlyFileRecordError({ message: 'file records of a closed project' })).toMatch(/closed/);
    expect(friendlyFileRecordError({ code: '23514', message: 'x' })).toMatch(/https/);
    expect(friendlyFileRecordError({ code: '42501', message: 'x' })).toMatch(/permission/);
  });
});
