'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  beneficiarySchema,
  canDeleteBeneficiaries,
  canReadAccessLog,
  canReadBeneficiaries,
  canRegisterBeneficiaries,
  countGroups,
  friendlyBeneficiaryError,
  normalizeNationalId,
  normalizePhone,
  revealSchema,
  type AccessLogRow,
  type BeneficiariesData,
  type BeneficiaryFormValues,
  type BeneficiaryRow,
  type RevealField,
  type Sex,
} from '@/lib/beneficiaries';
import { IMPORT_MAX_ROWS } from '@/lib/beneficiaryImport';
import { decryptField, encryptField, encryptionReady, fingerprintNationalId } from '@/server/crypto/beneficiaryCrypto';
import { getActor, getProjectById, isUuid } from '@/server/services/projectsData';

/*
 * Projects & Grants: beneficiaries (migration 0021).
 *
 * Everything runs as the signed-in user, so Row Level Security and the database guards decide.
 * Names, ID numbers and phone numbers are encrypted HERE, before they are sent to the database.
 * Revealing an ID number or phone number is written to the access log first; if that fails, nothing is shown.
 */

type Failure = { ok: false; error: string };
export type BeneficiaryActionResult = { ok: true; message?: string } | Failure;
export type BeneficiaryDataResult<T> = { ok: true; data: T } | Failure;

const fail = (error: string): Failure => ({ ok: false, error });
const firstIssue = (e: { issues: Array<{ message: string }> }) => e.issues[0]?.message ?? 'Please check the values.';
const path = (projectId: string) => `/projects/${projectId}/beneficiaries`;
const LIST_LIMIT = 300;
const ROW_LIMIT = 5000;

interface PersonRow {
  id: string;
  full_name_enc: string;
  national_id_enc: string | null;
  phone_enc: string | null;
  sex: string | null;
  birth_year: number | null;
  registered_by: string | null;
  created_at: string;
  consent_at: string | null;
}

function safeDecrypt(value: string): string {
  try {
    return decryptField(value);
  } catch {
    return '(cannot be read: key missing or changed)';
  }
}

