'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AppRole } from '@/lib/database.types';
import { canPreviewDonorPortal, canViewDonorPortal, toCard, type DonorDocument, type DonorHome, type DonorProjectCard, type DonorProjectView } from '@/lib/donorPortal';
import { isUuid } from '@/server/services/projectsData';

/*
 * The donor's own pages. The organisation is decided on the server: a donor always gets the organisation on
 * their own profile, whatever is sent from the browser. The Executive Director and the Board may preview one
 * donor by passing that donor's organisation id. Reads use the trusted client only after that check and only for
 * that organisation's projects, and only the short summary fields below.
 */

type Failure = { ok: false; error: string };
const fail = (error: string): Failure => ({ ok: false, error });

const PROJECT_FIELDS = 'id, code, title, description, stage, location, start_date, end_date, budget_amount, budget_currency, grant_id';

async function resolveOrg(previewOrgId?: string | null): Promise<{ orgId: string; orgName: string; preview: boolean } | Failure> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Please sign in again.');
  const [{ data: rolesData }, { data: profile }] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', user.id),
    supabase.from('profiles').select('is_active, org_id').eq('id', user.id).maybeSingle(),
  ]);
  const roles = ((rolesData ?? []) as Array<{ role: AppRole }>).map((r) => r.role);
  const p = profile as { is_active?: boolean; org_id?: string | null } | null;
  if (!p?.is_active || !canViewDonorPortal(roles)) return fail('You do not have permission to open the donor area.');

  const admin = createAdminClient();
  let orgId: string | null = null;
  let preview = false;
  if (roles.includes('donor')) {
    orgId = p.org_id ?? null;
  } else if (canPreviewDonorPortal(roles)) {
    if (!previewOrgId || !isUuid(previewOrgId)) return fail('Choose a donor to preview from the Donors page.');
    orgId = previewOrgId;
    preview = true;
  }
  if (!orgId) return fail('Your account is not linked to a donor organisation yet. Please contact Small Kindness Bangladesh.');
  const { data: org } = await (admin.from('organizations') as any).select('id, name, type, is_active').eq('id', orgId).maybeSingle();
  if (!org || org.type !== 'donor' || !org.is_active) return fail('This donor organisation is not available.');
  return { orgId, orgName: org.name as string, preview };
}
const isFailure = (x: unknown): x is Failure => typeof x === 'object' && x !== null && 'ok' in x && (x as Failure).ok === false;

async function projectsOf(orgId: string, onlyId?: string) {
  const admin = createAdminClient();
  const { data: grants } = await (admin.from('grants') as any).select('id').eq('donor_org_id', orgId).is('deleted_at', null);
  const grantIds = ((grants ?? []) as Array<{ id: string }>).map((g) => g.id);
  if (grantIds.length === 0) return [];
  let q = (admin.from('projects') as any).select(PROJECT_FIELDS).in('grant_id', grantIds).is('deleted_at', null).order('created_at', { ascending: false });
  if (onlyId) q = q.eq('id', onlyId);
  const { data } = await q;
  return (data ?? []) as Array<Record<string, any>>;
}

async function cardsFor(rows: Array<Record<string, any>>): Promise<DonorProjectCard[]> {
  if (rows.length === 0) return [];
  const admin = createAdminClient();
  const ids = rows.map((r) => r.id as string);
  const [areas, docs] = await Promise.all([
    (admin.from('project_areas') as any).select('project_id, families').in('project_id', ids),
    (admin.from('documents') as any).select('project_id').in('project_id', ids).eq('released_to_donor', true).is('deleted_at', null),
  ]);
  const families = new Map<string, number>();
  for (const a of (areas.data ?? []) as Array<{ project_id: string; families: number | null }>) families.set(a.project_id, (families.get(a.project_id) ?? 0) + (a.families ?? 0));
  const docCount = new Map<string, number>();
  for (const d of (docs.data ?? []) as Array<{ project_id: string }>) docCount.set(d.project_id, (docCount.get(d.project_id) ?? 0) + 1);
  return rows.map((r) => toCard(r as any, families.get(r.id) ? (families.get(r.id) as number) : null, docCount.get(r.id) ?? 0));
}

