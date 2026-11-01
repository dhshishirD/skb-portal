import { NextResponse } from 'next/server';
import { processWebhookSubmission, verifyWebhookSignature } from '@/server/services/webhookIngestion';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-odk-signature');
    const webhookSecret = process.env.ODK_WEBHOOK_SECRET;

    // Fail closed: no configured secret, no signature, or a bad signature => reject.
    if (!webhookSecret) {
      console.error('ODK_WEBHOOK_SECRET is not configured; rejecting webhook.');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
    }
    if (!signature || !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody || '{}');
    const result = processWebhookSubmission('odk', payload);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Webhook processing failed' }, { status: 500 });
  }
}
