import { describe, expect, it } from 'vitest';
import { canReleaseDocuments, canWriteDocuments, categoryLabel, documentSchema, fileProblem, formatSize, friendlyDocumentError, safeFileName } from '../documents';

describe('who can do what', () => {
  it('writers add, only the two managers release', () => {
    expect(canWriteDocuments(['project_officer'])).toBe(true);
    expect(canWriteDocuments(['field_officer'])).toBe(false);
    expect(canWriteDocuments(['donor'])).toBe(false);
    expect(canReleaseDocuments(['project_officer'])).toBe(false);
    expect(canReleaseDocuments(['programme_manager'])).toBe(true);
    expect(canReleaseDocuments(['executive'])).toBe(true);
  });
});

describe('file checks', () => {
  const ok = { name: 'a.pdf', type: 'application/pdf', size: 1000 };
  it('accepts a normal file and refuses the wrong type, empty and oversized', () => {
    expect(fileProblem(ok)).toBeNull();
    expect(fileProblem({ ...ok, type: 'application/x-msdownload' })).toMatch(/not allowed/);
    expect(fileProblem({ ...ok, size: 0 })).toMatch(/empty/);
    expect(fileProblem({ ...ok, size: 26 * 1024 * 1024 })).toMatch(/25 MB/);
    expect(fileProblem({ ...ok, name: '' })).toMatch(/Choose/);
  });
  it('cleans file names and formats sizes', () => {
    const cleaned = safeFileName('my file (1)/../x.pdf');
    expect(cleaned).not.toMatch(/\.\.|\//);
    expect(safeFileName('report..final.pdf')).toBe('report.final.pdf');
    expect(safeFileName('').length).toBeGreaterThan(0);
    expect(formatSize(500)).toBe('1 KB');
    expect(formatSize(2 * 1024 * 1024)).toBe('2.0 MB');
  });
});

describe('details and words', () => {
  it('validates the form', () => {
    expect(documentSchema.safeParse({ title: 'x', category: 'other' }).success).toBe(false);
    expect(documentSchema.safeParse({ title: 'Grant agreement', category: 'nope' }).success).toBe(false);
    const r = documentSchema.safeParse({ title: ' Grant agreement ', category: 'agreement', description: '' });
    expect(r.success && r.data).toMatchObject({ title: 'Grant agreement', category: 'agreement', description: null });
  });
  it('shows older categories readably', () => {
    expect(categoryLabel('agreement')).toBe('Agreement / MoU');
    expect(categoryLabel('MANDATORY_PRIMARY')).toBe('Mandatory primary');
  });
  it('explains database errors', () => {
    expect(friendlyDocumentError('the documents of a closed project cannot be changed')).toMatch(/closed project/);
    expect(friendlyDocumentError('only the Executive Director or Programme Manager can release a document to the donor')).toMatch(/Executive Director/);
    expect(friendlyDocumentError('new row violates row-level security policy')).toMatch(/permission/);
    expect(friendlyDocumentError(undefined)).toMatch(/try again/);
  });
});
