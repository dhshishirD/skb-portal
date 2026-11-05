import { describe, expect, it } from 'vitest';
import {
  canTickGateItems,
  checkBackReason,
  friendlyGateError,
  gateProgress,
  isProjectStage,
  itemsForStage,
  nextStage,
  previousStage,
  type GateItem,
} from '../stageGates';

const item = (over: Partial<GateItem>): GateItem => ({
  id: 'i',
  stage: 'concept',
  label: 'Item',
  position: 1,
  required: true,
  done: false,
  doneAt: null,
  doneByName: null,
  ...over,
});

describe('stage order', () => {
  it('moves forward one stage at a time and stops at closed', () => {
    expect(nextStage('concept')).toBe('proposal');
    expect(nextStage('monitoring_evaluation')).toBe('closed');
    expect(nextStage('closed')).toBeNull();
  });

  it('moves back one stage at a time and stops at concept', () => {
    expect(previousStage('closed')).toBe('monitoring_evaluation');
    expect(previousStage('proposal')).toBe('concept');
    expect(previousStage('concept')).toBeNull();
  });

  it('recognises only real stages', () => {
    expect(isProjectStage('approved')).toBe(true);
    expect(isProjectStage('Approved')).toBe(false);
    expect(isProjectStage('done')).toBe(false);
    expect(isProjectStage(undefined)).toBe(false);
  });
});

describe('gateProgress', () => {
  it('counts required and optional items separately', () => {
    const p = gateProgress([
      item({ required: true, done: true }),
      item({ required: true, done: false }),
      item({ required: false, done: true }),
    ]);
    expect(p).toMatchObject({ requiredTotal: 2, requiredDone: 1, optionalTotal: 1, optionalDone: 1, complete: false });
  });

  it('is complete when every required item is done, even if optional ones are not', () => {
    const p = gateProgress([item({ required: true, done: true }), item({ required: false, done: false })]);
    expect(p.complete).toBe(true);
  });

  it('treats a stage with no required items as complete', () => {
    expect(gateProgress([]).complete).toBe(true);
    expect(gateProgress([item({ required: false })]).complete).toBe(true);
  });
});

describe('itemsForStage', () => {
  it('keeps only that stage, in checklist order', () => {
    const list = [
      item({ id: 'b', stage: 'proposal', position: 2 }),
      item({ id: 'a', stage: 'proposal', position: 1 }),
      item({ id: 'x', stage: 'concept', position: 1 }),
    ];
    expect(itemsForStage(list, 'proposal').map((i) => i.id)).toEqual(['a', 'b']);
  });
});

describe('who can tick items', () => {
  it('allows the Executive Director, Programme Manager and Program Officer only', () => {
    expect(canTickGateItems(['executive'])).toBe(true);
    expect(canTickGateItems(['programme_manager'])).toBe(true);
    expect(canTickGateItems(['project_officer'])).toBe(true);
    expect(canTickGateItems(['board'])).toBe(false);
    expect(canTickGateItems(['legal_officer', 'it_officer'])).toBe(false);
    expect(canTickGateItems([])).toBe(false);
  });
});

describe('checkBackReason', () => {
  it('needs at least 5 characters after trimming', () => {
    expect(checkBackReason('')).toMatch(/at least 5/);
    expect(checkBackReason('  ab  ')).toMatch(/at least 5/);
    expect(checkBackReason('Donor asked for changes')).toBeNull();
  });

  it('refuses a very long note', () => {
    expect(checkBackReason('x'.repeat(1001))).toMatch(/1000/);
  });
});

describe('friendlyGateError', () => {
  it('explains missing required items with the count', () => {
    expect(friendlyGateError({ code: '23514', message: '3 required checklist item(s) of this stage are not complete' })).toMatch(
      /3 required checklist items are not complete/
    );
    expect(friendlyGateError({ code: '23514', message: '1 required checklist item(s) of this stage are not complete' })).toMatch(
      /1 required checklist item is not complete/
    );
  });

  it('explains the back-reason rule', () => {
    expect(
      friendlyGateError({ code: '23514', message: 'a reason (at least 5 characters) is required to move a project back' })
    ).toMatch(/reason/i);
  });

  it('explains permission problems', () => {
    expect(friendlyGateError({ code: '42501', message: 'only the Executive Director can change a project stage' })).toMatch(
      /Only the Executive Director/
    );
    expect(friendlyGateError({ code: '42501', message: 'new row violates row-level security policy' })).toMatch(/permission/i);
    expect(friendlyGateError({ code: '42501', message: 'only the checklist of the current stage can be changed' })).toMatch(
      /current stage/
    );
  });

  it('explains an illegal move and a missing project', () => {
    expect(friendlyGateError({ code: '22023', message: 'a project can only move one stage forward or one stage back' })).toMatch(
      /one stage forward or one stage back/
    );
    expect(friendlyGateError({ code: '22023', message: 'a closed project cannot change stage' })).toMatch(/closed/);
    expect(friendlyGateError({ code: 'P0002', message: 'project not found' })).toBe('Project not found.');
  });

  it('never leaks raw database text for an unknown error', () => {
    const text = friendlyGateError({ code: 'XX000', message: 'relation "secret_table" exploded' });
    expect(text).not.toMatch(/secret_table/);
    expect(text).toMatch(/try again/i);
  });
});
