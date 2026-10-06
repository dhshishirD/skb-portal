export interface CharterMetadata {
  projectTitle: string;
  projectCode: string;
  donorName: string;
  grantNumber: string;
  ngoabRef: string;
  rrrcRef: string;
  leadDepartment: string;
  version: string;
  startDate: string;
  endDate: string;
  durationMonths: number;
}

export interface CharterNarrative {
  executiveSummary: string;
  keyOutput1: string;
  keyOutput2: string;
  keyOutput3: string;
}

export interface SectorScopeItem {
  id: string;
  name: string;
  selected: boolean;
  activityDetails: string;
}

export interface LocationMappingItem {
  division: string;
  district: string;
  upazila: string;
  union: string;
  campId?: string;
  gpsLat: string;
  gpsLng: string;
}

export interface BeneficiaryTargetMatrix {
  hostMale: number;
  hostFemale: number;
  hostBoys: number;
  hostGirls: number;
  hostPwd: number;
  hostTotalIndividuals: number;
  hostTotalHouseholds: number;
  rohingyaMale: number;
  rohingyaFemale: number;
  rohingyaBoys: number;
  rohingyaGirls: number;
  rohingyaPwd: number;
  rohingyaTotalIndividuals: number;
  rohingyaTotalHouseholds: number;
  orphanTotal: number;
}

export interface GovernancePersonnel {
  role: string;
  name: string;
  title: string;
  dutyStation: string;
  phone: string;
  email: string;
}

export interface CharterBudgetLine {
  category: string;
  approvedDonorCurrency: number;
  approvedBdt: number;
  actualSpentBdt: number;
  varianceBdt: number;
  status: string;
}

export interface RACIMatrixItem {
  domain: string;
  pd: 'R' | 'A' | 'C' | 'I';
  pm: 'R' | 'A' | 'C' | 'I';
  finance: 'R' | 'A' | 'C' | 'I';
  procure: 'R' | 'A' | 'C' | 'I';
  it: 'R' | 'A' | 'C' | 'I';
  media: 'R' | 'A' | 'C' | 'I';
  meal: 'R' | 'A' | 'C' | 'I';
  field: 'R' | 'A' | 'C' | 'I';
}

export interface CharterSignOff {
  role: 'Project Director (PD)' | 'Project Manager (PM)' | 'Head of Finance' | 'Head of Procurement';
  officerName: string;
  signed: boolean;
  signedAt?: string;
}

export interface MasterProjectCharter {
  projectId: string;
  metadata: CharterMetadata;
  narrative: CharterNarrative;
  sectors: SectorScopeItem[];
  location: LocationMappingItem;
  beneficiaries: BeneficiaryTargetMatrix;
  personnel: GovernancePersonnel[];
  budgetLines: CharterBudgetLine[];
  raci: RACIMatrixItem[];
  signOffs: CharterSignOff[];
  isLocked: boolean;
  updatedAt: string;
}

const DEFAULT_SECTORS: SectorScopeItem[] = [
  { id: 'sec-1', name: 'Health & Medical Care', selected: false, activityDetails: '' },
  { id: 'sec-2', name: 'WASH (Water, Sanitation & Hygiene)', selected: true, activityDetails: 'Deep tube wells, latrines, hygiene kits' },
  { id: 'sec-3', name: 'Education & Children School', selected: false, activityDetails: '' },
  { id: 'sec-4', name: 'Vocational Training', selected: false, activityDetails: '' },
  { id: 'sec-5', name: 'Ramadan Food Support Program', selected: false, activityDetails: '' },
  { id: 'sec-6', name: 'Qurbani Meat Program', selected: false, activityDetails: '' },
  { id: 'sec-7', name: 'Seasonal Program (Winter/Emergency)', selected: false, activityDetails: '' },
  { id: 'sec-8', name: 'Income Generating Projects (IGP)', selected: true, activityDetails: 'Small business grants, cows, sewing machines' },
  { id: 'sec-9', name: 'Accommodation / Shelter', selected: false, activityDetails: '' },
  { id: 'sec-10', name: 'Orphan Sponsoring Program', selected: false, activityDetails: '' },
];

const DEFAULT_RACI: RACIMatrixItem[] = [
  { domain: 'Project Charter & Proposal Finalization', pd: 'A', pm: 'R', finance: 'C', procure: 'C', it: 'I', media: 'I', meal: 'C', field: 'I' },
  { domain: 'Government / NGOAB / RRRC Clearance', pd: 'A', pm: 'R', finance: 'C', procure: 'I', it: 'I', media: 'I', meal: 'I', field: 'C' },
  { domain: 'Beneficiary Registration & NID DB', pd: 'I', pm: 'A', finance: 'I', procure: 'I', it: 'R', media: 'I', meal: 'C', field: 'R' },
  { domain: 'Procurement & Goods Inspection', pd: 'I', pm: 'A', finance: 'C', procure: 'R', it: 'I', media: 'I', meal: 'I', field: 'C' },
  { domain: 'Field Activity Execution & Site Safety', pd: 'I', pm: 'A', finance: 'I', procure: 'I', it: 'I', media: 'I', meal: 'C', field: 'R' },
  { domain: 'Financial Disbursement & Voucher Audit', pd: 'A', pm: 'C', finance: 'R', procure: 'C', it: 'I', media: 'I', meal: 'I', field: 'I' },
  { domain: 'Case Studies, Photos & Media Stories', pd: 'I', pm: 'C', finance: 'I', procure: 'I', it: 'I', media: 'R', meal: 'C', field: 'R' },
  { domain: 'Progress Reporting & Donor Submissions', pd: 'A', pm: 'R', finance: 'C', procure: 'I', it: 'I', media: 'C', meal: 'C', field: 'I' },
];

