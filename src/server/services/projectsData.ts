import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { AppRole } from '@/lib/database.types';
import { PROJECT_COLUMNS, type ProjectRow } from '@/lib/projects';

/**
 * Reads for the Projects module. Every query runs as the signed-in user, so Row Level
 * Security decides what comes back: nobody sees a project they are not allowed to see.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID.test(v);

export interface Actor {
  userId: string;
  roles: AppRole[];
}

/** The signed-in, active user and their roles; null when signed out or deactivated. */
export async function getActor(): Promise<Actor | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: rolesData }, { data: profile }] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', user.id),
    supabase.from('profiles').select('is_active').eq('id', user.id).maybeSingle(),
  ]);
  if (!(profile as { is_active?: boolean } | null)?.is_active) return null;
  const roles = ((rolesData ?? []) as Array<{ role: AppRole }>).map((r) => r.role);
  return { userId: user.id, roles };
}

export async function listProjects(): Promise<ProjectRow[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase.from('projects') as any)
    .select(PROJECT_COLUMNS)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ProjectRow[];
}

/** One project, or null if it does not exist or the user may not see it. */
export async function getProjectById(id: string): Promise<ProjectRow | null> {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await (supabase.from('projects') as any)
    .select(PROJECT_COLUMNS)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ProjectRow | null) ?? null;
}

export interface OrganizationDetails {
  id: string;
  name: string;
  registration_no: string | null;
  registration_authority: string | null;
}

/** SKB's own organisation record (the first active internal one), or null. */
export async function getOwnOrganization(): Promise<OrganizationDetails | null> {
  const supabase = await createClient();
  const { data, error } = await (supabase.from('organizations') as any)
    .select('id, name, registration_no, registration_authority')
    .eq('type', 'internal')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) throw new Error(error.message);
  return ((data ?? [])[0] as OrganizationDetails | undefined) ?? null;
}
