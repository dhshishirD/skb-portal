export interface DonorQueryTicket {
  id: string;
  pid: string;
  donorName: string;
  donorEmail: string;
  queryType: 'Underage Beneficiary Query' | 'Budget Discrepancy' | 'Photo Request' | 'Logframe Question' | 'General Feedback';
  message: string;
  status: 'Pending Officer Review' | 'Officer Clarification Posted' | 'Resolved';
  assignedOfficerName: string;
  assignedOfficerEmail: string;
  createdAt: string;
  officerResponse?: {
    responderName: string;
    responderRole: string;
    responseText: string;
    attachmentName?: string;
    respondedAt: string;
  };
}

export const INITIAL_DONOR_QUERIES: DonorQueryTicket[] = [];

export function createDonorQuery(
  pid: string,
  donorName: string,
  donorEmail: string,
  queryType: DonorQueryTicket['queryType'],
  message: string,
  assignedOfficerName = 'Mizbah Uddin',
  assignedOfficerEmail = 'uddinmizbah902@gmail.com'
): DonorQueryTicket {
  return {
    id: `TICKET-2026-${Math.floor(100 + Math.random() * 900)}`,
    pid,
    donorName,
    donorEmail,
    queryType,
    message,
    status: 'Pending Officer Review',
    assignedOfficerName,
    assignedOfficerEmail,
    createdAt: new Date().toLocaleString(),
  };
}

export function respondToDonorQuery(
  ticket: DonorQueryTicket,
  responderName: string,
  responderRole: string,
  responseText: string,
  attachmentName?: string
): DonorQueryTicket {
  return {
    ...ticket,
    status: 'Officer Clarification Posted',
    officerResponse: {
      responderName,
      responderRole,
      responseText,
      attachmentName,
      respondedAt: new Date().toLocaleString(),
    },
  };
}
