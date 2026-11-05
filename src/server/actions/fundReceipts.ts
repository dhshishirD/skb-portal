'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  canDeleteReceipts,
  canRecordReceipts,
  fundReceiptSchema,
  friendlyReceiptError,
  isAckStatus,
  type FundReceipt,
  type FundReceiptData,
  type FundReceiptFormValues,
} from '@/lib/fundReceipts';
import { buildReceiptLetter } from '@/lib/fundReceiptLetter';
import { getActor, getOwnOrganization, getProjectById, isUuid } from '@/server/services/projectsData';

/*
 * Projects & Grants: fund receipts (migration 0017).
 *
 * Everything runs as the signed-in user, so Row Level Security and the database guard decide.
 * The checks below only give clearer messages and fail fast.
 */

type Failure = { ok: false; error: string };
export type ReceiptActionResult = { ok: true; message?: string } | Failure;
export type ReceiptDataResult<T> = { ok: true; data: T } | Failure;

const fail = (error: string): Failure => ({ ok: false, error });
const firstIssue = (e: { issues: Array<{ message: string }> }) => e.issues[0]?.message ?? 'Please check the values.';

interface ReceiptRow {
  id: string;
  received_on: string;
  amount: number | string;
  currency: string;
  reference: string | null;
  from_name: string | null;
  note: string | null;
  ack_status: string;
}

const toReceipt = (r: ReceiptRow): FundReceipt => ({
  id: r.id,
  receivedOn: r.received_on,
  amount: Number(r.amount),
  currency: r.currency.trim(),
  reference: r.reference,
  fromName: r.from_name,
  note: r.note,
  ackStatus: isAckStatus(r.ack_status) ? r.ack_status : 'not_sent',
});

const COLUMNS = 'id, received_on, amount, currency, reference, from_name, note, ack_status';

