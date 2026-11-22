'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { STAFF_ROLES } from '@/lib/desks';
import { DEFAULT_CLOSING, DEFAULT_SALUTATION, friendlyLetterError, letterSchema, type LetterInfo, type LetterInput, type LetterStatus } from '@/lib/letters';
import { canSetReviewers, todayInDhaka } from '@/lib/workStatement';
import { getActor, isUuid } from '@/server/services/projectsData';

/*
 * Letters on the SKB letterhead pad (migration 0042). Everything runs as the signed-in user, so Row Level Security and
 * the database guard decide who may read and change what; the checks here only give clear messages. The Ref number is
 * given by the database when a letter is issued (issue_letter), never here.
 */

type Failure = { ok: false; error: string };
export type LetterActionResult = { ok: true; message?: string } | Failure;
export type LetterDataResult<T> = { ok: true; data: T } | Failure;
const fail = (error: string): Failure => ({ ok: false, error });
const PAGE = '/workspace/letters';

interface LetterRow {
  id: string;
  status: LetterStatus;
  ref_no: string | null;
  letter_date: string | null;
  to_lines: string;
  subject: string;
  salutation: string;
  body: string;
  closing: string;
  signatory_name: string;
  signatory_title: string;
  cc: string;
  with_signature: boolean;
  with_stamp: boolean;
  created_by: string | null;
  issued_by: string | null;
  issued_at: string | null;
  void_reason: string | null;
  updated_at: string;
}
const COLUMNS = 'id, status, ref_no, letter_date, to_lines, subject, salutation, body, closing, signatory_name, signatory_title, cc, with_signature, with_stamp, created_by, issued_by, issued_at, void_reason, updated_at';
const toLetter = (r: LetterRow): LetterInfo => ({
  id: r.id,
  status: r.status,
  refNo: r.ref_no,
  letterDate: r.letter_date,
  toLines: r.to_lines,
  subject: r.subject,
  salutation: r.salutation,
  body: r.body,
  closing: r.closing,
  signatoryName: r.signatory_name,
  signatoryTitle: r.signatory_title,
  cc: r.cc,
  withSignature: r.with_signature,
  withStamp: r.with_stamp,
  createdBy: r.created_by ?? '',
  issuedBy: r.issued_by,
  issuedAt: r.issued_at,
  voidReason: r.void_reason ?? '',
  updatedAt: r.updated_at,
});

async function names(ids: Array<string | null>): Promise<Record<string, string>> {
  const list = [...new Set(ids.filter((x): x is string => !!x))];
  const out: Record<string, string> = {};
  if (list.length === 0) return out;
  const supabase = await createClient();
  const { data } = await (supabase.from('profiles') as any).select('id, full_name').in('id', list);
  for (const p of (data ?? []) as Array<{ id: string; full_name: string | null }>) out[p.id] = p.full_name?.trim() || 'Unnamed';
  return out;
}

// ===== The register and one letter =====
export interface LetterRegister {
  me: string;
  canSetNumbering: boolean;
  letters: LetterInfo[];
  people: Record<string, string>;
  year: number;
  nextNumber: number | null;
  hasStamp: boolean;
}
export async function getLettersAction(): Promise<LetterDataResult<LetterRegister>> {
  try {
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const supabase = await createClient();
    const year = Number(todayInDhaka().slice(0, 4));
    const [res, next, stamp] = await Promise.all([
      (supabase.from('letters') as any).select(COLUMNS).order('created_at', { ascending: false }).limit(500),
      (supabase as any).rpc('next_letter_number', { _year: year }),
      (createAdminClient().from('org_stamp') as any).select('id').maybeSingle(),
    ]);
    if (res.error) return fail('Could not load the letters. Please refresh the page.');
    const letters = ((res.data ?? []) as LetterRow[]).map(toLetter);
    const people = await names(letters.flatMap((l) => [l.createdBy, l.issuedBy]));
    return {
      ok: true,
      data: { me: actor.userId, canSetNumbering: canSetReviewers(actor.roles), letters, people, year, nextNumber: typeof next.data === 'number' ? next.data : null, hasStamp: !!stamp.data },
    };
  } catch {
    return fail('Could not load the letters. Please refresh the page.');
  }
}

