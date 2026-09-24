import { NextResponse } from 'next/server';
import { sendSMSNotification, sendWhatsAppNotification } from '@/server/services/notificationService';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { channel, recipient, message, templateName, parameters } = body;

    if (!recipient || (!message && !templateName)) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

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
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Notification dispatch failed' }, { status: 500 });
  }
}