export async function getBeneficiariesAction(projectId: string): Promise<BeneficiaryDataResult<BeneficiariesData>> {
  try {
    if (!isUuid(projectId)) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canReadBeneficiaries(actor.roles) && !actor.roles.includes('legal_officer')) {
      return fail('You do not have permission to see the beneficiaries of this project.');
    }
    const project = await getProjectById(projectId);
    if (!project) return fail('Project not found.');

    const supabase = await createClient();
    const res = await (supabase.from('beneficiaries') as any)
      .select('id, full_name_enc, national_id_enc, phone_enc, sex, birth_year, registered_by, created_at, consent_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .range(0, ROW_LIMIT - 1);
    if (res.error) return fail('Could not load the beneficiaries. Please refresh the page.');
    const rows = (res.data ?? []) as PersonRow[];

    const ready = encryptionReady();
    const shownRows = rows.slice(0, LIST_LIMIT);
    const byIds = [...new Set(shownRows.map((r) => r.registered_by).filter((x): x is string => !!x))];
    const names = new Map<string, string>();
    if (byIds.length > 0) {
      const { data } = await (supabase.from('profiles') as any).select('id, full_name').in('id', byIds);
      for (const p of (data ?? []) as Array<{ id: string; full_name: string | null }>) if (p.full_name) names.set(p.id, p.full_name);
    }

    const people: BeneficiaryRow[] = shownRows.map((r) => ({
      id: r.id,
      fullName: ready ? safeDecrypt(r.full_name_enc) : '(locked: encryption key not set up)',
      sex: r.sex === 'female' || r.sex === 'male' || r.sex === 'other' ? (r.sex as Sex) : null,
      birthYear: r.birth_year,
      hasNationalId: !!r.national_id_enc,
      hasPhone: !!r.phone_enc,
      registeredByName: r.registered_by ? names.get(r.registered_by) ?? null : null,
      registeredAt: r.created_at,
    }));

    let log: AccessLogRow[] | null = null;
    if (canReadAccessLog(actor.roles) || actor.roles.includes('legal_officer')) {
      const logRes = await (supabase.from('beneficiary_access_log') as any)
        .select('id, beneficiary_id, field, reason, accessed_by, accessed_at')
        .eq('project_id', projectId)
        .order('accessed_at', { ascending: false })
        .limit(100);
      const logRows = (logRes.data ?? []) as Array<{ id: string; beneficiary_id: string; field: RevealField; reason: string | null; accessed_by: string; accessed_at: string }>;
      const who = [...new Set(logRows.map((l) => l.accessed_by))].filter((id) => !names.has(id));
      if (who.length > 0) {
        const { data } = await (supabase.from('profiles') as any).select('id, full_name').in('id', who);
        for (const p of (data ?? []) as Array<{ id: string; full_name: string | null }>) if (p.full_name) names.set(p.id, p.full_name);
      }
      const nameOfPerson = new Map(rows.map((r) => [r.id, ready ? safeDecrypt(r.full_name_enc) : null]));
      log = logRows.map((l) => ({
        id: l.id,
        field: l.field,
        reason: l.reason,
        byName: names.get(l.accessed_by) ?? null,
        at: l.accessed_at,
        personName: nameOfPerson.get(l.beneficiary_id) ?? null,
      }));
    }

    const closed = project.stage === 'closed';
    return {
      ok: true,
      data: {
        projectId,
        people,
        counts: countGroups(rows.map((r) => ({ sex: r.sex, birthYear: r.birth_year })), new Date().getFullYear()),
        shown: people.length,
        log,
        closed,
        encryptionReady: ready,
        canRegister: !closed && ready && canRegisterBeneficiaries(actor.roles),
        canDelete: !closed && canDeleteBeneficiaries(actor.roles),
        canReveal: ready && canReadBeneficiaries(actor.roles),
        consentRecorded: rows.filter((r) => r.consent_at).length,
      },
    };
  } catch {
    return fail('Could not load the beneficiaries. Please refresh the page.');
  }
}

type Guard = Failure | { ok: true; userId: string };
async function guard(projectId: string, need: 'register' | 'delete' | 'read', allowClosed = false): Promise<Guard> {
  if (!isUuid(projectId)) return fail('Project not found.');
  const actor = await getActor();
  if (!actor) return fail('Please sign in again.');
  const allowed =
    need === 'register' ? canRegisterBeneficiaries(actor.roles) : need === 'delete' ? canDeleteBeneficiaries(actor.roles) : canReadBeneficiaries(actor.roles);
  if (!allowed) return fail('You do not have permission to do this.');
  const project = await getProjectById(projectId);
  if (!project) return fail('Project not found.');
  if (project.stage === 'closed' && !allowClosed) return fail('The beneficiaries of a closed project cannot be changed.');
  return { ok: true, userId: actor.userId };
}
const denied = (g: Guard): g is Failure => g.ok === false;

const NO_KEY = 'Registration is switched off: the encryption key is not set up on the server yet. Please ask the administrator.';

export async function registerBeneficiaryAction(projectId: string, values: BeneficiaryFormValues): Promise<BeneficiaryActionResult> {
  try {
    const g = await guard(projectId, 'register');
    if (denied(g)) return g;
    if (!encryptionReady()) return fail(NO_KEY);
    const parsed = beneficiarySchema.safeParse(values);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const p = parsed.data;
    const nid = p.nationalId ? normalizeNationalId(p.nationalId) : null;

    const supabase = await createClient();
    const { error } = await (supabase.from('beneficiaries') as any).insert({
      project_id: projectId,
      full_name_enc: encryptField(p.fullName),
      national_id_enc: nid ? encryptField(nid) : null,
      national_id_hash: nid ? fingerprintNationalId(nid) : null,
      phone_enc: p.phone ? encryptField(normalizePhone(p.phone)) : null,
      sex: p.sex,
      birth_year: p.birthYear,
    });
    if (error) return fail(friendlyBeneficiaryError(error));
    revalidatePath(path(projectId));
    return { ok: true, message: 'Registered. The details are stored encrypted.' };
  } catch {
    return fail('Something went wrong. Nothing was saved.');
  }
}