export interface LetterView {
  me: string;
  letter: LetterInfo;
  mine: boolean;
  /** The Executive Director and Super Admin may also edit, issue and cancel other people's letters. */
  canManage: boolean;
  people: Record<string, string>;
  hasStamp: boolean;
  hasMySignature: boolean;
}
export async function getLetterAction(id: string): Promise<LetterDataResult<LetterView>> {
  try {
    if (!isUuid(id)) return fail('Letter not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const supabase = await createClient();
    const { data, error } = await (supabase.from('letters') as any).select(COLUMNS).eq('id', id).maybeSingle();
    if (error) return fail('Could not load the letter. Please refresh the page.');
    if (!data) return fail('Letter not found.');
    const letter = toLetter(data as LetterRow);
    const admin = createAdminClient();
    const [people, stamp, sig] = await Promise.all([
      names([letter.createdBy, letter.issuedBy]),
      (admin.from('org_stamp') as any).select('id').maybeSingle(),
      (admin.from('staff_signatures') as any).select('user_id').eq('user_id', actor.userId).maybeSingle(),
    ]);
    const canManage = canSetReviewers(actor.roles);
    return { ok: true, data: { me: actor.userId, letter, mine: letter.createdBy === actor.userId, canManage, people, hasStamp: !!stamp.data, hasMySignature: !!sig.data } };
  } catch {
    return fail('Could not load the letter. Please refresh the page.');
  }
}

// ===== Writing =====
const toRow = (v: ReturnType<typeof letterSchema.parse>) => ({
  to_lines: v.toLines,
  subject: v.subject,
  salutation: v.salutation || DEFAULT_SALUTATION,
  body: v.body,
  closing: v.closing || DEFAULT_CLOSING,
  signatory_name: v.signatoryName,
  signatory_title: v.signatoryTitle,
  cc: v.cc,
  with_signature: v.withSignature,
  with_stamp: v.withStamp,
});

/** A new draft; the person who signs is the writer by default (their name and designation from the portal). */
export async function createLetterAction(): Promise<LetterDataResult<{ id: string }>> {
  try {
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const supabase = await createClient();
    const { data: me } = await (supabase.from('profiles') as any).select('full_name, designation').eq('id', actor.userId).maybeSingle();
    const { data, error } = await (supabase.from('letters') as any)
      .insert({ signatory_name: (me?.full_name as string | null)?.trim() ?? '', signatory_title: (me?.designation as string | null)?.trim() ?? '' })
      .select('id')
      .single();
    if (error || !data) return fail(friendlyLetterError(error));
    revalidatePath(PAGE);
    return { ok: true, data: { id: data.id as string } };
  } catch {
    return fail('Something went wrong. Nothing was saved.');
  }
}

/** A new draft with the content of another letter: how a wrong issued letter is corrected. */
export async function copyLetterAction(id: string): Promise<LetterDataResult<{ id: string }>> {
  try {
    if (!isUuid(id)) return fail('Letter not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const supabase = await createClient();
    const { data: src, error: e1 } = await (supabase.from('letters') as any).select(COLUMNS).eq('id', id).maybeSingle();
    if (e1 || !src) return fail('Letter not found.');
    const l = src as LetterRow;
    const { data, error } = await (supabase.from('letters') as any)
      .insert({ to_lines: l.to_lines, subject: l.subject, salutation: l.salutation, body: l.body, closing: l.closing, signatory_name: l.signatory_name, signatory_title: l.signatory_title, cc: l.cc, with_signature: l.with_signature, with_stamp: l.with_stamp })
      .select('id')
      .single();
    if (error || !data) return fail(friendlyLetterError(error));
    revalidatePath(PAGE);
    return { ok: true, data: { id: data.id as string } };
  } catch {
    return fail('Something went wrong. Nothing was saved.');
  }
}

export async function saveLetterAction(id: string, input: LetterInput): Promise<LetterActionResult> {
  try {
    if (!isUuid(id)) return fail('Letter not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const parsed = letterSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Please check the values.');
    const supabase = await createClient();
    const { data, error } = await (supabase.from('letters') as any).update(toRow(parsed.data)).eq('id', id).select('id');
    if (error) return fail(friendlyLetterError(error));
    if (!data || data.length === 0) return fail('You cannot change this letter.');
    revalidatePath(PAGE);
    return { ok: true, message: 'Saved.' };
  } catch {
    return fail('Something went wrong. Nothing was saved.');
  }
}

export async function deleteLetterAction(id: string): Promise<LetterActionResult> {
  try {
    if (!isUuid(id)) return fail('Letter not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const supabase = await createClient();
    const { data, error } = await (supabase.from('letters') as any).delete().eq('id', id).select('id');
    if (error) return fail(friendlyLetterError(error));
    if (!data || data.length === 0) return fail('Only a draft can be deleted, by the person who wrote it.');
    revalidatePath(PAGE);
    return { ok: true, message: 'Draft deleted.' };
  } catch {
    return fail('Something went wrong. Nothing was changed.');
  }
}

/** Issue: the database gives the next Ref number and locks the letter. Saves the latest text first, in the same click. */
export async function issueLetterAction(id: string, input: LetterInput): Promise<LetterDataResult<{ refNo: string }>> {
  try {
    if (!isUuid(id)) return fail('Letter not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const parsed = letterSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Please check the values.');
    const supabase = await createClient();
    const saved = await (supabase.from('letters') as any).update(toRow(parsed.data)).eq('id', id).select('id');
    if (saved.error) return fail(friendlyLetterError(saved.error));
    if (!saved.data || saved.data.length === 0) return fail('You cannot issue this letter.');
    const { data, error } = await (supabase as any).rpc('issue_letter', { _id: id });
    if (error) return fail(friendlyLetterError(error));
    revalidatePath(PAGE);
    return { ok: true, data: { refNo: String(data) } };
  } catch {
    return fail('Something went wrong. Nothing was issued.');
  }
}

export async function voidLetterAction(id: string, reason: string): Promise<LetterActionResult> {
  try {
    if (!isUuid(id)) return fail('Letter not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const why = reason.trim().slice(0, 200);
    if (!why) return fail('Write why the letter is cancelled.');
    const supabase = await createClient();
    const { data, error } = await (supabase.from('letters') as any).update({ status: 'void', void_reason: why }).eq('id', id).eq('status', 'issued').select('id');
    if (error) return fail(friendlyLetterError(error));
    if (!data || data.length === 0) return fail('You cannot cancel this letter.');
    revalidatePath(PAGE);
    return { ok: true, message: 'The letter is cancelled. Its number stays in the register.' };
  } catch {
    return fail('Something went wrong. Nothing was changed.');
  }
}

// ===== Pictures for the Word file: the issuer's own signature and the organisation stamp =====
const SIG_BUCKET = 'staff-signatures';
const STAMP_BUCKET = 'org-stamp';
async function picture(bucket: string, path: string, mime: string): Promise<string | null> {
  const file = await createAdminClient().storage.from(bucket).download(path);
  if (file.error || !file.data) return null;
  return `data:${mime};base64,${Buffer.from(await file.data.arrayBuffer()).toString('base64')}`;
}

/**
 * The pictures to put in the Word file of one letter the person can read (the database lets the letter load).
 * Signature: of the person who issued it (their own, only when the letter asked for it); on a draft, the signed-in
 * person's own. Stamp: only when the letter asked for it.
 */
export async function getLetterPicturesAction(id: string): Promise<LetterDataResult<{ signature: string | null; stamp: string | null }>> {
  try {
    if (!isUuid(id)) return fail('Letter not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const supabase = await createClient();
    const { data } = await (supabase.from('letters') as any).select('status, with_signature, with_stamp, issued_by, signature_user_id').eq('id', id).maybeSingle();
    if (!data) return fail('Letter not found.');
    const admin = createAdminClient();
    let signature: string | null = null;
    let stamp: string | null = null;
    if (data.with_signature) {
      const owner = data.status === 'draft' ? actor.userId : (data.signature_user_id as string | null);
      if (owner) {
        const { data: row } = await (admin.from('staff_signatures') as any).select('image_path, mime_type').eq('user_id', owner).maybeSingle();
        if (row) signature = await picture(SIG_BUCKET, row.image_path as string, row.mime_type as string);
      }
    }
    if (data.with_stamp) {
      const { data: row } = await (admin.from('org_stamp') as any).select('image_path, mime_type').maybeSingle();
      if (row) stamp = await picture(STAMP_BUCKET, row.image_path as string, row.mime_type as string);
    }
    return { ok: true, data: { signature, stamp } };
  } catch {
    return fail('Could not load the pictures.');
  }
}

// ===== The organisation stamp (any staff member may upload or replace it) =====
const MAX_STAMP_BYTES = 1024 * 1024;
const isPng = (b: Buffer) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
const isJpeg = (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

export async function saveStampAction(formData: FormData): Promise<LetterActionResult> {
  try {
    const actor = await getActor();
    if (!actor || !actor.roles.some((r) => STAFF_ROLES.includes(r))) return fail('Please sign in again.');
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) return fail('Choose a picture of the stamp.');
    if (file.size > MAX_STAMP_BYTES) return fail('The picture is too big (1 MB at most).');
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = isPng(bytes) ? 'image/png' : isJpeg(bytes) ? 'image/jpeg' : null;
    if (!mime) return fail('Please use a PNG or JPG picture.');
    const admin = createAdminClient();
    const path = `stamp-${Date.now()}.${mime === 'image/png' ? 'png' : 'jpg'}`;
    const up = await admin.storage.from(STAMP_BUCKET).upload(path, bytes, { contentType: mime, upsert: false });
    if (up.error) return fail('Could not save the stamp. Please try again.');
    const { data: old } = await (admin.from('org_stamp') as any).select('image_path').maybeSingle();
    const { error } = await (admin.from('org_stamp') as any).upsert({ id: true, image_path: path, mime_type: mime, updated_by: actor.userId, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    if (error) {
      await admin.storage.from(STAMP_BUCKET).remove([path]);
      return fail('Could not save the stamp. Please try again.');
    }
    if (old?.image_path) await admin.storage.from(STAMP_BUCKET).remove([old.image_path as string]);
    revalidatePath(PAGE);
    return { ok: true, message: 'The stamp is saved.' };
  } catch {
    return fail('Could not save the stamp. Please try again.');
  }
}

export async function removeStampAction(): Promise<LetterActionResult> {
  try {
    const actor = await getActor();
    if (!actor || !actor.roles.some((r) => STAFF_ROLES.includes(r))) return fail('Please sign in again.');
    const admin = createAdminClient();
    const { data } = await (admin.from('org_stamp') as any).select('image_path').maybeSingle();
    if (data?.image_path) await admin.storage.from(STAMP_BUCKET).remove([data.image_path as string]);
    await (admin.from('org_stamp') as any).delete().eq('id', true);
    revalidatePath(PAGE);
    return { ok: true, message: 'The stamp is removed. Letters already issued keep what was added.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

// ===== Numbering (Executive Director and Super Admin) =====
export async function setNumberingAction(year: number, last: number): Promise<LetterActionResult> {
  try {
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canSetReviewers(actor.roles)) return fail('Only the Executive Director or the Super Admin can set the numbering.');
    if (!Number.isInteger(year) || year < 2000 || year > 2200) return fail('Choose a valid year.');
    if (!Number.isInteger(last) || last < 0 || last > 99999) return fail('The number must be a whole number from 0 to 99999.');
    const supabase = await createClient();
    const { error } = await (supabase as any).rpc('set_letter_counter', { _year: year, _last: last });
    if (error) {
      if (String(error.message).includes('lower than')) return fail('That number is lower than a Ref already issued this year.');
      return fail('Could not set the numbering. Nothing was changed.');
    }
    revalidatePath(PAGE);
    return { ok: true, message: `The next letter will be number ${last + 1}.` };
  } catch {
    return fail('Something went wrong. Nothing was changed.');
  }
}
