import { describe, expect, it } from 'vitest';
import { areaSchema, areaTotals, canReadAreas, canWriteAreas, friendlyAreaError, peopleFromFamilies } from '../projectAreas';

describe('project areas', () => {
  it('needs a region and trims text', () => {
    expect(areaSchema.safeParse({ region: '  ' }).success).toBe(false);
    const r = areaSchema.parse({ region: ' Cox’s Bazar ', cities: ' ', families: '1,200', itemQuantity: '30.5' });
    expect(r).toMatchObject({ region: 'Cox’s Bazar', cities: null, families: 1200, itemQuantity: 30.5 });
  });
  it('refuses bad numbers', () => {
    expect(areaSchema.safeParse({ region: 'A', families: '-1' }).success).toBe(false);
    expect(areaSchema.safeParse({ region: 'A', families: '2.5' }).success).toBe(false);
    expect(areaSchema.safeParse({ region: 'A', itemQuantity: 'abc' }).success).toBe(false);
  });
  it('counts five people to a family', () => {
    expect(peopleFromFamilies(4500)).toBe(22500);
    expect(peopleFromFamilies(null)).toBe(0);
    expect(areaTotals([{ families: 100, itemQuantity: 10 }, { families: null, itemQuantity: 5 }])).toEqual({ families: 100, people: 500, quantity: 15 });
  });
  it('limits who writes and reads', () => {
    expect(canWriteAreas(['project_officer'])).toBe(true);
    expect(canWriteAreas(['me_officer'])).toBe(false);
    expect(canReadAreas(['me_officer'])).toBe(true);
    expect(canReadAreas(['donor'])).toBe(false);
  });
  it('gives friendly errors', () => {
    expect(friendlyAreaError({ message: 'the areas of a closed project cannot be changed' })).toMatch(/closed/);
    expect(friendlyAreaError({ code: '42501' })).toMatch(/permission/);
  });
});