export async function getFundReceiptsAction(projectId: string): Promise<ReceiptDataResult<FundReceiptData>> {
  try {
    if (!isUuid(projectId)) return fail('Project not found.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    const project = await getProjectById(projectId);
    if (!project) return fail('Project not found.');

    const supabase = await createClient();
    const { data, error } = await (supabase.from('project_fund_receipts') as any)
      .select(COLUMNS)
      .eq('project_id', projectId)
      .order('received_on', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) return fail('Could not load the fund receipts. Please refresh the page.');

    const closed = project.stage === 'closed';
    return {
      ok: true,
      data: {
        projectId,
        projectCode: project.code,
        projectTitle: project.title,
        donorAmount: project.budget_amount === null || project.budget_amount === '' ? null : Number(project.budget_amount),
        currency: project.budget_currency,
        donorName: project.donor_name,
        receipts: ((data ?? []) as ReceiptRow[]).map(toReceipt),
        closed,
        canRecord: !closed && canRecordReceipts(actor.roles),
        canDelete: !closed && canDeleteReceipts(actor.roles),
      },
    };
  } catch {
    return fail('Could not load the fund receipts. Please refresh the page.');
  }
}

async function guard(projectId: string, need: 'record' | 'delete'): Promise<(Failure | { userId: string }) & { ok?: boolean }> {
  if (!isUuid(projectId)) return fail('Project not found.');
  const actor = await getActor();
  if (!actor) return fail('Please sign in again.');
  const allowed = need === 'delete' ? canDeleteReceipts(actor.roles) : canRecordReceipts(actor.roles);
  if (!allowed) {
    return fail(need === 'delete' ? 'Only the Executive Director and Finance can delete a receipt.' : 'You do not have permission to record fund receipts.');
  }
  const project = await getProjectById(projectId);
  if (!project) return fail('Project not found.');
  if (project.stage === 'closed') return fail('The fund receipts of a closed project cannot be changed.');
  return { userId: actor.userId };
}

const isFailure = (g: Awaited<ReturnType<typeof guard>>): g is Failure => 'ok' in g && g.ok === false;

export async function addFundReceiptAction(projectId: string, values: FundReceiptFormValues): Promise<ReceiptActionResult> {
  try {
    const g = await guard(projectId, 'record');
    if (isFailure(g)) return g;
    const parsed = fundReceiptSchema.safeParse(values);
    if (!parsed.success) return fail(firstIssue(parsed.error));

    const supabase = await createClient();
    const { error } = await (supabase.from('project_fund_receipts') as any).insert({
      project_id: projectId,
      received_on: parsed.data.receivedOn,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      reference: parsed.data.reference,
      from_name: parsed.data.fromName,
      note: parsed.data.note,
      created_by: (g as { userId: string }).userId,
    });
    if (error) return fail(friendlyReceiptError(error));
    revalidatePath(`/projects/${projectId}/receipts`);
    return { ok: true, message: 'Fund receipt recorded.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

export async function updateFundReceiptAction(projectId: string, receiptId: string, values: FundReceiptFormValues): Promise<ReceiptActionResult> {
  try {
    if (!isUuid(receiptId)) return fail('Invalid request.');
    const g = await guard(projectId, 'record');
    if (isFailure(g)) return g;
    const parsed = fundReceiptSchema.safeParse(values);
    if (!parsed.success) return fail(firstIssue(parsed.error));

    const supabase = await createClient();
    const { data, error } = await (supabase.from('project_fund_receipts') as any)
      .update({
        received_on: parsed.data.receivedOn,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        reference: parsed.data.reference,
        from_name: parsed.data.fromName,
        note: parsed.data.note,
      })
      .eq('id', receiptId)
      .eq('project_id', projectId)
      .select('id');
    if (error) return fail(friendlyReceiptError(error));
    if (!data || data.length === 0) return fail('Receipt not found, or you are not assigned to this project.');
    revalidatePath(`/projects/${projectId}/receipts`);
    return { ok: true, message: 'Fund receipt saved.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

/** Move the acknowledgement letter along: not sent -> sent -> signed copy received. */
export async function setAckStatusAction(projectId: string, receiptId: string, status: string): Promise<ReceiptActionResult> {
  try {
    if (!isUuid(receiptId) || !isAckStatus(status)) return fail('Invalid request.');
    const g = await guard(projectId, 'record');
    if (isFailure(g)) return g;

    const supabase = await createClient();
    const { data, error } = await (supabase.from('project_fund_receipts') as any)
      .update({ ack_status: status })
      .eq('id', receiptId)
      .eq('project_id', projectId)
      .select('id');
    if (error) return fail(friendlyReceiptError(error));
    if (!data || data.length === 0) return fail('Receipt not found, or you are not assigned to this project.');
    revalidatePath(`/projects/${projectId}/receipts`);
    return { ok: true };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

export async function deleteFundReceiptAction(projectId: string, receiptId: string): Promise<ReceiptActionResult> {
  try {
    if (!isUuid(receiptId)) return fail('Invalid request.');
    const g = await guard(projectId, 'delete');
    if (isFailure(g)) return g;

    const supabase = await createClient();
    const { data, error } = await (supabase.from('project_fund_receipts') as any)
      .delete()
      .eq('id', receiptId)
      .eq('project_id', projectId)
      .select('id');
    if (error) return fail(friendlyReceiptError(error));
    if (!data || data.length === 0) return fail('Receipt not found, or you are not assigned to this project.');
    revalidatePath(`/projects/${projectId}/receipts`);
    return { ok: true, message: 'Fund receipt removed.' };
  } catch {
    return fail('Something went wrong. Please try again.');
  }
}

/** The acknowledgement letter as a PDF (base64) to print, sign by hand and scan. */
export async function generateReceiptLetterAction(
  projectId: string,
  receiptId: string,
): Promise<ReceiptDataResult<{ filename: string; base64: string }>> {
  try {
    if (!isUuid(projectId) || !isUuid(receiptId)) return fail('Invalid request.');
    const actor = await getActor();
    if (!actor) return fail('Please sign in again.');
    if (!canRecordReceipts(actor.roles)) return fail('You do not have permission to make this letter.');
    const project = await getProjectById(projectId);
    if (!project) return fail('Project not found.');

    const supabase = await createClient();
    const { data, error } = await (supabase.from('project_fund_receipts') as any)
      .select(COLUMNS)
      .eq('id', receiptId)
      .eq('project_id', projectId)
      .maybeSingle();
    if (error) return fail('Could not load the receipt. Please try again.');
    if (!data) return fail('Receipt not found, or you are not assigned to this project.');
    const receipt = toReceipt(data as ReceiptRow);
    const org = await getOwnOrganization();

    const bytes = await buildReceiptLetter({
      organisationName: org?.name ?? 'SKB',
      registrationNo: org?.registration_no ?? null,
      donorName: receipt.fromName ?? project.donor_name,
      projectCode: project.code,
      projectTitle: project.title,
      receivedOn: receipt.receivedOn,
      amount: receipt.amount,
      currency: receipt.currency,
      reference: receipt.reference,
      issuedOn: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }),
    });
    const safeCode = project.code.replace(/[^A-Za-z0-9_-]+/g, '-');
    return {
      ok: true,
      data: { filename: `fund-receipt-${safeCode}-${receipt.receivedOn}.pdf`, base64: Buffer.from(bytes).toString('base64') },
    };
  } catch {
    return fail('Could not make the letter. Please try again.');
  }
}
