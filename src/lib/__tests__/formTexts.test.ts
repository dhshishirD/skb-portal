import { describe, expect, it } from 'vitest';
import { canReadFormTexts, canWriteFormTexts, EMPTY_FORM_TEXTS, formTextsSchema, friendlyFormTextError, MAX_FORM_TEXT } from '../formTexts';

describe('formTexts', () => {
  it('accepts empty and normal texts, refuses a text that is too long', () => {
    expect(formTextsSchema.safeParse(EMPTY_FORM_TEXTS).success).toBe(true);
    expect(formTextsSchema.safeParse({ ...EMPTY_FORM_TEXTS, experience: 'Ten years of work.' }).success).toBe(true);
    expect(formTextsSchema.safeParse({ ...EMPTY_FORM_TEXTS, rationale: 'x'.repeat(MAX_FORM_TEXT + 1) }).success).toBe(false);
  });
  it('lets the project writers write, and a few more roles read', () => {
    expect(canWriteFormTexts(['project_officer'])).toBe(true);
    expect(canWriteFormTexts(['me_officer'])).toBe(false);
    expect(canReadFormTexts(['me_officer'])).toBe(true);
    expect(canReadFormTexts(['donor'])).toBe(false);
    expect(canReadFormTexts(['finance'])).toBe(false);
  });
  it('turns database errors into plain sentences', () => {
    expect(friendlyFormTextError({ code: '42501', message: 'the form texts of a closed project cannot be changed' })).toContain('closed');
    expect(friendlyFormTextError({ code: '42501', message: 'permission denied' })).toContain('permission');
    expect(friendlyFormTextError({ code: '23514' })).toContain('too long');
  });
});