export async function getDonorHomeAction(previewOrgId?: string | null): Promise<{ ok: true; data: DonorHome } | Failure> {
  try {
    const org = await resolveOrg(previewOrgId);
    if (isFailure(org)) return org;
    const rows = await projectsOf(org.orgId);
    return { ok: true, data: { orgName: org.orgName, preview: org.preview, projects: await cardsFor(rows) } };
  } catch {
    return fail('Could not load your projects. Please refresh the page.');
  }
}

export async function getDonorProjectAction(projectId: string, previewOrgId?: string | null): Promise<{ ok: true; data: DonorProjectView } | Failure> {
  try {
    if (!isUuid(projectId)) return fail('Project not found.');
    const org = await resolveOrg(previewOrgId);
    if (isFailure(org)) return org;
    const rows = await projectsOf(org.orgId, projectId);
    const row = rows[0];
    if (!row) return fail('Project not found.');
    const [card] = await cardsFor([row]);

    const admin = createAdminClient();
    const { data: docs } = await (admin.from('documents') as any)
      .select('id, title, category, description, released_at, current_version_id')
      .eq('project_id', projectId)
      .eq('released_to_donor', true)
      .is('deleted_at', null)
      .order('released_at', { ascending: false });
    const docRows = (docs ?? []) as Array<{ id: string; title: string; category: string; description: string | null; released_at: string | null; current_version_id: string | null }>;
    const versionIds = docRows.map((d) => d.current_version_id).filter((v): v is string => !!v);
    const versions = new Map<string, { original_name: string | null; size: number | string }>();
    if (versionIds.length > 0) {
      const { data } = await (admin.from('document_versions') as any).select('id, original_name, size').in('id', versionIds);
      for (const v of (data ?? []) as Array<{ id: string; original_name: string | null; size: number | string }>) versions.set(v.id, v);
    }
    const documents: DonorDocument[] = docRows.map((d) => {
      const v = d.current_version_id ? versions.get(d.current_version_id) : undefined;
      return { id: d.id, title: d.title, category: d.category, description: d.description, releasedAt: d.released_at, fileName: v?.original_name ?? null, size: Number(v?.size ?? 0), versionId: v ? d.current_version_id : null };
    });
    return { ok: true, data: { orgName: org.orgName, preview: org.preview, project: card, description: (row.description as string | null) ?? null, documents } };
  } catch {
    return fail('Could not load the project. Please refresh the page.');
  }
}

/**
 * A short-lived download link for one released document of the donor's own projects.
 * Unlike the staff download, this checks that the file really is a released document of this donor.
 */
export async function getDonorDownloadAction(versionId: string, previewOrgId?: string | null): Promise<{ ok: true; url: string } | Failure> {
  try {
    if (!isUuid(versionId)) return fail('File not found.');
    const org = await resolveOrg(previewOrgId);
    if (isFailure(org)) return org;
    const admin = createAdminClient();
    const { data: v } = await (admin.from('document_versions') as any).select('id, document_id, storage_path, original_name').eq('id', versionId).maybeSingle();
    if (!v) return fail('File not found.');
    const { data: d } = await (admin.from('documents') as any).select('project_id, released_to_donor, deleted_at, current_version_id').eq('id', v.document_id).maybeSingle();
    if (!d || !d.released_to_donor || d.deleted_at || d.current_version_id !== versionId) return fail('File not found.');
    const mine = await projectsOf(org.orgId, d.project_id as string);
    if (mine.length === 0) return fail('File not found.');
    const { data: signed, error } = await admin.storage.from('project-documents').createSignedUrl(v.storage_path as string, 5 * 60, { download: (v.original_name as string | null) ?? true });
    if (error || !signed) return fail('Could not create the download link. Please try again.');
    return { ok: true, url: signed.signedUrl };
  } catch {
    return fail('Could not create the download link. Please try again.');
  }
}
