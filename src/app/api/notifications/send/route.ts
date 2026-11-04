import { NextResponse } from 'next/server';
import { sendSMSNotification, sendWhatsAppNotification } from '@/server/services/notificationService';
import { requireActiveRole } from '@/lib/auth/guards';
import { RateLimiter, canSendNotifications, notificationInputSchema } from '@/lib/apiAccess';

// Messages cost money and reach real people: only a few roles, and only a few per hour.
const limiter = new RateLimiter(20, 60 * 60 * 1000);

export async function POST(req: Request) {
  const guard = await requireActiveRole(canSendNotifications);
  if (!guard.ok) return guard.response;

  if (!limiter.allow(guard.user.id)) {
    return NextResponse.json({ error: 'Too many messages. Try again later.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = notificationInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  }
  const { channel, recipient, message, templateName, parameters } = parsed.data;
  if (!message && !templateName) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    if (channel === 'whatsapp') {
      const result = await sendWhatsAppNotification({
        recipient,
        templateName: templateName || 'generic_alert',
        parameters: parameters || {},
      });
      return NextResponse.json(result, { status: 200 });
    }
    const result = await sendSMSNotification({ recipient, message: message || '' });
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Notification dispatch failed' }, { status: 500 });
  }
}
