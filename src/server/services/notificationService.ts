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
 * Dispatch automated expense approval notification alert
 */
export async function dispatchExpenseApprovalAlert(
  recipientPhone: string,
  claimId: string,
  amountBDT: number,
  submitterName: string
): Promise<NotificationResult> {
  const message = `[NGO Portal] Expense Claim #${claimId} of BDT ${amountBDT.toLocaleString()} submitted by ${submitterName} requires your approval.`;
  return sendSMSNotification({ recipient: recipientPhone, message });
}

/**
 * Dispatch automated stage-gate shift alert
 */
export async function dispatchStageGateAlert(
  recipientPhone: string,
  projectCode: string,
  newStage: string
): Promise<NotificationResult> {
  const message = `[NGO Portal] Project ${projectCode} has successfully advanced to stage: ${newStage.toUpperCase()}.`;
  return sendSMSNotification({ recipient: recipientPhone, message });
}
