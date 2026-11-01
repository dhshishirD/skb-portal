/**
 * Mirrors the Supabase Auth password policy configured for the portal
 * (minimum 10 characters, lower-case, upper-case and digits). Supabase enforces it
 * server-side as well; checking here gives the user a clear message before the request.
 */
export const PASSWORD_MIN_LENGTH = 10;

export const PASSWORD_RULES_TEXT = `At least ${PASSWORD_MIN_LENGTH} characters, with upper-case, lower-case and a number.`;

export function validatePassword(password: string): string | null {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include upper-case and lower-case letters and a number.';
  }
  return null;
}
