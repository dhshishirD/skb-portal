import crypto from 'crypto';

export interface WebhookIngestionResult {
  success: boolean;
  webhookId?: string;
  eventType?: string;
  processedRecordCount: number;
  error?: string;
}

export interface KoboSubmissionData {
  _id: number | string;
  form_id: string;
  project_id?: string;
  location_id?: string;
  beneficiary_name?: string;
  national_id?: string;
  household_size?: number;
  report_title?: string;
  summary?: string;
  submitted_by?: string;
}

/**
 * Verify HMAC-SHA256 signature for incoming webhooks
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false;
  }
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const bufA = Buffer.from(signature);
  const bufB = Buffer.from(expectedHash);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Normalize and parse KoboToolbox survey payload
 */
export function parseKoboPayload(payload: Record<string, any>): KoboSubmissionData {
  return {
    _id: payload._id || payload.id || `kobo-${Date.now()}`,
    form_id: payload._xform_id_string || payload.form_id || 'unknown_form',
    project_id: payload.project_id || payload.project,
    location_id: payload.location_id || payload.district,
    beneficiary_name: payload.beneficiary_name || payload['group_beneficiary/name'],
    national_id: payload.national_id || payload['group_beneficiary/nid'],
    household_size: payload.household_size ? Number(payload.household_size) : undefined,
    report_title: payload.report_title || payload['group_report/title'] || 'Kobo Field Survey',
    summary: payload.summary || payload['group_report/summary'] || '',
    submitted_by: payload._submitted_by || payload.submitted_by || 'kobo_user',
  };
}

/**
 * Normalize and parse ODK Central survey submission payload
 */
export function parseODKPayload(payload: Record<string, any>): KoboSubmissionData {
  const data = payload.data || payload;
  return {
    _id: payload.instanceId || `odk-${Date.now()}`,
    form_id: payload.formId || 'odk_form',
    project_id: data.project_id,
    location_id: data.location_id,
    beneficiary_name: data.beneficiary_name,
    national_id: data.national_id,
    household_size: data.household_size ? Number(data.household_size) : undefined,
    report_title: data.report_title || 'ODK Field Survey Submission',
    summary: data.summary || '',
    submitted_by: payload.submitterName || 'odk_user',
  };
}

/**
 * Ingest and process survey payload from external sources (KoboToolbox / ODK)
 */
export function processWebhookSubmission(
  source: 'kobotoolbox' | 'odk',
  rawPayload: Record<string, any>
): WebhookIngestionResult {
  try {
    if (!rawPayload || Object.keys(rawPayload).length === 0) {
      return {
        success: false,
        processedRecordCount: 0,
        error: 'Payload is empty or invalid JSON',
      };
    }

    const normalized =
      source === 'kobotoolbox'
        ? parseKoboPayload(rawPayload)
        : parseODKPayload(rawPayload);

    return {
      success: true,
      webhookId: `wh_${source}_${normalized._id}`,
      eventType: `survey_submission.${source}`,
      processedRecordCount: 1,
    };
  } catch (err: any) {
    return {
      success: false,
      processedRecordCount: 0,
      error: err.message || 'Webhook processing failed',
    };
  }
}
