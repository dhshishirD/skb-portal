import { describe, expect, it } from 'vitest';
import { chooseCounts, friendlyHeadcountError, headcountSchema, headcountToGroups, headcountTotal } from './headcounts';

const reg = (over = {}) => ({ women: 0, men: 0, girls: 0, boys: 0, unspecified: 0, total: 0, ...over });

describe('head count', () => {
  it('reads whole numbers, treats blank as 0', () => {
    const r = headcountSchema.parse({ women: '50', men: '', girls: undefined, boys: 3, note: '  list in folder ' });
    expect(r).toEqual({ women: 50, men: 0, girls: 0, boys: 3, note: 'list in folder' });
  });

  it('refuses decimals, negatives and absurd numbers', () => {
    expect(headcountSchema.safeParse({ women: '1.5' }).success).toBe(false);
    expect(headcountSchema.safeParse({ women: '-2' }).success).toBe(false);
    expect(headcountSchema.safeParse({ women: '2000000' }).success).toBe(false);
    expect(headcountSchema.safeParse({ women: 'abc' }).success).toBe(false);
  });

  it('adds up and converts to the shape Form-7 uses', () => {
    const h = { women: 50, men: 2, girls: 1, boys: 0 };
    expect(headcountTotal(h)).toBe(53);
    expect(headcountToGroups(h)).toEqual({ women: 50, men: 2, girls: 1, boys: 0, unspecified: 0, total: 53 });
  });

  it('uses registered people first, the head count only when nobody is registered', () => {
    const h = { women: 50, men: 0, girls: 0, boys: 0 };
    const registered = reg({ women: 2, total: 2 });
    expect(chooseCounts(registered, h)).toBe(registered);
    expect(chooseCounts(reg(), h)?.women).toBe(50);
    expect(chooseCounts(null, h)?.total).toBe(50);
    expect(chooseCounts(reg(), null)?.total).toBe(0);
    expect(chooseCounts(reg(), { women: 0, men: 0, girls: 0, boys: 0 })?.total).toBe(0);
  });

  it('turns database errors into plain words', () => {
    expect(friendlyHeadcountError({ message: 'the head count of a closed project cannot be changed' })).toMatch(/closed/);
    expect(friendlyHeadcountError({ code: '42501' })).toMatch(/permission/);
    expect(friendlyHeadcountError({ code: '23514' })).toMatch(/whole number/);
  });
});
