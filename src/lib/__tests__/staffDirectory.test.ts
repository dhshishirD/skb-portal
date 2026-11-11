import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { directoryRowsToRecords } from '../staffDirectory';

describe('staff directory', () => {
  it('maps database rows and carries no e-mail or phone', () => {
    const [a, b] = directoryRowsToRecords([
      { id: '1', fullName: 'A Person', designation: 'Program Officer' },
      { id: '2', fullName: 'B Person', designation: null },
    ]);
    expect(a).toMatchObject({ id: '1', fullName: 'A Person', designation: 'Program Officer', email: '' });
    expect(a.phone).toBeUndefined();
    expect(b.requestedRole).toBe('Staff');
  });
});

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
});
