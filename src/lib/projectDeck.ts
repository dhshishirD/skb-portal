import type { BudgetData } from './budget';
import { calculateBudget, formatBdtCents, formatMilli } from './budget';
import type { GroupCounts } from './beneficiaries';
import type { CharterText } from './charter';
import { padDate } from './letters';
import { formatNumber, formatPercent, indicatorProgress, matrixRows, MATRIX_LABELS, splitLines, type LogframeData } from './logframe';
import type { ProjectArea } from './projectAreas';

/**
 * The first draft of a project presentation, as a plan of slides (pure and testable). The pptx file is drawn from
 * this plan in projectDeckPptx.ts. Every slide comes from what the portal already holds; a part with nothing in it
 * is left out and listed in `skipped`, so the draft never has empty slides.
 *  - "donor" version: no risks, team, scope limits or administration cost, and only counts of people (no names ever).
 *  - "internal" version: adds those, for the Executive Director, the Board and the team.
 */

export type DeckAudience = 'donor' | 'internal';

export type Slide =
  | { type: 'title'; title: string; subtitle: string; meta: string[] }
  | { type: 'stats'; title: string; stats: Array<{ label: string; value: string }> }
  | { type: 'text'; title: string; paragraphs: string[] }
  | { type: 'bullets'; title: string; items: string[] }
  | { type: 'table'; title: string; head: string[]; rows: string[][]; widths: number[]; note?: string }
  | { type: 'people'; title: string; groups: Array<{ label: string; value: number }>; total: number; note: string }
  | { type: 'budget'; title: string; bars: Array<{ label: string; value: number }>; facts: Array<{ label: string; value: string }>; note?: string }
  | { type: 'closing'; title: string; lines: string[] };

export interface DeckInput {
  audience: DeckAudience;
  project: {
    code: string;
    title: string;
    stageLabel: string;
    location: string | null;
    donorName: string | null;
    startDate: string | null;
    endDate: string | null;
    beneficiaryTarget: number | null;
  };
  /** Newest charter version (approved or not), or null. */
  charter: { text: CharterText; version: number; approved: boolean } | null;
  areas: ProjectArea[] | null;
  counts: GroupCounts | null;
  logframe: LogframeData | null;
  budget: BudgetData | null;
  /** YYYY-MM-DD */
  preparedOn: string;
}

export interface DeckPlan {
  slides: Slide[];
  /** Plain-words list of parts that had nothing to show. */
  skipped: string[];
  /** Things to check before the deck is shown (draft charter, no validated results, and so on). */
  cautions: string[];
}

