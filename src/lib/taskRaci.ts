import { z } from 'zod';

/**
 * RACI for tasks (migration 0034). Responsible is the person the task is assigned to (unchanged);
 * Accountable, Consulted and Informed live in the task_raci table. One Accountable per task; a person
 * holds at most one of those three letters on a task.
 */

export type RaciRole = 'accountable' | 'consulted' | 'informed';
export const RACI_LETTER: Record<RaciRole, 'A' | 'C' | 'I'> = { accountable: 'A', consulted: 'C', informed: 'I' };
export const RACI_LABEL: Record<RaciRole | 'responsible', string> = {
  responsible: 'Responsible (does the work)',
  accountable: 'Accountable (answers for it, approves)',
  consulted: 'Consulted (asked before)',
  informed: 'Informed (told after)',
};
export const isRaciRole = (v: unknown): v is RaciRole => v === 'accountable' || v === 'consulted' || v === 'informed';

export interface TaskRaci {
  accountableId: string | null;
  consultedIds: string[];
  informedIds: string[];
}
export const EMPTY_RACI: TaskRaci = { accountableId: null, consultedIds: [], informedIds: [] };

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid choice');

export const raciSchema = z
  .object({
    accountableId: z
      .string()
      .trim()
      .transform((v) => (v === '' ? null : v))
      .nullable()
      .refine((v) => v === null || uuid.safeParse(v).success, 'Invalid choice'),
    consultedIds: z.array(uuid).max(50),
    informedIds: z.array(uuid).max(50),
  })
  .superRefine((v, ctx) => {
    const seen = new Set<string>();
    const all = [...(v.accountableId ? [v.accountableId] : []), ...v.consultedIds, ...v.informedIds];
    for (const id of all) {
      if (seen.has(id)) {
        ctx.addIssue({ code: 'custom', message: 'A person can hold only one of Accountable, Consulted or Informed on a task.' });
        return;
      }
      seen.add(id);
    }
  });
export type RaciFormValues = z.input<typeof raciSchema>;

export const rolesOf = (r: TaskRaci): Map<string, RaciRole> => {
  const m = new Map<string, RaciRole>();
  if (r.accountableId) m.set(r.accountableId, 'accountable');
  r.consultedIds.forEach((id) => m.set(id, 'consulted'));
  r.informedIds.forEach((id) => m.set(id, 'informed'));
  return m;
};

export interface RaciOp {
  type: 'delete' | 'update' | 'insert';
  userId: string;
  role?: RaciRole;
}

/**
 * Steps to turn the current letters into the wanted ones. Order matters because only one person may be
 * Accountable: removals first, then everything that is not Accountable, and the Accountable change last.
 */
export function planRaciChanges(current: TaskRaci, wanted: TaskRaci): RaciOp[] {
  const now = rolesOf(current);
  const want = rolesOf(wanted);
  const ops: RaciOp[] = [];
  for (const id of now.keys()) if (!want.has(id)) ops.push({ type: 'delete', userId: id });
  const changes: RaciOp[] = [];
  for (const [id, role] of want) {
    const had = now.get(id);
    if (had === role) continue;
    changes.push({ type: had ? 'update' : 'insert', userId: id, role });
  }
  changes.sort((a, b) => Number(a.role === 'accountable') - Number(b.role === 'accountable'));
  return [...ops, ...changes];
}

export interface RaciCell {
  /** Letters in R, A, C, I order, for example "R, A". */
  text: string;
}

export interface RaciMatrix {
  people: Array<{ id: string; name: string }>;
  rows: Array<{ taskId: string; title: string; cells: Record<string, string> }>;
}

/** People as columns, tasks as rows, letters in the cells. Only people who hold a letter somewhere appear. */
export function raciMatrix(
  tasks: Array<{ id: string; title: string; assigneeId: string | null; raci: TaskRaci }>,
  names: ReadonlyMap<string, string>,
): RaciMatrix {
  const used = new Set<string>();
  const rows = tasks.map((t) => {
    const cells: Record<string, string> = {};
    const add = (id: string | null | undefined, letter: string) => {
      if (!id) return;
      used.add(id);
      cells[id] = cells[id] ? `${cells[id]}, ${letter}` : letter;
    };
    add(t.assigneeId, 'R');
    add(t.raci.accountableId, 'A');
    t.raci.consultedIds.forEach((id) => add(id, 'C'));
    t.raci.informedIds.forEach((id) => add(id, 'I'));
    return { taskId: t.id, title: t.title, cells };
  });
  const people = [...used].map((id) => ({ id, name: names.get(id) ?? 'Unknown' })).sort((a, b) => a.name.localeCompare(b.name));
  return { people, rows };
}

/** Tasks with no Responsible person or no Accountable person. */
export function raciGaps(tasks: Array<{ status: string; assigneeId: string | null; raci: TaskRaci }>) {
  const open = tasks.filter((t) => t.status !== 'done');
  return {
    noResponsible: open.filter((t) => !t.assigneeId).length,
    noAccountable: open.filter((t) => !t.raci.accountableId).length,
  };
}

export function friendlyRaciError(error: { code?: string | null; message?: string | null }): string {
  const m = error.message ?? '';
  if (/closed project/i.test(m)) return 'The tasks of a closed project cannot be changed.';
  if (/project team/i.test(m)) return 'Only someone on the project team can be given a role on a task.';
  if (error.code === '23505') return 'There can be only one Accountable person on a task, and a person holds one role per task.';
  if (/row-level security|violates row-level|permission denied/i.test(m) || error.code === '42501') return 'You do not have permission to change roles on tasks.';
  return 'Could not save the roles. Please try again.';
}
