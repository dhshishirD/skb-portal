// @vitest-environment node
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import type { BudgetItem } from '../budget';
import { buildDeckPlan, chunk, deckFileName, paginateText, type DeckInput } from '../projectDeck';
import { buildDeckPptx } from '../projectDeckPptx';

const item = (id: string, over: Partial<BudgetItem>): BudgetItem => ({ id, kind: 'per_package', groupName: 'Food', position: 0, name: 'Rice', measure: 'Kg', quantity: 10, unitPriceBdt: 100, ...over });
const full = (over: Partial<DeckInput> = {}): DeckInput => ({
  audience: 'internal',
  project: { code: 'P-1', title: 'Winter Aid', stageLabel: 'Implementation', location: 'Sylhet', donorName: 'IHH', startDate: '2026-11-01', endDate: '2027-02-28', beneficiaryTarget: 500 },
  charter: { version: 1, approved: true, text: { background: 'Need.', objectives: '1. One\n2. Two', scopeIn: 'In', scopeOut: 'Out', deliverables: 'Kits', risks: 'Rain', team: 'PO' } },
  areas: [{ id: 'a', position: 0, region: 'Sylhet', cities: 'X', villages: null, itemQuantity: 10, itemUnit: 'kits', families: 10 }],
  counts: { women: 1, men: 2, girls: 3, boys: 4, unspecified: 0, total: 10 },
  logframe: null,
  budget: { projectId: 'p', stage: 'implementation' as never, donorAmount: 10000, currency: 'BDT', settings: { packagesCount: 5, adminPercent: 5, exchangeRate: null, rateDate: null, rateNote: null, rateSetByName: null, rateSetAt: null }, items: [item('a', {}), item('b', { kind: 'one_off', groupName: null, name: 'Van', quantity: 1, unitPriceBdt: 300 })], closed: false, canEdit: false, canSetRate: false },
  preparedOn: '2026-11-22',
  ...over,
});
const titles = (i: DeckInput) => buildDeckPlan(i).slides.map((s) => s.title);

describe('buildDeckPlan', () => {
  it('internal deck includes risks, team and scope limits; donor deck does not', () => {
    const internal = titles(full());
    expect(internal).toEqual(expect.arrayContaining(['Risks and assumptions', 'Team and roles', 'Out of scope']));
    const donor = titles(full({ audience: 'donor' }));
    expect(donor).not.toContain('Risks and assumptions');
    expect(donor).not.toContain('Team and roles');
    expect(donor).not.toContain('Out of scope');
  });
  it('shows administration cost only inside SKB', () => {
    const facts = (a: 'donor' | 'internal') => {
      const b = buildDeckPlan(full({ audience: a })).slides.find((s) => s.type === 'budget');
      return b && b.type === 'budget' ? b.facts.map((f) => f.label) : [];
    };
    expect(facts('internal')).toContain('Administration cost');
    expect(facts('donor')).not.toContain('Administration cost');
  });
  it('shows only counts of people, never names', () => {
    const p = buildDeckPlan(full()).slides.find((s) => s.type === 'people');
    expect(Object.keys(p!)).toEqual(['type', 'title', 'groups', 'total', 'note']);
    expect(p && p.type === 'people' && p.total).toBe(10);
  });
  it('leaves out empty parts and says so, with no empty slides', () => {
    const plan = buildDeckPlan(full({ charter: null, areas: [], counts: null, logframe: null, budget: null }));
    expect(plan.skipped.length).toBe(5);
    expect(plan.slides.map((s) => s.type)).toEqual(['title', 'stats', 'closing']);
  });
  it('warns when the charter is not approved', () => {
    const plan = buildDeckPlan(full({ charter: { version: 3, approved: false, text: full().charter!.text } }));
    expect(plan.cautions.join(' ')).toMatch(/version 3/);
  });
  it('splits long writing across slides', () => {
    const long = 'Sentence number one is here. '.repeat(80);
    const plan = buildDeckPlan(full({ charter: { version: 1, approved: true, text: { ...full().charter!.text, background: long } } }));
    expect(plan.slides.filter((s) => s.title.startsWith('Background and need')).length).toBeGreaterThan(1);
  });
});

describe('helpers', () => {
  it('chunks and paginates', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(paginateText('a\n\nb')).toEqual([['a', 'b']]);
  });
  it('names the file', () => {
    expect(deckFileName('SKB 2026/004', 'donor', '2026-11-22')).toBe('SKB-SKB-2026-004-presentation-donor-2026-11-22.pptx');
  });
});

describe('buildDeckPptx', () => {
  it('writes one slide file per planned slide', async () => {
    const plan = buildDeckPlan(full());
    const bytes = await buildDeckPptx(plan, { code: 'P-1', title: 'Winter Aid' });
    const zip = await JSZip.loadAsync(bytes);
    const slideFiles = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
    expect(slideFiles).toHaveLength(plan.slides.length);
    const first = await zip.file('ppt/slides/slide1.xml')!.async('string');
    expect(first).toContain('Winter Aid');
  });
});
