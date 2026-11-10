'use server';

import { createClient } from '@/lib/supabase/server';
import { buildDashboard, type DashboardData, type RawTask } from '@/lib/dashboard';
import { getActor, listProjects } from '@/server/services/projectsData';

/*
 * Dashboard: the projects the signed-in user can see, with open tasks and next steps.
 * Runs as the user, so Row Level Security decides which projects and rows come back.
 */

type Failure = { ok: false; error: string };

export async function getDashboardAction(): Promise<{ ok: true; data: DashboardData } | Failure> {
  try {
    const actor = await getActor();
    if (!actor) return { ok: false, error: 'Please sign in again.' };
    if (actor.roles.includes('donor')) return { ok: false, error: 'This page is for staff.' };
    const projects = await listProjects();
    const ids = projects.map((p) => p.id);
    const supabase = await createClient();

    let openTasks: RawTask[] = [];
    let budgetItemProjectIds: string[] = [];
    let receiptProjectIds: string[] = [];
    let signedOffProjectIds: string[] = [];
    if (ids.length > 0) {
      const [t, b, r, c] = await Promise.all([
        (supabase.from('tasks') as any)
          .select('id, project_id, title, status, priority, due_date, assignee_id')
          .in('project_id', ids)
          .is('deleted_at', null)
          .neq('status', 'done')
          .limit(2000),
        (supabase.from('project_budget_items') as any).select('project_id').in('project_id', ids).limit(5000),
        (supabase.from('project_fund_receipts') as any).select('project_id').in('project_id', ids).limit(5000),
        (supabase.from('project_closing_reports') as any).select('project_id').in('project_id', ids).not('signed_off_at', 'is', null),
      ]);
      openTasks = (t.data ?? []) as RawTask[];
      budgetItemProjectIds = ((b.data ?? []) as Array<{ project_id: string }>).map((x) => x.project_id);
      receiptProjectIds = ((r.data ?? []) as Array<{ project_id: string }>).map((x) => x.project_id);
      signedOffProjectIds = ((c.data ?? []) as Array<{ project_id: string }>).map((x) => x.project_id);
    }

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    return {
      ok: true,
      data: buildDashboard({ userId: actor.userId, today, projects, openTasks, budgetItemProjectIds, receiptProjectIds, signedOffProjectIds }),
    };
  } catch {
    return { ok: false, error: 'Could not load your projects. Please refresh the page.' };
  }
}
