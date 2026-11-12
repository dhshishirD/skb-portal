/*
 * Plain-words version of a database error from the Finance and Procurement rules (migration 0028).
 * The messages written in those functions are already plain English, so the known ones are passed
 * through; anything else (row-level security, constraint names, internals) is replaced.
 */

const PASS_THROUGH: RegExp[] = [
  /separation of duties/i,
  /a comment is required/i,
  /from BDT [\d,]+ quotations/i,
  /not the lowest/i,
  /blacklist/i,
  /only the Executive Director/i,
  /the project is closed|closed project/i,
  /cannot be in the future/i,
  /this (claim|request) is already/i,
  /this (step|approval) needs/i,
  /^only (procurement|the requester|the claimant|a claim|a request|an approved|a submitted)/i,
  /choose one of this request/i,
  /attach at least one quotation/i,
  /no quotation is selected/i,
  /quotations can/i,
  /a filed claim cannot be edited/i,
  /(claim|request) not found/i,
  /no access to this project/i,
  /the budget line belongs to another project/i,
];

export function friendlyDbError(
  error: { code?: string | null; message?: string | null },
  fallback = 'The database could not save this. Please try again.',
): string {
  const message = (error.message ?? '').trim();
  const code = error.code ?? '';
  if (message && PASS_THROUGH.some((re) => re.test(message))) {
    return message.charAt(0).toUpperCase() + message.slice(1) + (/[.!?]$/.test(message) ? '' : '.');
  }
  if (code === '23505') return 'This already exists, for example the same vendor name, or a vendor quoted twice.';
  if (code === '23514' || /violates check constraint/i.test(message)) return 'Some values are not allowed. Please check them and try again.';
  if (/row-level security|violates row-level|permission denied/i.test(message) || code === '42501') {
    return 'You do not have permission to do this.';
  }
  return fallback;
}
