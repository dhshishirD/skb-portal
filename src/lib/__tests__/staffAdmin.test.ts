import { describe, it, expect } from 'vitest';
import { checkRoleChange, createsReportingLoop, inviteSchema, sortByHierarchy } from '../staffAdmin';

const ED = 'ed', HR = 'hr', IT = 'it';

describe('checkRoleChange', () => {
  it('allows a Super Admin to change someone else', () => {
    expect(
      checkRoleChange({ actorId: HR, targetId: IT, newRoles: ['it_officer'], newActive: true, activeSuperAdminIds: [ED, HR] })
    ).toBeNull();
  });

  it('blocks removing your own Super Admin role', () => {
    expect(
      checkRoleChange({ actorId: HR, targetId: HR, newRoles: ['programme_manager'], newActive: true, activeSuperAdminIds: [ED, HR] })
    ).toMatch(/own Super Admin/);
  });

  it('blocks deactivating yourself', () => {
    expect(
      checkRoleChange({ actorId: HR, targetId: HR, newRoles: ['super_admin'], newActive: false, activeSuperAdminIds: [ED, HR] })
    ).toMatch(/deactivate your own/);
  });

  it('blocks removing the last Super Admin', () => {
    expect(
      checkRoleChange({ actorId: HR, targetId: ED, newRoles: ['executive'], newActive: true, activeSuperAdminIds: [ED] })
    ).toMatch(/last active Super Admin/);
  });

  it('allows removing a Super Admin when another remains', () => {
    expect(
      checkRoleChange({ actorId: HR, targetId: ED, newRoles: ['executive'], newActive: true, activeSuperAdminIds: [ED, HR] })
    ).toBeNull();
  });
});

describe('createsReportingLoop', () => {
  const managerOf = new Map<string, string | null>([
    ['chair', null],
    [ED, 'chair'],
    [HR, ED],
    [IT, ED],
  ]);
  it('accepts a normal chain', () => expect(createsReportingLoop(IT, ED, managerOf)).toBe(false));
  it('rejects reporting to yourself', () => expect(createsReportingLoop(ED, ED, managerOf)).toBe(true));
  it('rejects a loop', () => expect(createsReportingLoop('chair', HR, managerOf)).toBe(true));
});

describe('inviteSchema', () => {
  it('normalises input', () => {
    const v = inviteSchema.parse({
      email: '  Emran@SKB.org.bd ',
      fullName: 'Emran Ahmed',
      designation: 'Program Officer',
      reportsTo: '',
      displayOrder: '40',
      roles: ['project_officer', 'field_officer'],
    });
    expect(v.email).toBe('emran@skb.org.bd');
    expect(v.reportsTo).toBeNull();
    expect(v.displayOrder).toBe(40);
  });

  it('rejects donor/partner roles and empty role lists', () => {
    expect(inviteSchema.safeParse({ email: 'a@b.co', fullName: 'Ab', designation: '', reportsTo: '', roles: ['donor'] }).success).toBe(false);
    expect(inviteSchema.safeParse({ email: 'a@b.co', fullName: 'Ab', designation: '', reportsTo: '', roles: [] }).success).toBe(false);
  });
});

describe('sortByHierarchy', () => {
  it('orders by display order then name', () => {
    const rows = [
      { fullName: 'Mizbah Uddin', displayOrder: 50 },
      { fullName: 'Dr. Orakatul Jannat', displayOrder: 10 },
      { fullName: 'Emran Ahmed', displayOrder: 50 },
    ];
    expect(sortByHierarchy(rows).map((r) => r.fullName)).toEqual(['Dr. Orakatul Jannat', 'Emran Ahmed', 'Mizbah Uddin']);
  });
});
