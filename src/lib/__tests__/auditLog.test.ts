import { describe, expect, it } from 'vitest';
import { canViewAuditLog, changedFields, cleanFilter, dhakaNextDayStart, dhakaStart, headline } from '../auditLog';

describe('changedFields', () => {
  it('lists only fields that changed, skipping noise like updated_at', () => {
    const f = changedFields('expenses', 'UPDATE', { status: 'submitted', amount: 5, updated_at: 'a' }, { status: 'paid', amount: 5, updated_at: 'b' });
    expect(f).toEqual([{ name: 'status', from: 'submitted', to: 'paid', hidden: false }]);
  });
  it('never shows values of personal tables, only the field names', () => {
    const f = changedFields('beneficiaries', 'UPDATE', { name_enc: 'x', note: 'old' }, { name_enc: 'y', note: 'new' });
    expect(f.every((x) => x.hidden && x.from === null && x.to === null)).toBe(true);
    const p = changedFields('profiles', 'UPDATE', { full_name: 'A', phone: '017' }, { full_name: 'B', phone: '018' });
    expect(JSON.stringify(p)).not.toMatch(/017|018|"A"|"B"/);
  });
  it('hides phone, email, NID and file path fields even in other tables', () => {
    const f = changedFields('vendors', 'UPDATE', { phone: '017', email: 'a@b.c', name: 'X' }, { phone: '018', email: 'c@d.e', name: 'Y' });
    expect(f.find((x) => x.name === 'phone')?.hidden).toBe(true);
    expect(f.find((x) => x.name === 'email')?.hidden).toBe(true);
    expect(f.find((x) => x.name === 'name')).toMatchObject({ from: 'X', to: 'Y' });
  });
  it('shows new values for inserts and old values for deletes, and cuts long text', () => {
    expect(changedFields('tasks', 'INSERT', null, { title: 'T' })[0]).toMatchObject({ from: null, to: 'T' });
    expect(changedFields('tasks', 'DELETE', { title: 'T' }, null)[0]).toMatchObject({ from: 'T', to: null });
    const long = changedFields('tasks', 'INSERT', null, { title: 'x'.repeat(500) })[0];
    expect((long.to ?? '').length).toBeLessThanOrEqual(120);
  });
});

describe('headline', () => {
  it('writes plain sentences', () => {
    const fields = changedFields('expenses', 'UPDATE', { status: 'submitted' }, { status: 'pm_approved' });
    expect(headline({ actorName: 'Rahim', table: 'expenses', action: 'UPDATE', subjectName: null, fields, newData: null })).toBe(
      'Rahim changed Expense claim: status submitted → pm_approved'
    );
    expect(headline({ actorName: 'Admin', table: 'user_roles', action: 'INSERT', subjectName: 'Karim', fields: [], newData: { role: 'finance' } })).toBe(
      'Admin added role "finance" for Karim'
    );
    expect(headline({ actorName: null, table: 'projects', action: 'DELETE', subjectName: null, fields: [], newData: null })).toMatch(/^The system/);
  });
});

describe('cleanFilter', () => {
  it('drops odd input and keeps valid input', () => {
    expect(cleanFilter({ table: 'x; drop', action: 'TRUNCATE', actorId: 'nope', from: '2026-13-99x', page: -4 })).toEqual({
      table: undefined, action: undefined, actorId: undefined, from: undefined, to: undefined, includeSystem: false, page: 1,
    });
    const ok = cleanFilter({ table: 'expenses', action: 'UPDATE', actorId: '11111111-1111-4111-8111-111111111111', from: '2026-11-01', to: '2026-11-12', page: 3 });
    expect(ok).toMatchObject({ table: 'expenses', action: 'UPDATE', from: '2026-11-01', to: '2026-11-12', page: 3 });
  });
  it('turns Bangladesh dates into the right instants', () => {
    expect(dhakaStart('2026-11-12')).toBe('2026-11-11T18:00:00.000Z');
    expect(dhakaNextDayStart('2026-11-12')).toBe('2026-11-12T18:00:00.000Z');
  });
});

describe('canViewAuditLog', () => {
  it('allows oversight roles only', () => {
    expect(canViewAuditLog(['executive'])).toBe(true);
    expect(canViewAuditLog(['finance'])).toBe(false);
    expect(canViewAuditLog(['project_officer'])).toBe(false);
  });
});
