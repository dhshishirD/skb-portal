import { describe, it, expect } from 'vitest';
import {
  verifyWebhookSignature,
  parseKoboPayload,
  parseODKPayload,
  processWebhookSubmission,
} from '../webhookIngestion';
import crypto from 'crypto';

describe('Webhook Ingestion Service', () => {
  it('should correctly verify HMAC SHA256 signatures', () => {
    const rawBody = JSON.stringify({ event: 'submission', id: 123 });
    const secret = 'my_secret_key';
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    expect(verifyWebhookSignature(rawBody, validSignature, secret)).toBe(true);
    expect(verifyWebhookSignature(rawBody, 'invalid_sig', secret)).toBe(false);
    expect(verifyWebhookSignature(rawBody, null, secret)).toBe(false);
  });

  it('should parse KoboToolbox submission payloads correctly', () => {
    const koboPayload = {
      _id: 998877,
      _xform_id_string: 'kobo_water_sanitation_v1',
      project_id: 'proj-101',
      beneficiary_name: 'Rahima Begum',
      national_id: '1990123456789',
      household_size: '5',
      _submitted_by: 'field_officer_dhaka',
    };

    const parsed = parseKoboPayload(koboPayload);

    expect(parsed._id).toBe(998877);
    expect(parsed.form_id).toBe('kobo_water_sanitation_v1');
    expect(parsed.beneficiary_name).toBe('Rahima Begum');
    expect(parsed.household_size).toBe(5);
    expect(parsed.submitted_by).toBe('field_officer_dhaka');
  });

  it('should parse ODK Central survey payload correctly', () => {
    const odkPayload = {
      instanceId: 'uuid:11223344',
      formId: 'odk_health_check',
      submitterName: 'Dr. Karim',
      data: {
        project_id: 'proj-202',
        location_id: 'loc-dhaka',
        beneficiary_name: 'Abul Hossain',
        household_size: 4,
      },
    };

    const parsed = parseODKPayload(odkPayload);

    expect(parsed._id).toBe('uuid:11223344');
    expect(parsed.form_id).toBe('odk_health_check');
    expect(parsed.beneficiary_name).toBe('Abul Hossain');
    expect(parsed.submitted_by).toBe('Dr. Karim');
  });

  it('should handle webhook processing safely', () => {
    const res = processWebhookSubmission('kobotoolbox', { _id: 123, form_id: 'test' });
    expect(res.success).toBe(true);
    expect(res.processedRecordCount).toBe(1);
    expect(res.webhookId).toContain('wh_kobotoolbox_123');

    const emptyRes = processWebhookSubmission('odk', {});
    expect(emptyRes.success).toBe(false);
    expect(emptyRes.processedRecordCount).toBe(0);
  });
});
