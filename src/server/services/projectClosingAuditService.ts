export interface AuditItemParameter {
  id: string;
  domain: 'A' | 'B' | 'C' | 'D';
  title: string;
  description: string;
  roleResponsible: 'PO' | 'FA' | 'MO' | 'PC' | 'PD';
  status: 'Compliant' | 'Non-Compliant' | 'N/A';
  notes?: string;
}

export interface ClosingExecutiveSignOff {
  role: 'Program Officer (PO)' | 'Finance & Accounts (FA)' | 'Media Officer (MO)' | 'Project Coordinator (PC)' | 'Project Director (PD)';
  officerName: string;
  designation: string;
  signed: boolean;
  signedAt?: string;
}

export interface ClosingReportWorkingPaper {
  projectId: string;
  projectTitle: string;
  ihhPid: string;
  donorName: string;
  totalBudgetEur: number;
  totalBudgetBdt: number;
  startDate: string;
  endDate: string;
  acDeclarationDate: string;
  form7SignatureDate: string;
  domainA_financial: AuditItemParameter[];
  domainB_safeguarding: AuditItemParameter[];
  domainC_timeline: AuditItemParameter[];
  domainD_media: AuditItemParameter[];
  signOffs: ClosingExecutiveSignOff[];
  isForm7Unlocked: boolean;
  updatedAt: string;
}

export const DEFAULT_CLOSING_AUDIT_ITEMS: AuditItemParameter[] = [
  // Domain A: Financial & Invoice Declaration Compliance
  { id: 'A.1', domain: 'A', title: 'Form-3 Cost Structure Matching', description: 'Unit cost and total cost structure in invoice declarations MUST BE IDENTICAL to Form-3 proposal rates.', roleResponsible: 'FA', status: 'Compliant' },
  { id: 'A.2', domain: 'A', title: 'Invoice Date Period Enforcement', description: 'All vendor invoice dates MUST fall strictly within official project period (Start Date <= Invoice Date <= End Date).', roleResponsible: 'FA', status: 'Compliant' },
  { id: 'A.3', domain: 'A', title: 'Categorized Goods Invoice Separation', description: 'Separate invoices MUST be used for each class of goods (food separate from livestock; shelter separate from blankets).', roleResponsible: 'FA', status: 'Compliant' },
  { id: 'A.4', domain: 'A', title: 'Fund Receival Bank Reconciliation', description: 'Official bank credit voucher / SWIFT advice MUST be verified and attached confirming exact fund receipt.', roleResponsible: 'FA', status: 'Compliant' },

  // Domain B: Beneficiary Documentation & Safeguarding Compliance
  { id: 'B.1', domain: 'B', title: 'Beneficiary List Date Validation', description: 'Beneficiary list preparation date MUST fall strictly within project period (Start Date <= List Date <= End Date).', roleResponsible: 'PO', status: 'Compliant' },
  { id: 'B.2', domain: 'B', title: 'Dual Executive Signatures per Page', description: 'Printed names and manual signatures of at least TWO (2) Office Executives MUST be present on EVERY PAGE of beneficiary list.', roleResponsible: 'PO', status: 'Compliant' },
  { id: 'B.3', domain: 'B', title: 'NID Provisioning (> €20 Threshold)', description: 'If donation value exceeds €20 per family, National ID (NID) / FCN copies MUST be collected and verified.', roleResponsible: 'PO', status: 'Compliant' },
  { id: 'B.4', domain: 'B', title: 'NID Scan & Photocopy Quality Audit', description: 'All scanned copies and photocopies of NID cards MUST be checked for visual clarity and legibility.', roleResponsible: 'PO', status: 'Compliant' },
  { id: 'B.5', domain: 'B', title: 'Underaged (<18 Yrs) Signature Prohibition', description: 'STRICT PROHIBITION: Signatures or thumbprints of underaged children (below 18 years) are STRICTLY PROHIBITED on beneficiary sheets.', roleResponsible: 'PO', status: 'Compliant' },
  { id: 'B.6', domain: 'B', title: 'Child Birth Certificate Non-Utilization', description: 'Birth Registration Certificates CANNOT be utilized as signature docs. Parent or Legal Guardian MUST sign/thumbprint with NID.', roleResponsible: 'PO', status: 'Compliant' },

  // Domain C: Timeline Sequencing Compliance
  { id: 'C.1', domain: 'C', title: 'AC Declaration Date Sequencing', description: 'Date of Administrative Cost (AC) Declaration MUST BE BEFORE signature date of Form-7 (Date AC < Date Form-7).', roleResponsible: 'PC', status: 'Compliant' },
  { id: 'C.2', domain: 'C', title: 'Form-7 Post-Period Signature Rule', description: 'Signature date of Form-7 MUST BE AFTER project period end date (Date Form-7 > Project End Date).', roleResponsible: 'PD', status: 'Compliant' },

  // Domain D: Media & Encrypted Vault Compliance
  { id: 'D.1', domain: 'D', title: 'Project Photo Documentation', description: 'Distribution photos documenting beneficiary receipt and official banners displaying IHH and SKB logos compiled.', roleResponsible: 'MO', status: 'Compliant' },
  { id: 'D.2', domain: 'D', title: 'Secure Media & Data Vault Storage', description: 'All raw digital photos, video footage, NID scans, and records archived in password-protected encrypted storage vault.', roleResponsible: 'MO', status: 'Compliant' },
];

export function getDefaultClosingAudit(projectId: string, title = 'Humanitarian Aid Initiative'): ClosingReportWorkingPaper {
  const items = DEFAULT_CLOSING_AUDIT_ITEMS;
  return {
    projectId,
    projectTitle: title,
    ihhPid: `PID 22567`,
    donorName: 'IHH Humanitarian Relief Foundation, Turkey',
    totalBudgetEur: 15000,
    totalBudgetBdt: 1850000,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    acDeclarationDate: '2026-12-25',
    form7SignatureDate: '2027-01-05',
    domainA_financial: items.filter((i) => i.domain === 'A'),
    domainB_safeguarding: items.filter((i) => i.domain === 'B'),
    domainC_timeline: items.filter((i) => i.domain === 'C'),
    domainD_media: items.filter((i) => i.domain === 'D'),
    signOffs: [
      { role: 'Program Officer (PO)', officerName: 'Mizbah Uddin', designation: 'Program & Field Officer', signed: true, signedAt: '2027-01-05 10:30 AM' },
      { role: 'Finance & Accounts (FA)', officerName: 'Daloyar Hassan', designation: 'Financial Auditor', signed: true, signedAt: '2027-01-05 02:15 PM' },
      { role: 'Media Officer (MO)', officerName: 'Muktadir Rahaman', designation: 'IT & Media Manager', signed: true, signedAt: '2027-01-05 04:00 PM' },
      { role: 'Project Coordinator (PC)', officerName: 'Mizbah Uddin', designation: 'Technical Reviewer', signed: true, signedAt: '2027-01-05 05:30 PM' },
      { role: 'Project Director (PD)', officerName: 'Md. Abu Huraira', designation: 'Executive Director', signed: true, signedAt: '2027-01-06 09:00 AM' },
    ],
    isForm7Unlocked: true,
    updatedAt: new Date().toISOString(),
  };
}