/** Name, sex and birth year can be changed. A blank ID or phone keeps the saved one; a new value replaces it. */
export async function updateBeneficiaryAction(projectId: string, id: string, values: BeneficiaryFormValues): Promise<BeneficiaryActionResult> {
  try {
    if (!isUuid(id)) return fail('Invalid request.');
    const g = await guard(projectId, 'register');
    if (denied(g)) return g;
    if (!encryptionReady()) return fail(NO_KEY);
    const parsed = beneficiarySchema.safeParse(values);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const p = parsed.data;

    const change: Record<string, unknown> = { full_name_enc: encryptField(p.fullName), sex: p.sex, birth_year: p.birthYear };
    if (p.nationalId) {
      const nid = normalizeNationalId(p.nationalId);
      change.national_id_enc = encryptField(nid);
      change.national_id_hash = fingerprintNationalId(nid);
    }
    if (p.phone) change.phone_enc = encryptField(normalizePhone(p.phone));

    const supabase = await createClient();
    const { data, error } = await (supabase.from('beneficiaries') as any).update(change).eq('id', id).eq('project_id', projectId).select('id');
    if (error) return fail(friendlyBeneficiaryError(error));
    if (!data || data.length === 0) return fail('Person not found, or you are not assigned to this project.');
    revalidatePath(path(projectId));
    return { ok: true, message: 'Saved.' };
  } catch {
    return fail('Something went wrong. Nothing was saved.');
  }
}

