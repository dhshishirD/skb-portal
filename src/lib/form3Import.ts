/**
 * Form 3 (project proposal form) import: the pure part.
 *
 * A donor's Form 3 is a Word file made of small tables. These helpers read the tables that were already
 * turned into plain text (see docxTables.ts) and find the facts by their LABELS, not by their position, so the
 * IHH, Mavi Marmara and UMUT OL versions all work. Nothing here saves anything: the screen shows what was
 * found, flags numbers that do not agree with each other, and only then the person confirms.
 */

/** tables -> rows -> cells (plain text). */
export type TextTables = string[][][];

export interface ParsedArea {
  region: string;
  cities: string | null;
  villages: string | null;
  itemQuantity: number | null;
  families: number | null;
}

export interface ParsedBudgetLine {
  name: string;
  quantity: number;
  /** Price of one unit in local money (BDT). */
  unitPriceLocal: number;
  /** The same price in the donor currency, only for showing. */
  unitPriceDonor: number | null;
  totalLocal: number | null;
}

export type CharterKey = 'background' | 'objectives' | 'scopeIn' | 'risks' | 'team';

export interface Form3Parsed {
  title: string | null;
  totalCost: string | null;
  requested: string | null;
  duration: string | null;
  manager: string | null;
  areas: ParsedArea[];
  areasFamiliesTotal: number | null;
  charter: Partial<Record<CharterKey, string>>;
  /** "Total number of beneficiaries" as typed in the form, as a number if one can be read. */
  beneficiaries: number | null;
  budget: {
    lines: ParsedBudgetLine[];
    /** False when the cost table has no local-money price column, so BDT prices cannot be read. */
    hasLocalPrices: boolean;
    purchasedTotalLocal: number | null;
  };
  warnings: string[];
}

