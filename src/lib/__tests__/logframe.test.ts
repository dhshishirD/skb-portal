import { describe, expect, it } from 'vitest';
import {
  buildTree, childKind, canEditStructure, canEditIndicators, canValidateValues, descendantCount,
  indicatorProgress, indicatorSchema, nodeSchema, valueSchema, formatNumber, formatPercent,
  type LogframeNode, type IndicatorValue,
} from '../logframe';

const n = (id: string, parentId: string | null, kind: LogframeNode['kind'], code: string): LogframeNode => ({ id, parentId, kind, code, title: 'T ' + code, description: null });
const v = (periodStart: string, periodEnd: string, value: number, validated: boolean): IndicatorValue => ({
  id: periodStart + value, periodStart, periodEnd, value, validatedAt: validated ? '2026-01-01T00:00:00Z' : null,
  validatedByName: null, createdByName: null, createdBy: null,
});

describe('logframe levels and roles', () => {
  it('goes goal > outcome > output > activity', () => {
    expect(childKind('goal')).toBe('outcome');
    expect(childKind('output')).toBe('activity');
    expect(childKind('activity')).toBeNull();
  });
  it('limits who edits and validates', () => {
    expect(canEditStructure(['project_officer'])).toBe(true);
    expect(canEditStructure(['me_officer'])).toBe(false);
    expect(canEditIndicators(['me_officer'])).toBe(true);
    expect(canValidateValues(['project_officer'])).toBe(false);
    expect(canValidateValues(['me_officer'])).toBe(true);
    expect(canValidateValues(['donor'])).toBe(false);
  });
});

describe('tree', () => {
  const nodes = [n('c', 'b', 'output', '1.1.1'), n('a', null, 'goal', '1'), n('b', 'a', 'outcome', '1.1'), n('d', 'a', 'outcome', '1.10'), n('e', 'a', 'outcome', '1.2')];
  it('orders by code numerically and nests', () => {
    const t = buildTree(nodes);
    expect(t).toHaveLength(1);
    expect(t[0].children.map((x) => x.node.code)).toEqual(['1.1', '1.2', '1.10']);
    expect(descendantCount(t[0])).toBe(5);
  });
  it('shows an orphan at the top', () => {
    expect(buildTree([n('x', 'missing', 'output', '9')])).toHaveLength(1);
  });
});

describe('progress counts validated values only', () => {
  it('cumulative adds validated values', () => {
    const p = indicatorProgress({ baseline: 0, target: 200, measure: 'cumulative', values: [v('2026-01-01', '2026-01-31', 50, true), v('2026-02-01', '2026-02-28', 30, true), v('2026-03-01', '2026-03-31', 100, false)] });
    expect(p).toMatchObject({ achievedHundredths: 8000, percentBp: 4000, validatedCount: 2, pendingCount: 1 });
    expect(formatNumber(p.achievedHundredths)).toBe('80');
    expect(formatPercent(p.percentBp)).toBe('40.0%');
  });
  it('latest uses the newest validated value against baseline', () => {
    const p = indicatorProgress({ baseline: 20, target: 80, measure: 'latest', values: [v('2026-01-01', '2026-01-31', 30, true), v('2026-02-01', '2026-02-28', 50, true), v('2026-03-01', '2026-03-31', 80, false)] });
    expect(p.percentBp).toBe(5000);
    expect(p.achievedHundredths).toBe(5000);
  });
  it('has no percent without validated values or with a zero range', () => {
    expect(indicatorProgress({ baseline: 0, target: 10, measure: 'cumulative', values: [v('2026-01-01', '2026-01-02', 5, false)] }).percentBp).toBeNull();
    expect(indicatorProgress({ baseline: 10, target: 10, measure: 'latest', values: [v('2026-01-01', '2026-01-02', 5, true)] }).percentBp).toBeNull();
  });
});

describe('forms', () => {
  it('checks a node', () => {
    expect(nodeSchema.safeParse({ kind: 'goal', code: '', title: 'Goal', description: '' }).success).toBe(false);
    const ok = nodeSchema.parse({ kind: 'goal', code: '1', title: 'Goal', description: '' });
    expect(ok.description).toBeNull();
  });
  it('checks an indicator', () => {
    const base = { name: 'People reached', unit: 'people', baseline: '0', target: '1,000', frequency: '', meansOfVerification: '', measure: 'cumulative' };
    expect(indicatorSchema.parse(base).target).toBe(1000);
    expect(indicatorSchema.safeParse({ ...base, target: '-1' }).success).toBe(false);
    expect(indicatorSchema.safeParse({ ...base, target: '1.234' }).success).toBe(false);
    expect(indicatorSchema.safeParse({ ...base, measure: 'x' }).success).toBe(false);
  });
  it('checks a value period', () => {
    expect(valueSchema.safeParse({ periodStart: '2026-02-01', periodEnd: '2026-01-01', value: '5' }).success).toBe(false);
    expect(valueSchema.parse({ periodStart: '2026-01-01', periodEnd: '2026-01-31', value: '5' }).value).toBe(5);
  });
});
