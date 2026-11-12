import type { AppRole } from './database.types';
import { indicatorProgress, formatNumber, type Indicator, type IndicatorMeasure } from './logframe';
import { countTasks, type TaskCounts } from './tasks';

/*
 * M&E Overview: a read-only roll-up of what projects already record (Logframe indicators, tasks,
 * head count). Only VALIDATED indicator values count towards progress. Nothing here is stored.
 */

const VIEWERS: AppRole[] = ['executive', 'programme_manager', 'me_officer', 'project_officer', 'board'];
export const canViewMeOverview = (roles: readonly AppRole[]) => roles.some((r) => VIEWERS.includes(r));

export interface OverviewIndicator {
  id: string;
  code: string;
  nodeTitle: string;
  name: string;
  unit: string;
  target: number;
  measure: IndicatorMeasure;
  achieved: string;
  /** Whole-ish percent (one decimal) from validated values; null while nothing is validated. */
  percent: number | null;
  validatedCount: number;
  pendingCount: number;
  state: 'reached' | 'on_the_way' | 'no_validated_value';
}

export interface OverviewProject {
  id: string;
  code: string;
  title: string;
  stage: string;
  indicators: OverviewIndicator[];
  tasks: TaskCounts;
  headcountTotal: number | null;
  /** Plain-words hints for what to do next. */
  hints: string[];
}

export interface OverviewTotals {
  projects: number;
  indicators: number;
  reached: number;
  onTheWay: number;
  noValidatedValue: number;
  pendingValues: number;
  overdueTasks: number;
}

export interface MeOverview {
  projects: OverviewProject[];
  totals: OverviewTotals;
}

export interface RawProject { id: string; code: string; title: string; stage: string }
export interface RawNode { id: string; projectId: string; code: string; title: string }
export interface RawIndicator { id: string; nodeId: string; name: string; unit: string; baseline: number; target: number; measure: IndicatorMeasure }
export interface RawValue { indicatorId: string; periodStart: string; periodEnd: string; value: number; validatedAt: string | null }
export interface RawTask { projectId: string; status: string; dueDate: string | null }
export interface RawHeadcount { projectId: string; women: number; men: number; girls: number; boys: number }

export function buildMeOverview(input: {
  projects: RawProject[];
  nodes: RawNode[];
  indicators: RawIndicator[];
  values: RawValue[];
  tasks: RawTask[];
  headcounts: RawHeadcount[];
  today: string;
}): MeOverview {
  const nodeById = new Map(input.nodes.map((n) => [n.id, n]));
  const projects: OverviewProject[] = input.projects.map((p) => {
    const indicators: OverviewIndicator[] = input.indicators
      .filter((i) => nodeById.get(i.nodeId)?.projectId === p.id)
      .map((i) => {
        const node = nodeById.get(i.nodeId)!;
        const values = input.values
          .filter((v) => v.indicatorId === i.id)
          .map((v) => ({ id: '', periodStart: v.periodStart, periodEnd: v.periodEnd, value: v.value, validatedAt: v.validatedAt, validatedByName: null, createdByName: null, createdBy: null }));
        const pr = indicatorProgress({ baseline: i.baseline, target: i.target, measure: i.measure, values } as Pick<Indicator, 'baseline' | 'target' | 'measure' | 'values'>);
        const percent = pr.percentBp === null ? null : Math.round(pr.percentBp / 10) / 10;
        const state: OverviewIndicator['state'] =
          percent === null ? 'no_validated_value' : percent >= 100 ? 'reached' : 'on_the_way';
        return {
          id: i.id,
          code: node.code,
          nodeTitle: node.title,
          name: i.name,
          unit: i.unit,
          target: i.target,
          measure: i.measure,
          achieved: formatNumber(pr.achievedHundredths),
          percent,
          validatedCount: pr.validatedCount,
          pendingCount: pr.pendingCount,
          state,
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }) || a.name.localeCompare(b.name));

    const tasks = countTasks(
      input.tasks.filter((t) => t.projectId === p.id).map((t) => ({ status: t.status as never, dueDate: t.dueDate })),
      input.today
    );
    const h = input.headcounts.find((x) => x.projectId === p.id);
    const headcountTotal = h ? h.women + h.men + h.girls + h.boys : null;

    const hints: string[] = [];
    if (indicators.length === 0) hints.push('No indicators yet. Add them in the project Logframe tab.');
    const pending = indicators.reduce((s, i) => s + i.pendingCount, 0);
    if (pending > 0) hints.push(`${pending} value${pending === 1 ? '' : 's'} waiting for validation.`);
    const empty = indicators.filter((i) => i.validatedCount === 0 && i.pendingCount === 0).length;
    if (empty > 0) hints.push(`${empty} indicator${empty === 1 ? ' has' : 's have'} no value entered.`);
    if (tasks.overdue > 0) hints.push(`${tasks.overdue} task${tasks.overdue === 1 ? ' is' : 's are'} overdue.`);

    return { id: p.id, code: p.code, title: p.title, stage: p.stage, indicators, tasks, headcountTotal, hints };
  });

  const all = projects.flatMap((p) => p.indicators);
  return {
    projects,
    totals: {
      projects: projects.length,
      indicators: all.length,
      reached: all.filter((i) => i.state === 'reached').length,
      onTheWay: all.filter((i) => i.state === 'on_the_way').length,
      noValidatedValue: all.filter((i) => i.state === 'no_validated_value').length,
      pendingValues: all.reduce((s, i) => s + i.pendingCount, 0),
      overdueTasks: projects.reduce((s, p) => s + p.tasks.overdue, 0),
    },
  };
}