const clean = (s: string) => s.replace(/[​ ]/g, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
const lower = (s: string) => clean(s).toLowerCase();

/** "623,00" -> 623, "8410500" -> 8410500, "1,755" -> 1755, "4950 Families" -> 4950, "€69000" -> 69000. */
export function parseAmount(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const t = raw.replace(/[^\d.,]/g, '');
  if (!/\d/.test(t)) return null;
  const comma = t.lastIndexOf(',');
  const dot = t.lastIndexOf('.');
  let s = t;
  if (comma > -1 && dot > -1) {
    s = comma > dot ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  } else if (comma > -1) {
    const commas = (t.match(/,/g) ?? []).length;
    s = commas === 1 && t.length - comma - 1 <= 2 ? t.replace(',', '.') : t.replace(/,/g, '');
  } else if ((t.match(/\./g) ?? []).length > 1) {
    s = t.replace(/\./g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

type Pair = { label: string; value: string };

/** Every "Label: value" in the file: from a two-cell row, or from one cell that holds both. */
function labelPairs(tables: TextTables): Pair[] {
  const out: Pair[] = [];
  for (const rows of tables) {
    for (const row of rows) {
      const cells = row.map(clean);
      if (cells.length >= 2 && cells[0] && /:$/.test(cells[0]) && cells[1]) {
        out.push({ label: lower(cells[0].replace(/:$/, '')), value: cells[1] });
        continue;
      }
      if (cells.length >= 2 && cells[0] && cells[1] && cells[0].length < 90 && !cells[0].includes(':') && cells.length === 2 && !/^\d+$/.test(cells[0])) {
        out.push({ label: lower(cells[0]), value: cells[1] });
      }
      for (const c of cells) {
        const m = /^([^:\n]{2,90}):\s*(.+)$/s.exec(c);
        if (m) out.push({ label: lower(m[1]), value: clean(m[2]) });
      }
    }
  }
  // A "value" that is really the next label ("Telephone:") or only a hint ("(If any)") means the box was left empty.
  return out.filter((p) => !/:$/.test(p.value) && !/^\(.*\)$/s.test(p.value));
}

const find = (pairs: Pair[], re: RegExp): string | null => {
  const hit = pairs.find((p) => re.test(p.label) && p.value !== '');
  return hit ? hit.value : null;
};

function headerIndex(header: string[], re: RegExp): number {
  return header.findIndex((h) => re.test(lower(h)));
}

function parseAreas(tables: TextTables): { areas: ParsedArea[]; total: number | null } {
  for (const rows of tables) {
    const hi = rows.findIndex((r) => {
      const t = r.map(lower).join(' | ');
      return /\bregion\b/.test(t) && /\bcity\b/.test(t) && /(village|neighbou?rhood)/.test(t);
    });
    if (hi < 0) continue;
    const h = rows[hi];
    const iRegion = headerIndex(h, /region/);
    const iCity = headerIndex(h, /^city/);
    const iDistrict = headerIndex(h, /district|county/);
    const iVillage = headerIndex(h, /village|neighbou?rhood/);
    const iFamilies = headerIndex(h, /beneficiar|famil/);
    const iQty = h.findIndex((c, i) => /quantity|qty/.test(lower(c)) && i !== iFamilies);
    const areas: ParsedArea[] = [];
    let total: number | null = null;
    for (const r of rows.slice(hi + 1)) {
      const first = lower(r[0] ?? '');
      if (first.startsWith('total')) {
        total = parseAmount(r.slice(1).join(' '));
        break;
      }
      const region = clean(r[iRegion] ?? '');
      if (!region) continue;
      const city = clean(r[iCity] ?? '');
      const district = iDistrict >= 0 ? clean(r[iDistrict] ?? '') : '';
      areas.push({
        region,
        cities: [city, district].filter(Boolean).join(', ') || null,
        villages: clean(r[iVillage] ?? '') || null,
        itemQuantity: iQty >= 0 ? parseAmount(r[iQty]) : null,
        families: iFamilies >= 0 ? parseAmount(r[iFamilies]) : null,
      });
    }
    return { areas, total };
  }
  return { areas: [], total: null };
}

function parseBudget(tables: TextTables): Form3Parsed['budget'] {
  const empty = { lines: [], hasLocalPrices: false, purchasedTotalLocal: null };
  for (const rows of tables) {
    if (!/^project cost/.test(lower(rows[0]?.[0] ?? ''))) continue;
    const hi = rows.findIndex((r) => /items? to be purchased/.test(lower(r[0] ?? '')));
    if (hi < 0) return empty;
    const h = rows[hi];
    const iQty = headerIndex(h, /quantity|qty/);
    const iUnitLocal = h.findIndex((c) => /unit/.test(lower(c)) && /local|bdt|taka/.test(lower(c)));
    const iUnitDonor = h.findIndex((c, i) => /unit|price/.test(lower(c)) && i !== iUnitLocal && i !== iQty && !/total/.test(lower(c)));
    const iTotalLocal = h.findIndex((c) => /total/.test(lower(c)) && /local|bdt|taka/.test(lower(c)));
    const hasLocalPrices = iUnitLocal >= 0;
    const lines: ParsedBudgetLine[] = [];
    let purchasedTotalLocal: number | null = null;
    for (const r of rows.slice(hi + 1)) {
      const name = clean(r[0] ?? '');
      if (/^total purchased/i.test(name)) {
        const nums = r.slice(1).map(parseAmount).filter((n): n is number => n !== null);
        purchasedTotalLocal = nums.length ? nums[nums.length - 1] : null;
        continue;
      }
      if (/^total/i.test(name) || /^admin/i.test(name) || /^fund requested/i.test(name)) break;
      if (!name || !hasLocalPrices) continue;
      const quantity = parseAmount(r[iQty]);
      const unit = parseAmount(r[iUnitLocal]);
      if (quantity === null || unit === null || quantity <= 0) continue;
      lines.push({
        name,
        quantity,
        unitPriceLocal: unit,
        unitPriceDonor: iUnitDonor >= 0 ? parseAmount(r[iUnitDonor]) : null,
        totalLocal: iTotalLocal >= 0 ? parseAmount(r[iTotalLocal]) : null,
      });
    }
    return { lines, hasLocalPrices, purchasedTotalLocal };
  }
  return empty;
}

const join = (parts: Array<string | null>) => parts.filter((p): p is string => !!p && p.trim() !== '').join('\n\n');

export function parseForm3(tables: TextTables): Form3Parsed {
  const pairs = labelPairs(tables);
  const { areas, total } = parseAreas(tables);
  const budget = parseBudget(tables);

  const beneficiariesText = find(pairs, /total number of beneficiaries|beneficiary of project|number of beneficiaries$/);
  const beneficiaries = parseAmount(beneficiariesText);
  const targetGroup = find(pairs, /target (group|audience)/);
  const manager = find(pairs, /project (manager|officer)/);

  const charter: Form3Parsed['charter'] = {};
  const background = join([find(pairs, /brief description|short description/), find(pairs, /project rationale|project cause/)]);
  if (background) charter.background = background;
  const objectives = find(pairs, /project objectives|project goals/);
  if (objectives) charter.objectives = objectives;
  const scopeIn = join([
    targetGroup ? `Target group: ${targetGroup}` : null,
    beneficiariesText ? `Total number of beneficiaries: ${beneficiariesText}` : null,
    areas.length ? `Areas: ${areas.map((a) => [a.villages, a.cities, a.region].filter(Boolean).join(', ')).join('; ')}` : null,
  ]);
  if (scopeIn) charter.scopeIn = scopeIn;
  const risks = join([
    find(pairs, /negatively affected|negatively impacted/) ? `Groups that may be negatively affected:\n${find(pairs, /negatively affected|negatively impacted/)}` : null,
    find(pairs, /problems that may arise/) ? `Problems that may arise and how to handle them:\n${find(pairs, /problems that may arise/)}` : null,
  ]);
  if (risks) charter.risks = risks;
  if (manager) charter.team = `Project manager: ${manager}`;

  const parsed: Form3Parsed = {
    title: find(pairs, /^(project name|project title)$/),
    totalCost: find(pairs, /total cost|project total cost/),
    requested: find(pairs, /amount requested|requested from/),
    duration: find(pairs, /project duration|completion period/),
    manager,
    areas,
    areasFamiliesTotal: total,
    charter,
    beneficiaries,
    budget,
    warnings: [],
  };
  parsed.warnings = form3Warnings(parsed);
  return parsed;
}

/** Numbers in the form that do not agree with each other. Shown in red; nothing is changed automatically. */
export function form3Warnings(p: Form3Parsed): string[] {
  const out: string[] = [];
  const families = p.areas.reduce((s, a) => s + (a.families ?? 0), 0);
  if (p.beneficiaries !== null && families > 0 && families !== p.beneficiaries) {
    out.push(
      `The areas add up to ${families.toLocaleString('en-US')} families, but the form says ${p.beneficiaries.toLocaleString('en-US')} beneficiaries. Ask the donor desk which one is right.`,
    );
  }
  if (p.areasFamiliesTotal !== null && families > 0 && families !== p.areasFamiliesTotal) {
    out.push(`The "Total" row of the areas table says ${p.areasFamiliesTotal.toLocaleString('en-US')}, but the rows add up to ${families.toLocaleString('en-US')}.`);
  }
  const quantity = p.areas.reduce((s, a) => s + (a.itemQuantity ?? 0), 0);
  const main = p.budget.lines[0];
  if (main && quantity > 0 && quantity !== main.quantity) {
    out.push(
      `The areas table adds up to ${quantity.toLocaleString('en-US')} items, but the cost table buys ${main.quantity.toLocaleString('en-US')} "${main.name}".`,
    );
  }
  const sum = p.budget.lines.reduce((s, l) => s + (l.totalLocal ?? l.quantity * l.unitPriceLocal), 0);
  if (p.budget.purchasedTotalLocal !== null && p.budget.lines.length && Math.abs(sum - p.budget.purchasedTotalLocal) > 1) {
    out.push(
      `The cost lines add up to ${Math.round(sum).toLocaleString('en-US')}, but "Total Purchased Cost" says ${Math.round(p.budget.purchasedTotalLocal).toLocaleString('en-US')}.`,
    );
  }
  if (!p.budget.hasLocalPrices && p.budget.lines.length === 0) {
    out.push('The cost table has no price in local money (BDT), so the budget lines cannot be imported. Enter them in the Budget tab.');
  }
  return out;
}
