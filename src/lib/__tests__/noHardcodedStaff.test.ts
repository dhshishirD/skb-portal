import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/** Who may sign in is decided by the database roles only, never by a list written in the code. */
describe('no hard-coded staff in the source', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(p) && !p.includes('__tests__') ? [p] : [];
    });
  it('has no approved-user list, personal e-mails or made-up staff phone numbers', () => {
    const bad = [/DEFAULT_APPROVED_USERS/, /@gmail\.com/i, /\+880 1711-/, /employeeId:\s*'SKB-/];
    const hits = walk(join(process.cwd(), 'src')).flatMap((f) => {
      const text = readFileSync(f, 'utf8');
      return bad.filter((re) => re.test(text)).map((re) => `${f}: ${re}`);
    });
    expect(hits).toEqual([]);
  });
  it('keeps staff names and community content out of the browser storage', () => {
    const hits = walk(join(process.cwd(), 'src')).filter((f) => /skb_hq_|skb_current_community_author|skb_current_user_/.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
});
