import { describe, it, expect } from 'vitest';
import { createDonorQuery, respondToDonorQuery } from '../donorQueryService';

describe('Donor Objection & Clarification Ticket Service', () => {
  it('creates a new donor query ticket with Pending status', () => {
    const ticket = createDonorQuery(
      'PID 22567',
      'IHH Turkey Audit',
      'audit@ihh.org.tr',
      'Underage Beneficiary Query',
      'Please clarify beneficiary age in list #14'
    );

    expect(ticket.pid).toBe('PID 22567');
    expect(ticket.status).toBe('Pending Officer Review');
    expect(ticket.queryType).toBe('Underage Beneficiary Query');
  });

  it('allows assigned officer to respond with formal clarification', () => {
    const ticket = createDonorQuery(
      'PID 22567',
      'IHH Turkey Audit',
      'audit@ihh.org.tr',
      'Underage Beneficiary Query',
      'Please clarify beneficiary age in list #14'
    );

    const updated = respondToDonorQuery(
      ticket,
      'Mizbah Uddin',
      'Program Officer',
      'Guardian representation certificate provided.',
      'Clarification_Letter_PID_22567.pdf'
    );

    expect(updated.status).toBe('Officer Clarification Posted');
    expect(updated.officerResponse?.responderName).toBe('Mizbah Uddin');
    expect(updated.officerResponse?.attachmentName).toBe('Clarification_Letter_PID_22567.pdf');
  });
});