export function getDefaultCharter(projectId: string, title = 'Humanitarian Aid Initiative'): MasterProjectCharter {
  return {
    projectId,
    metadata: {
      projectTitle: title,
      projectCode: `BD-SKB-2026-${projectId.substring(0, 6).toUpperCase()}`,
      donorName: 'IHH Humanitarian Relief Foundation, Turkey',
      grantNumber: 'GRANT-2026-IHH-992',
      ngoabRef: 'NGOAB FD-6 #2938/2026',
      rrrcRef: 'RRRC/CXB/2026/PERMIT-11',
      leadDepartment: 'Programs & Field Operations',
      version: '1.0 Approved Baseline',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      durationMonths: 12,
    },
    narrative: {
      executiveSummary: 'This master project charter establishes the strategic rationale, location mapping, multi-currency budget framework, and governance rules for SKB humanitarian interventions.',
      keyOutput1: 'Provision of clean drinking water through 5 deep tube wells and 20 latrine units in Sylhet rural districts.',
      keyOutput2: 'Distribution of Income Generating Assets (cows, goats, sewing machines) to 120 vulnerable women.',
      keyOutput3: 'Quarterly monitoring, beneficiary NID safeguarding audit, and 100% Form-7 compliance reporting.',
    },
    sectors: DEFAULT_SECTORS,
    location: {
      division: 'Sylhet',
      district: 'Sylhet & Kurigram',
      upazila: 'Gowainghat / Nageshwari',
      union: 'Rural Unions',
      campId: 'N/A (Host Community)',
      gpsLat: '24.8949',
      gpsLng: '91.8687',
    },
    beneficiaries: {
      hostMale: 240,
      hostFemale: 360,
      hostBoys: 120,
      hostGirls: 140,
      hostPwd: 15,
      hostTotalIndividuals: 860,
      hostTotalHouseholds: 120,
      rohingyaMale: 0,
      rohingyaFemale: 0,
      rohingyaBoys: 0,
      rohingyaGirls: 0,
      rohingyaPwd: 0,
      rohingyaTotalIndividuals: 0,
      rohingyaTotalHouseholds: 0,
      orphanTotal: 25,
    },
    personnel: [
      { role: 'Project Director (PD)', name: 'Md. Abu Huraira', title: 'Executive Director', dutyStation: 'SKB HQ Dhaka', phone: '+8801711000000', email: 'huraira@skb.org.bd' },
      { role: 'Project Manager (PM)', name: 'Mizbah Uddin', title: 'Executive Officer & Tech Operations', dutyStation: 'SKB HQ / Field', phone: '+8801722000000', email: 'uddinmizbah902@gmail.com' },
      { role: 'Finance Personnel', name: 'Daloyar Hassan', title: 'Senior Accounts Auditor', dutyStation: 'SKB HQ Dhaka', phone: '+8801733000000', email: 'daloyar@skb.org.bd' },
      { role: 'Media & IT Personnel', name: 'Muktadir Rahaman', title: 'IT & Media Manager', dutyStation: 'SKB HQ Dhaka', phone: '+8801744000000', email: 'muktadir@skb.org.bd' },
    ],
    budgetLines: [
      { category: '1. Direct Relief & Hardware / Items', approvedDonorCurrency: 125000, approvedBdt: 14750000, actualSpentBdt: 14750000, varianceBdt: 0, status: '100% Disbursed' },
      { category: '2. Beneficiary Support & Grants', approvedDonorCurrency: 15000, approvedBdt: 1770000, actualSpentBdt: 1770000, varianceBdt: 0, status: '100% Disbursed' },
      { category: '3. Personnel & Field Staff Salaries', approvedDonorCurrency: 8000, approvedBdt: 944000, actualSpentBdt: 944000, varianceBdt: 0, status: 'Completed' },
      { category: '4. Logistics, Travel & Transport', approvedDonorCurrency: 4000, approvedBdt: 472000, actualSpentBdt: 472000, varianceBdt: 0, status: 'Completed' },
      { category: '5. MEAL, Media & IT Operations', approvedDonorCurrency: 2000, approvedBdt: 236000, actualSpentBdt: 236000, varianceBdt: 0, status: 'Completed' },
      { category: '6. Administrative Overhead', approvedDonorCurrency: 3000, approvedBdt: 354000, actualSpentBdt: 354000, varianceBdt: 0, status: 'Completed' },
    ],
    raci: DEFAULT_RACI,
    signOffs: [
      { role: 'Project Director (PD)', officerName: 'Md. Abu Huraira', signed: true, signedAt: '2026-01-05' },
      { role: 'Project Manager (PM)', officerName: 'Mizbah Uddin', signed: true, signedAt: '2026-01-05' },
      { role: 'Head of Finance', officerName: 'Daloyar Hassan', signed: true, signedAt: '2026-01-05' },
      { role: 'Head of Procurement', officerName: 'Mizbah Uddin', signed: true, signedAt: '2026-01-05' },
    ],
    isLocked: true,
    updatedAt: new Date().toISOString(),
  };
}
