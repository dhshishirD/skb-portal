export interface NotificationResult {
  success: boolean;
  messageId: string;
  channel: 'sms' | 'whatsapp' | 'email';
  recipient: string;
  provider: string;
  error?: string;
}

export interface SMSPayload {
  recipient: string;
  message: string;
  provider?: 'twilio' | 'bd_sms_gateway' | 'mock';
}

export interface WhatsAppPayload {
  recipient: string;
  templateName: string;
  parameters: Record<string, string>;
}

/**
 * Format Bangladesh phone number to standard E.164 (+880...)
 */
export function formatBDPhoneNumber(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.startsWith('880')) {
    return `+${digitsOnly}`;
  }
  if (digitsOnly.startsWith('0')) {
    return `+88${digitsOnly}`;
  }
  if (digitsOnly.length === 10) {
    return `+880${digitsOnly}`;
  }
  return `+${digitsOnly}`;
}

/**
 * Send SMS notification via Twilio / BD Gateway / Mock
 */
export async function sendSMSNotification(payload: SMSPayload): Promise<NotificationResult> {
  const formattedPhone = formatBDPhoneNumber(payload.recipient);
  const provider = payload.provider || process.env.SMS_PROVIDER || 'mock';

  if (!payload.message || payload.message.trim().length === 0) {
    return {
      success: false,
      messageId: '',
      channel: 'sms',
      recipient: formattedPhone,
      provider,
      error: 'Message content cannot be empty',
    };
  }

  // Simulated provider dispatch
  const messageId = `msg_sms_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  return {
    success: true,
    messageId,
    channel: 'sms',
    recipient: formattedPhone,
    provider,
  };
}

/**
 * Send WhatsApp notification alert
 */
export async function sendWhatsAppNotification(payload: WhatsAppPayload): Promise<NotificationResult> {
  const formattedPhone = formatBDPhoneNumber(payload.recipient);
  const provider = 'twilio_whatsapp';

  const messageId = `msg_wa_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  return {
    success: true,
    messageId,
    channel: 'whatsapp',
    recipient: formattedPhone,
    provider,
  };
}

/**
 * Send Email notification alert via Resend API / Mock
 */
export interface ResendEmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendResendEmail(payload: ResendEmailPayload): Promise<NotificationResult> {
  const messageId = `msg_email_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  if (!payload.to || !payload.html) {
    return {
      success: false,
      messageId: '',
      channel: 'email',
      recipient: payload.to || '',
      provider: 'resend',
      error: 'Recipient email and HTML content are required',
    };
  }

  return {
    success: true,
    messageId,
    channel: 'email',
    recipient: payload.to,
    provider: 'resend',
  };
}

/**
 * Dispatch automated expense approval notification alert via SMS
 */
export async function dispatchExpenseApprovalAlert(
  recipientPhone: string,
  claimId: string,
  amountBDT: number,
  submitterName: string
): Promise<NotificationResult> {
  const message = `[SKB Portal] Expense Claim #${claimId} of BDT ${amountBDT.toLocaleString()} submitted by ${submitterName} requires your approval.`;
  return sendSMSNotification({ recipient: recipientPhone, message });
}

/**
 * Dispatch instant dual Email (Resend) and SMS approval alert
 */
export async function dispatchApprovalEmailAndSMS(
  recipientEmail: string,
  recipientPhone: string,
  claimId: string,
  amountBDT: number,
  submitterName: string,
  status: 'submitted' | 'approved' | 'rejected'
): Promise<{ emailResult: NotificationResult; smsResult: NotificationResult }> {
  const statusUpper = status.toUpperCase();
  const emailHtml = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
      <h2 style="color: #1e293b;">SKB Operations Portal — Expense Claim Alert</h2>
      <p>Expense Claim <strong>#${claimId}</strong> submitted by <strong>${submitterName}</strong> for <strong>৳${amountBDT.toLocaleString()} BDT</strong> status updated to: <span style="font-weight: bold; color: #2563eb;">${statusUpper}</span>.</p>
      <a href="https://skbportal.online/finance/approvals" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: bold;">Review Claim on Portal</a>
    </div>
  `;

  const emailResult = await sendResendEmail({
    to: recipientEmail,
    subject: `[SKB Portal] Expense Claim #${claimId} Status: ${statusUpper}`,
    html: emailHtml,
  });

  const smsResult = await dispatchExpenseApprovalAlert(
    recipientPhone,
    claimId,
    amountBDT,
    submitterName
  );

  return { emailResult, smsResult };
}

/**
 * Dispatch automated stage-gate shift alert
 */
export async function dispatchStageGateAlert(
  recipientPhone: string,
  projectCode: string,
  newStage: string
): Promise<NotificationResult> {
  const message = `[SKB Portal] Project ${projectCode} has successfully advanced to stage: ${newStage.toUpperCase()}.`;
  return sendSMSNotification({ recipient: recipientPhone, message });
}

