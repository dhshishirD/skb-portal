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

export const INITIAL_DONOR_QUERIES: DonorQueryTicket[] = [
  {
    id: 'TICKET-2026-001',
    pid: 'PID 22567',
    donorName: 'IHH Humanitarian Relief Foundation',
    donorEmail: 'audit@ihh.org.tr',
    queryType: 'Underage Beneficiary Query',
    message: 'Regarding Beneficiary Serial #14 in PID 22567 (Livestock Distribution): The beneficiary listed appears under 18 years. Please provide official guardian clarification.',
    status: 'Officer Clarification Posted',
    assignedOfficerName: 'Mizbah Uddin',
    assignedOfficerEmail: 'uddinmizbah902@gmail.com',
    createdAt: '2026-09-20 10:30 AM',
    officerResponse: {
      responderName: 'Mizbah Uddin',
      responderRole: 'Program Officer (Assigned)',
      responseText: 'Clarification Provided: Beneficiary Serial #14 is an orphan child represented by his legal guardian/mother (Fatema Begum, NID 1985269123456). Livestock is assigned for household income generation. Formal Clarification Letter attached.',
      attachmentName: 'Clarification_Letter_Underage_Beneficiaries_PID_22567.pdf',
      respondedAt: '2026-09-21 02:15 PM',
    },
  },
  {
    id: 'TICKET-2026-002',
    pid: 'PID 23431',
    donorName: 'UNHCR Audit Team',
    donorEmail: 'refugee-audit@unhcr.org',
    queryType: 'Photo Request',
    message: 'Please provide additional high-resolution distribution photos with official UNHCR banner for Rohingya Camp 11 distribution.',
    status: 'Pending Officer Review',
    assignedOfficerName: 'MD. Emran',
    assignedOfficerEmail: 'emran@skb.org.bd',
    createdAt: '2026-09-28 04:45 PM',
  },
];

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