const MAX_BULLETS = 7;
const MAX_CHARS_PER_TEXT_SLIDE = 650;
const ROWS_PER_TABLE_SLIDE = 6;

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Splits long writing into slides of about 650 characters, breaking between paragraphs (or sentences if one is huge). */
export function paginateText(text: string, limit = MAX_CHARS_PER_TEXT_SLIDE): string[][] {
  const paras = text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((p) => (p.length <= limit ? [p] : (p.match(/[^.!?।]+[.!?।]*\s*/g) ?? [p]).map((s) => s.trim()).filter(Boolean)));
  const pages: string[][] = [];
  let cur: string[] = [];
  let size = 0;
  for (const p of paras) {
    if (cur.length > 0 && size + p.length > limit) {
      pages.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(p.length > limit ? `${p.slice(0, limit - 1)}…` : p);
    size += p.length;
  }
  if (cur.length) pages.push(cur);
  return pages;
}

const titled = (title: string, i: number, n: number) => (n > 1 ? `${title} (${i + 1} of ${n})` : title);

function durationText(start: string | null, end: string | null): string {
  if (!start || !end) return '';
  const [sy, sm, sd] = start.split('-').map(Number) as [number, number, number];
  const [ey, em, ed] = end.split('-').map(Number) as [number, number, number];
  let months = (ey - sy) * 12 + (em - sm) + (ed >= sd ? 0 : -1);
  if (months < 1) return '';
  return months === 1 ? '1 month' : `${months} months`;
}

export function buildDeckPlan(input: DeckInput): DeckPlan {
  const { audience, project: p } = input;
  const slides: Slide[] = [];
  const skipped: string[] = [];
  const cautions: string[] = [];
  const donor = audience === 'donor';

  // 1. Title
  slides.push({
    type: 'title',
    title: p.title,
    subtitle: 'Small Kindness Bangladesh (SKB)',
    meta: [p.code, p.donorName ? `Supported by ${p.donorName}` : '', input.preparedOn ? padDate(input.preparedOn) : ''].filter(Boolean),
  });

  // 2. At a glance
  const stats: Array<{ label: string; value: string }> = [];
  if (p.location) stats.push({ label: 'Location', value: p.location });
  const period = p.startDate && p.endDate ? `${padDate(p.startDate)} to ${padDate(p.endDate)}` : p.startDate ? `From ${padDate(p.startDate)}` : '';
  if (period) stats.push({ label: 'Period', value: [period, durationText(p.startDate, p.endDate)].filter(Boolean).join('  ·  ') });
  stats.push({ label: 'Stage', value: p.stageLabel });
  if (p.beneficiaryTarget) stats.push({ label: 'People to reach (target)', value: p.beneficiaryTarget.toLocaleString('en-US') });
  if (input.budget?.donorAmount != null) {
    stats.push({ label: 'Funding', value: `${input.budget.currency} ${input.budget.donorAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}` });
  }
  if (p.donorName) stats.push({ label: 'Donor', value: p.donorName });
  if (stats.length >= 2) slides.push({ type: 'stats', title: 'The project at a glance', stats });

  // 3. Charter parts
  if (!input.charter) {
    skipped.push('Background, objectives and deliverables (the charter has no saved version)');
  } else {
    const c = input.charter.text;
    if (!input.charter.approved) cautions.push(`The charter text is version ${input.charter.version} and has not been approved by the Executive Director yet.`);
    const textSlides = (title: string, text: string) => {
      const pages = paginateText(text);
      pages.forEach((page, i) => slides.push({ type: 'text', title: titled(title, i, pages.length), paragraphs: page }));
    };
    const bulletSlides = (title: string, text: string) => {
      const lines = splitLines(text, 40);
      chunk(lines, MAX_BULLETS).forEach((items, i, all) => slides.push({ type: 'bullets', title: titled(title, i, all.length), items }));
    };
    if (c.background.trim()) textSlides('Background and need', c.background);
    else skipped.push('Background and need (empty in the charter)');
    if (c.objectives.trim()) bulletSlides('Objectives', c.objectives);
    else skipped.push('Objectives (empty in the charter)');
    if (c.deliverables.trim()) bulletSlides('What we will deliver', c.deliverables);
    else skipped.push('Main deliverables (empty in the charter)');
    if (c.scopeIn.trim()) bulletSlides('What the project covers', c.scopeIn);
    if (!donor) {
      if (c.scopeOut.trim()) bulletSlides('Out of scope', c.scopeOut);
      if (c.team.trim()) bulletSlides('Team and roles', c.team);
      if (c.risks.trim()) bulletSlides('Risks and assumptions', c.risks);
    }
  }

  // 4. Where we work
  if (!input.areas || input.areas.length === 0) {
    skipped.push('Where the project runs (no areas entered)');
  } else {
    const rows = input.areas.map((a) => [a.region, [a.cities, a.villages].filter(Boolean).join(' / ') || '—', a.itemQuantity != null ? `${a.itemQuantity.toLocaleString('en-US')}${a.itemUnit ? ` ${a.itemUnit}` : ''}` : '—', a.families != null ? a.families.toLocaleString('en-US') : '—']);
    const pages = chunk(rows, ROWS_PER_TABLE_SLIDE);
    const families = input.areas.reduce((s, a) => s + (a.families ?? 0), 0);
    pages.forEach((page, i) =>
      slides.push({
        type: 'table',
        title: titled('Where we work', i, pages.length),
        head: ['Region', 'Cities / villages', 'Quantity', 'Families'],
        rows: page,
        widths: [2.4, 5.6, 2.1, 1.6],
        note: i === pages.length - 1 && families > 0 ? `Total: ${families.toLocaleString('en-US')} families` : undefined,
      }),
    );
  }

  // 5. People reached (counts only)
  if (input.counts && input.counts.total > 0) {
    const g = input.counts;
    const groups = [
      { label: 'Women', value: g.women },
      { label: 'Men', value: g.men },
      { label: 'Girls', value: g.girls },
      { label: 'Boys', value: g.boys },
    ];
    if (g.unspecified > 0) groups.push({ label: 'Age or sex not recorded', value: g.unspecified });
    slides.push({
      type: 'people',
      title: 'People reached so far',
      groups,
      total: g.total,
      note: 'Counts of registered people only. No names or personal details are shown.',
    });
  } else {
    skipped.push('People reached (no registered beneficiaries yet)');
  }

  // 6. Results framework
  if (input.logframe && input.logframe.nodes.length > 0) {
    const lf = input.logframe;
    const rowsAll = matrixRows(lf.nodes, lf.indicators).filter((r) => r.node.kind !== 'activity');
    const progressRows: string[][] = [];
    let anyValidated = false;
    for (const { node, indicators } of rowsAll) {
      const level = MATRIX_LABELS[node.kind];
      if (indicators.length === 0) progressRows.push([level, `${node.code}  ${node.title}`, '—', '—']);
      for (const [i, ind] of indicators.entries()) {
        const pr = indicatorProgress(ind);
        if (pr.validatedCount > 0) anyValidated = true;
        progressRows.push([
          i === 0 ? level : '',
          i === 0 ? `${node.code}  ${node.title}` : '',
          `${ind.name}: target ${formatNumber(Math.round(ind.target * 100))} ${ind.unit}`.trim(),
          pr.validatedCount > 0 ? `${formatNumber(pr.achievedHundredths)} (${formatPercent(pr.percentBp)})` : 'Not yet reported',
        ]);
      }
    }
    const pages = chunk(progressRows, ROWS_PER_TABLE_SLIDE);
    pages.forEach((page, i) =>
      slides.push({
        type: 'table',
        title: titled('Results framework and progress', i, pages.length),
        head: ['Level', 'Result', 'Indicator and target', 'Achieved (checked)'],
        rows: page,
        widths: [1.8, 4.2, 4.2, 1.8],
        note: i === pages.length - 1 ? 'Achieved counts only results that were checked by the M&E team.' : undefined,
      }),
    );
    if (!anyValidated) cautions.push('No indicator result has been checked yet, so progress shows "Not yet reported".');
  } else {
    skipped.push('Results framework (no logframe yet)');
  }

  // 7. Budget
  if (input.budget && input.budget.items.length > 0) {
    const b = input.budget;
    const calc = calculateBudget({ items: b.items, packagesCount: b.settings.packagesCount, adminPercent: b.settings.adminPercent, exchangeRate: b.settings.exchangeRate, donorAmount: b.donorAmount, currency: b.currency });
    const count = calc.packagesCount;
    const bars = [
      ...calc.groups.map((g) => ({ label: g.name ?? 'Other items', value: (g.bdtCents * count) / 100 })),
      ...(calc.oneOffBdtCents > 0 ? [{ label: 'One-off costs', value: calc.oneOffBdtCents / 100 }] : []),
    ].filter((x) => x.value > 0);
    const facts = [{ label: 'Project cost', value: `BDT ${formatBdtCents(calc.projectBdtCents)}` }];
    if (b.currency !== 'BDT' && calc.projectConvertedMilli !== null) facts.push({ label: `Project cost in ${b.currency}`, value: `${b.currency} ${formatMilli(calc.projectConvertedMilli)}` });
    if (count > 0) {
      facts.push({ label: 'Packages', value: count.toLocaleString('en-US') });
      facts.push({ label: 'Cost of one package', value: `BDT ${formatBdtCents(calc.packageBdtCents)}` });
    }
    if (!donor && calc.adminBp !== null) facts.push({ label: 'Administration cost', value: `${(calc.adminBp / 100).toFixed(2)}% of project cost` });
    if (bars.length > 0) {
      slides.push({
        type: 'budget',
        title: 'Budget',
        bars,
        facts,
        note: calc.needsRate && !calc.canConvert ? 'No exchange rate is set yet, so only BDT amounts are shown.' : undefined,
      });
      if (calc.warnings.includes('missing_rate')) cautions.push('No exchange rate is set, so the budget slide shows BDT only.');
      if (calc.warnings.includes('packages_missing')) cautions.push('The number of packages is 0, so the budget chart may look empty.');
    } else skipped.push('Budget (the items add up to nothing)');
  } else {
    skipped.push('Budget (no budget items yet)');
  }

  // 8. Closing
  slides.push({
    type: 'closing',
    title: 'Thank you',
    lines: ['Small Kindness Bangladesh (SKB)', 'House 04, Road 33, Sector 7, Uttara, Dhaka-1230, Bangladesh', 'www.smallkindnessbd.org'],
  });

  return { slides, skipped, cautions };
}

export const deckFileName = (code: string, audience: DeckAudience, preparedOn: string): string =>
  `SKB-${code.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'Project'}-presentation-${audience === 'donor' ? 'donor' : 'internal'}-${preparedOn}.pptx`;
