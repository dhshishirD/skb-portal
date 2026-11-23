import { describe, expect, it } from 'vitest';
import { canPreviewDonorPortal, canViewDonorPortal, fileSizeText, timeProgress, toCard } from '../donorPortal';
import { canOpenPath } from '../desks';

describe('donorPortal', () => {
  it('opens the donor area for donors and the people who may preview it', () => {
    for (const r of ['donor', 'executive', 'programme_manager', 'super_admin', 'board'] as const) {
      expect(canViewDonorPortal([r])).toBe(true);
      expect(canOpenPath('/donor-dashboard/projects/x', [r])).toBe(true);
    }
    for (const r of ['project_officer', 'finance', 'me_officer', 'it_officer'] as const) {
      expect(canViewDonorPortal([r])).toBe(false);
      expect(canOpenPath('/donor-dashboard', [r])).toBe(false);
    }
    expect(canPreviewDonorPortal(['donor'])).toBe(false);
    expect(canPreviewDonorPortal(['executive'])).toBe(true);
  });
  it('keeps donors out of the staff pages', () => {
    for (const path of ['/projects', '/finance/approvals', '/admin/donors', '/admin/users', '/me/dashboard']) expect(canOpenPath(path, ['donor'])).toBe(false);
  });
  it('makes a short card with only summary fields', () => {
    const c = toCard({ id: 'a', code: 'P-1', title: 'Qurbani', stage: 'implementation', location: 'Cox', start_date: '2026-05-20', end_date: '2026-07-09', budget_amount: 32500, budget_currency: 'EUR' }, 2250, 3);
    expect(Object.keys(c).sort()).toEqual(['budgetText', 'code', 'documentCount', 'endDate', 'families', 'id', 'location', 'stageLabel', 'startDate', 'title']);
    expect(c.families).toBe(2250);
    expect(c.documentCount).toBe(3);
  });
  it('writes file sizes', () => {
    expect(fileSizeText(500)).toBe('500 B');
    expect(fileSizeText(2048)).toBe('2 KB');
    expect(fileSizeText(3 * 1_048_576)).toBe('3.0 MB');
  });
});

describe('timeProgress', () => {
  it('shows how much of the planned time has passed', () => {
    expect(timeProgress('2026-10-01', '2027-03-31', '2026-10-01')).toBe(0);
    expect(timeProgress('2026-10-01', '2026-10-31', '2026-10-16')).toBe(50);
    expect(timeProgress('2026-10-01', '2027-03-31', '2027-03-31')).toBe(100);
  });
  it('stays between 0 and 100', () => {
    expect(timeProgress('2026-10-01', '2026-12-31', '2026-09-01')).toBe(0);
    expect(timeProgress('2026-10-01', '2026-12-31', '2028-01-01')).toBe(100);
  });
  it('shows nothing when the dates cannot give an answer', () => {
    expect(timeProgress(null, '2026-12-31', '2026-11-01')).toBeNull();
    expect(timeProgress('2026-10-01', null, '2026-11-01')).toBeNull();
    expect(timeProgress('2026-12-31', '2026-10-01', '2026-11-01')).toBeNull();
    expect(timeProgress('bad', '2026-10-01', '2026-11-01')).toBeNull();
  });
  it('handles a one-day project', () => {
    expect(timeProgress('2026-10-01', '2026-10-01', '2026-09-30')).toBe(0);
    expect(timeProgress('2026-10-01', '2026-10-01', '2026-10-01')).toBe(100);
  });
});
