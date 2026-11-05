import type { AppRole, ProjectStage } from './database.types';
import { PROJECT_STAGES } from './projects';

/**
 * Stage gates: the pure rules the screen and the server actions share.
 *
 * The database (migration 0015) is what really enforces them: only the Executive Director
 * moves a stage, forward needs every required item done, back needs a reason, and only the
 * current stage's checklist can be ticked. The helpers here only drive what the screen shows
 * and turn database errors into plain words.
 */

export interface GateItem {
  id: string;
  stage: ProjectStage;
  label: string;
  position: number;
  required: boolean;
  done: boolean;
  doneAt: string | null;
  doneByName: string | null;
}

export interface StageHistoryEntry {
  id: string;
  fromStage: ProjectStage | null;
  toStage: ProjectStage;
  changedByName: string | null;
  note: string | null;
  createdAt: string;
}

export interface StageGateData {
  projectId: string;
  stage: ProjectStage;
  items: GateItem[];
  history: StageHistoryEntry[];
  /** Executive Director: may move the stage. */
  canChangeStage: boolean;
  /** Executive Director, Programme Manager, Program Officer: may tick items. */
  canTick: boolean;
}

export const MIN_BACK_REASON_LENGTH = 5;
export const MAX_NOTE_LENGTH = 1000;

const TICKERS: AppRole[] = ['executive', 'programme_manager', 'project_officer'];
export const canTickGateItems = (roles: AppRole[]) => roles.some((r) => TICKERS.includes(r));

export function isProjectStage(value: unknown): value is ProjectStage {
  return typeof value === 'string' && (PROJECT_STAGES as string[]).includes(value);
}

/** The stage after this one, or null at the end. */
export function nextStage(stage: ProjectStage): ProjectStage | null {
  const i = PROJECT_STAGES.indexOf(stage);
  return i >= 0 && i < PROJECT_STAGES.length - 1 ? PROJECT_STAGES[i + 1] : null;
}

/** The stage before this one, or null at the start. */
export function previousStage(stage: ProjectStage): ProjectStage | null {
  const i = PROJECT_STAGES.indexOf(stage);
  return i > 0 ? PROJECT_STAGES[i - 1] : null;
}

export interface GateProgress {
  requiredTotal: number;
  requiredDone: number;
  optionalTotal: number;
  optionalDone: number;
  /** Every required item is done. A stage with no required items is complete. */
  complete: boolean;
}

export function gateProgress(items: Pick<GateItem, 'required' | 'done'>[]): GateProgress {
  const required = items.filter((i) => i.required);
  const optional = items.filter((i) => !i.required);
  const requiredDone = required.filter((i) => i.done).length;
  return {
    requiredTotal: required.length,
    requiredDone,
    optionalTotal: optional.length,
    optionalDone: optional.filter((i) => i.done).length,
    complete: requiredDone === required.length,
  };
}

/** Items of one stage, in checklist order. */
export function itemsForStage(items: GateItem[], stage: ProjectStage): GateItem[] {
  return items.filter((i) => i.stage === stage).sort((a, b) => a.position - b.position);
}

/** Checks the reason typed for moving back. Returns an error text, or null when fine. */
export function checkBackReason(note: string): string | null {
  const text = note.trim();
  if (text.length < MIN_BACK_REASON_LENGTH) return `Write a reason of at least ${MIN_BACK_REASON_LENGTH} characters to move a project back.`;
  if (text.length > MAX_NOTE_LENGTH) return `The note must be ${MAX_NOTE_LENGTH} characters or fewer.`;
  return null;
}

/**
 * Plain-words version of a database error. Codes come from migration 0015:
 *   42501 not allowed, 23514 checklist or reason missing, 22023 move not allowed, P0002 not found.
 */
export function friendlyGateError(error: { code?: string | null; message?: string | null }): string {
  const message = error.message ?? '';
  const code = error.code ?? '';

  if (/required checklist item/i.test(message)) {
    const n = message.match(/(\d+)\s+required checklist item/i)?.[1];
    return n
      ? `${n} required checklist item${n === '1' ? ' is' : 's are'} not complete yet. Finish them before moving the project forward.`
      : 'Some required checklist items are not complete yet.';
  }
  if (/reason .* required to move/i.test(message)) {
    return `Write a reason of at least ${MIN_BACK_REASON_LENGTH} characters to move a project back.`;
  }
  if (/only the Executive Director/i.test(message)) return 'Only the Executive Director can change a project stage.';
  if (/only the checklist of the current stage/i.test(message)) return 'Only the checklist of the current stage can be changed.';
  if (/closed project cannot change/i.test(message)) return 'A closed project cannot change stage.';
  if (/one stage forward or one stage back/i.test(message) || code === '22023') {
    return 'A project can only move one stage forward or one stage back.';
  }
  if (code === 'P0002' || /project not found/i.test(message)) return 'Project not found.';
  if (code === '42501' || /row-level security|violates row-level|permission denied/i.test(message)) {
    return 'You do not have permission to do this.';
  }
  if (code === '23514') return 'The checklist is not complete, so the stage cannot change.';
  return 'The database could not save this. Please try again.';
}