export async function deleteBeneficiaryAction(projectId: string, id: string): Promise<BeneficiaryActionResult> {
  try {
    if (!isUuid(id)) return fail('Invalid request.');
    const g = await guard(projectId, 'delete');
    if (denied(g)) return g;
    const supabase = await createClient();
    const { data, error } = await (supabase.from('beneficiaries') as any).delete().eq('id', id).eq('project_id', projectId).select('id');
    if (error) return fail(friendlyBeneficiaryError(error));
    if (!data || data.length === 0) return fail('Person not found, or you are not assigned to this project.');
    revalidatePath(path(projectId));
    return { ok: true, message: 'Removed. The access log keeps its history.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

/**
 * Show one ID number or phone number. The access is written to the log FIRST; if the log cannot be
 * written, nothing is decrypted. The value is returned to the screen only; it is never stored.
 */
export async function revealFieldAction(
  projectId: string,
  id: string,
  field: RevealField,
  reason: string,
): Promise<BeneficiaryDataResult<{ value: string }>> {
  try {
    if (!isUuid(id)) return fail('Invalid request.');
    const g = await guard(projectId, 'read', true);
    if (denied(g)) return g;
    if (!encryptionReady()) return fail('The encryption key is not set up on the server yet.');
    const parsed = revealSchema.safeParse({ field, reason });
    if (!parsed.success) return fail(firstIssue(parsed.error));

    const supabase = await createClient();
    const { data: row, error } = await (supabase.from('beneficiaries') as any)
      .select('id, national_id_enc, phone_enc')
      .eq('id', id)
      .eq('project_id', projectId)
      .maybeSingle();
    if (error) return fail('Could not open this record. Please try again.');
    if (!row) return fail('Person not found, or you are not assigned to this project.');
    const stored = (parsed.data.field === 'national_id' ? row.national_id_enc : row.phone_enc) as string | null;
    if (!stored) return fail('Nothing is saved in this field.');

    const { error: logError } = await (supabase.from('beneficiary_access_log') as any).insert({
      project_id: projectId,
      beneficiary_id: id,
      field: parsed.data.field,
      reason: parsed.data.reason,
      accessed_by: g.userId,
    });
    if (logError) return fail('The access could not be recorded, so nothing is shown. Please try again.');

    let value: string;
    try {
      value = decryptField(stored);
    } catch {
      return fail('This value cannot be read (the encryption key is missing or has changed).');
    }
    return { ok: true, data: { value } };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

/**
 * Bulk upload: the people of a checked sheet are registered in one go. The rows are checked again here (nothing
 * from the browser is trusted), a person whose national ID is already registered in this project is skipped,
 * and everything is encrypted before it is saved. Runs as the signed-in user, so the same database rules apply
 * as for one-by-one registration (who may register, closed projects frozen, audit log).
 */
export async function importBeneficiariesAction(projectId: string, rows: BeneficiaryFormValues[]): Promise<BeneficiaryActionResult> {
  try {
    const g = await guard(projectId, 'register');
    if (denied(g)) return g;
    if (!encryptionReady()) return fail(NO_KEY);
    if (!Array.isArray(rows) || rows.length === 0) return fail('There is no one to register.');
    if (rows.length > IMPORT_MAX_ROWS) return fail(`A file may hold up to ${IMPORT_MAX_ROWS} people. Please split it into smaller files.`);

    const people: Array<{ p: ReturnType<typeof beneficiarySchema.parse>; nid: string | null }> = [];
    const seen = new Set<string>();
    for (let i = 0; i < rows.length; i++) {
      const parsed = beneficiarySchema.safeParse(rows[i]);
      if (!parsed.success) return fail(`Row ${i + 1}: ${firstIssue(parsed.error)}`);
      const nid = parsed.data.nationalId ? normalizeNationalId(parsed.data.nationalId) : null;
      if (nid) {
        if (seen.has(nid)) return fail(`Row ${i + 1}: the same national ID appears twice in the file.`);
        seen.add(nid);
      }
      people.push({ p: parsed.data, nid });
    }

    const supabase = await createClient();
    const hashes = people.map((x) => (x.nid ? fingerprintNationalId(x.nid) : null));
    const existing = new Set<string>();
    const wanted = hashes.filter((h): h is string => !!h);
    for (let i = 0; i < wanted.length; i += 200) {
      const { data, error } = await (supabase.from('beneficiaries') as any)
        .select('national_id_hash')
        .eq('project_id', projectId)
        .in('national_id_hash', wanted.slice(i, i + 200));
      if (error) return fail('Could not check for people already registered. Nothing was saved.');
      for (const r of (data ?? []) as Array<{ national_id_hash: string }>) existing.add(r.national_id_hash);
    }

    const records = people
      .map((x, i) => ({ x, hash: hashes[i] ?? null }))
      .filter(({ hash }) => !(hash && existing.has(hash)))
      .map(({ x, hash }) => ({
        project_id: projectId,
        full_name_enc: encryptField(x.p.fullName),
        national_id_enc: x.nid ? encryptField(x.nid) : null,
        national_id_hash: hash,
        phone_enc: x.p.phone ? encryptField(normalizePhone(x.p.phone)) : null,
        sex: x.p.sex,
        birth_year: x.p.birthYear,
      }));
    const skipped = people.length - records.length;

    let saved = 0;
    for (let i = 0; i < records.length; i += 200) {
      const chunk = records.slice(i, i + 200);
      const { error } = await (supabase.from('beneficiaries') as any).insert(chunk);
      if (error) {
        revalidatePath(path(projectId));
        const why = friendlyBeneficiaryError(error);
        return fail(saved > 0 ? `${saved} people were registered before a problem stopped the upload: ${why} Upload the file again; people already registered are skipped only when they have a national ID.` : why);
      }
      saved += chunk.length;
    }
    revalidatePath(path(projectId));
    return { ok: true, message: `${saved} ${saved === 1 ? 'person' : 'people'} registered${skipped > 0 ? `, ${skipped} skipped because their national ID is already registered in this project` : ''}.` };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}
