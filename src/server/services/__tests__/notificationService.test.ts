import { describe, it, expect } from 'vitest';
import {
  formatBDPhoneNumber,
  sendSMSNotification,
  sendWhatsAppNotification,
  dispatchExpenseApprovalAlert,
  dispatchStageGateAlert,
} from '../notificationService';

describe('Notification Service', () => {
  it('should format Bangladesh mobile phone numbers correctly', () => {
    expect(formatBDPhoneNumber('01712345678')).toBe('+8801712345678');
    expect(formatBDPhoneNumber('8801712345678')).toBe('+8801712345678');
    expect(formatBDPhoneNumber('+8801712345678')).toBe('+8801712345678');
  });

  it('should send SMS notifications successfully', async () => {
    const res = await sendSMSNotification({
      recipient: '01812345678',
      message: 'Test alert from SKB Portal',
    });

    expect(res.success).toBe(true);
    expect(res.recipient).toBe('+8801812345678');
    expect(res.channel).toBe('sms');
    expect(res.messageId).toContain('msg_sms_');
  });

  it('should fail SMS notification if message is empty', async () => {
    const res = await sendSMSNotification({
      recipient: '01812345678',
      message: '',
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('Message content cannot be empty');
  });

  it('should send WhatsApp alerts successfully', async () => {
    const res = await sendWhatsAppNotification({
      recipient: '01912345678',
      templateName: 'expense_alert',
      parameters: { claimId: 'EXP-101' },
    });

    expect(res.success).toBe(true);
    expect(res.channel).toBe('whatsapp');
    expect(res.messageId).toContain('msg_wa_');
  });

  it('should dispatch helper expense approval and stage-gate alerts', async () => {
    const expRes = await dispatchExpenseApprovalAlert('01711112222', 'EXP-999', 45000, 'Tariq Islam');
    expect(expRes.success).toBe(true);

    const stageRes = await dispatchStageGateAlert('01711112222', 'PROJ-DHAKA-01', 'implementation');
    expect(stageRes.success).toBe(true);
  });
});
