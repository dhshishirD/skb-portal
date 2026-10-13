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

export const DEFAULT_SECTORS: SectorScopeItem[] = [
  { id: 'sec-1', name: 'Health & Medical Care', selected: false, activityDetails: '' },
  { id: 'sec-2', name: 'WASH (Water, Sanitation & Hygiene)', selected: false, activityDetails: '' },
  { id: 'sec-3', name: 'Education & Children School', selected: false, activityDetails: '' },
  { id: 'sec-4', name: 'Vocational Training', selected: false, activityDetails: '' },
  { id: 'sec-5', name: 'Ramadan Food Support Program', selected: false, activityDetails: '' },
  { id: 'sec-6', name: 'Qurbani Meat Program', selected: false, activityDetails: '' },
  { id: 'sec-7', name: 'Seasonal Program (Winter/Emergency)', selected: false, activityDetails: '' },
  { id: 'sec-8', name: 'Income Generating Projects (IGP)', selected: false, activityDetails: '' },
  { id: 'sec-9', name: 'Accommodation / Shelter', selected: false, activityDetails: '' },
  { id: 'sec-10', name: 'Orphan Sponsoring Program', selected: false, activityDetails: '' },
];

export const DEFAULT_RACI: RACIMatrixItem[] = [
  { domain: 'Project Charter & Proposal Finalization', pd: 'A', pm: 'R', finance: 'C', procure: 'C', it: 'I', media: 'I', meal: 'C', field: 'I' },
  { domain: 'Government / NGOAB / RRRC Clearance', pd: 'A', pm: 'R', finance: 'C', procure: 'I', it: 'I', media: 'I', meal: 'I', field: 'C' },
  { domain: 'Beneficiary Registration & NID DB', pd: 'I', pm: 'A', finance: 'I', procure: 'I', it: 'R', media: 'I', meal: 'C', field: 'R' },
  { domain: 'Procurement & Goods Inspection', pd: 'I', pm: 'A', finance: 'C', procure: 'R', it: 'I', media: 'I', meal: 'I', field: 'C' },
  { domain: 'Field Activity Execution & Site Safety', pd: 'I', pm: 'A', finance: 'I', procure: 'I', it: 'I', media: 'I', meal: 'C', field: 'R' },
  { domain: 'Financial Disbursement & Voucher Audit', pd: 'A', pm: 'C', finance: 'R', procure: 'C', it: 'I', media: 'I', meal: 'I', field: 'I' },
  { domain: 'Case Studies, Photos & Media Stories', pd: 'I', pm: 'C', finance: 'I', procure: 'I', it: 'I', media: 'R', meal: 'C', field: 'R' },
  { domain: 'Progress Reporting & Donor Submissions', pd: 'A', pm: 'R', finance: 'C', procure: 'I', it: 'I', media: 'C', meal: 'C', field: 'I' },
];

// PROPOSAL 1: Adak Aqiqa (Sacrificing 20 Cows) - October 2026
export const CHARTER_COW_2026: MasterProjectCharter = {
  projectId: 'P-SKB-2026-COW',
  metadata: {
    projectTitle: 'Adak Aqiqa (Sacrificing Cows) for the Rohingya Refugees, October 2026',
    projectCode: 'BD-SKB-2026-COW-20',
    donorName: 'IHH Humanitarian Relief Foundation, Turkey',
    grantNumber: 'GRANT-IHH-2026-OCT-COW',
    ngoabRef: 'NGOAB FD-6 #2938/2026',
    rrrcRef: 'RRRC/CXB/2026/PERMIT-AQIQA-01',
    leadDepartment: 'Disaster Relief & Qurbani/Aqiqa Program',
    version: '1.0 Form-3 Proposal Baseline',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    durationMonths: 1,
  },
  narrative: {
    executiveSummary: 'Procurement of 20 healthy local cattle, halal slaughtering, hygienic meat processing, and fair distribution of fresh beef packages to 800 vulnerable Rohingya refugee families (400 families in Jamtoli Camp and 400 families in Hakim-para Camp) in Ukhiya, Cox\'s Bazar, addressing acute nutritional deficits and ensuring dignified animal protein intake.',
    keyOutput1: 'Procurement and halal slaughtering of 20 disease-free cattle under veterinary supervision and CiC approval.',
    keyOutput2: 'Hygienic processing, packaging, and distribution of fresh beef parcels to 800 vulnerable refugee households (4,000 individuals).',
    keyOutput3: 'Strict environmental waste management (deep burial pit) and 100% PDM beneficiary verification.',
  },
  sectors: DEFAULT_SECTORS.map((s) => {
    if (s.id === 'sec-6') return { ...s, selected: true, activityDetails: 'Adak Aqiqa Halal Slaughter of 20 Cattle and Fresh Beef Parcels' };
    if (s.id === 'sec-7') return { ...s, selected: true, activityDetails: 'Urgent nutritional food security support for food-insecure refugee families' };
    return { ...s, selected: false };
  }),
  location: {
    division: 'Chattogram',
    district: 'Cox’s Bazar',
    upazila: 'Ukhiya',
    union: 'Palongkhali',
    campId: 'Camp 14 (Hakim-para) & Camp 15 (Jamtoli)',
    gpsLat: '21.1925',
    gpsLng: '92.1488',
  },
  beneficiaries: {
    hostMale: 0,
    hostFemale: 0,
    hostBoys: 0,
    hostGirls: 0,
    hostPwd: 0,
    hostTotalIndividuals: 0,
    hostTotalHouseholds: 0,
    rohingyaMale: 1760,
    rohingyaFemale: 1840,
    rohingyaBoys: 200,
    rohingyaGirls: 200,
    rohingyaPwd: 120,
    rohingyaTotalIndividuals: 4000,
    rohingyaTotalHouseholds: 800,
    orphanTotal: 150,
  },
  personnel: [
    { role: 'Project Director (PD)', name: 'Dr. Orakatul Jannat', title: 'Chairman of the Board of Directors', dutyStation: 'SKB HQ Dhaka', phone: '+880258956123', email: 'info@smallkindnessbd.org' },
    { role: 'General Manager / G. Secretary', name: 'Md. Abu Huraira', title: 'General Secretary & Mission Lead', dutyStation: 'SKB HQ / Cox’s Bazar', phone: '+8801716350626', email: 'kindnessforbeauty@gmail.com' },
    { role: 'Head of Finance & Audit', name: 'Daloyar Hassan', title: 'Senior Accounts Auditor', dutyStation: 'SKB HQ Dhaka', phone: '+8801733000000', email: 'daloyar@skb.org.bd' },
    { role: 'Field Slaughter & Distribution Supervisor', name: 'Mizbah Uddin', title: 'Program Officer (Camp Operations)', dutyStation: 'Cox’s Bazar Field Hub', phone: '+8801722000000', email: 'uddinmizbah902@gmail.com' },
  ],
  budgetLines: [
    { category: '1. Cow Purchase & Halal Slaughter (20 Cattle @ BDT 81,868 / €584.77)', approvedDonorCurrency: 11695.40, approvedBdt: 1637360, actualSpentBdt: 0, varianceBdt: 1637360, status: 'Approved in Form-3' },
    { category: '2. Administrative & Operational Oversight (5%)', approvedDonorCurrency: 584.60, approvedBdt: 81844, actualSpentBdt: 0, varianceBdt: 81844, status: 'Approved in Form-3' },
  ],
  raci: DEFAULT_RACI,
  signOffs: [
    { role: 'Project Director (PD)', officerName: 'Dr. Orakatul Jannat', signed: true, signedAt: '2026-10-08' },
    { role: 'Project Manager (PM)', officerName: 'Md. Abu Huraira', signed: true, signedAt: '2026-10-08' },
    { role: 'Head of Finance', officerName: 'Daloyar Hassan', signed: true, signedAt: '2026-10-08' },
    { role: 'Head of Procurement', officerName: 'Mizbah Uddin', signed: true, signedAt: '2026-10-08' },
  ],
  isLocked: false,
  updatedAt: new Date().toISOString(),
};

// PROPOSAL 2: Goats, Clothing & Food Packets - November 2026
export const CHARTER_GOAT_2026: MasterProjectCharter = {
  projectId: 'P-SKB-2026-GOAT',
  metadata: {
    projectTitle: 'Distribution of Goats, Clothing & Food Packets for Rohingya Refugees (Ankara Nov 2026)',
    projectCode: 'BD-SKB-2026-LIV-CLO',
    donorName: 'IHH Humanitarian Relief Foundation (Ankara, Turkey)',
    grantNumber: 'GRANT-IHH-ANKARA-2026-NOV-01',
    ngoabRef: 'NGOAB FD-6 #2938/2026',
    rrrcRef: 'RRRC/CXB/2026/PERMIT-GOAT-02',
    leadDepartment: 'Livelihoods & Orphan Protection Services',
    version: '1.0 Form-3 Proposal Baseline',
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    durationMonths: 1,
  },
  narrative: {
    executiveSummary: 'Tri-component humanitarian intervention delivering sustainable animal assets (2 healthy female goats + 1-year fodder supply) to 25 vulnerable families for livelihood self-reliance, high-grade cultural/winter clothing sets with shoes to 150 registered orphan children (both boys and girls), and comprehensive family dry food ration parcels to 250 food-insecure refugee families across Kutupalong, Balukhali, and Jamtoli camps in Cox\'s Bazar.',
    keyOutput1: 'Procurement and distribution of 50 vaccinated goats with 1-year animal feed to 25 female-headed refugee households.',
    keyOutput2: 'Distribution of tailored clothing and footwear packages to 150 orphan children (Panjabi/Pajama/Sandal for boys, Salwar/Kameez/Urna/Sandal for girls).',
    keyOutput3: 'Distribution of 250 standard family dry food baskets containing rice, pulses, cooking oil, and dry goods.',
  },
  sectors: DEFAULT_SECTORS.map((s) => {
    if (s.id === 'sec-8') return { ...s, selected: true, activityDetails: '25 Families received 2 goats each with 1-year fodder for household self-reliance' };
    if (s.id === 'sec-10') return { ...s, selected: true, activityDetails: '150 Orphan boys and girls provided tailored dresses and shoes' };
    if (s.id === 'sec-7') return { ...s, selected: true, activityDetails: '250 Family emergency dry food ration parcels distributed' };
    return { ...s, selected: false };
  }),
  location: {
    division: 'Chattogram',
    district: 'Cox’s Bazar',
    upazila: 'Ukhiya & Teknaf',
    union: 'Palongkhali / Whykong',
    campId: 'Kutupalong, Balukhali & Jamtoli Camps',
    gpsLat: '21.2167',
    gpsLng: '92.1625',
  },
  beneficiaries: {
    hostMale: 0,
    hostFemale: 0,
    hostBoys: 0,
    hostGirls: 0,
    hostPwd: 0,
    hostTotalIndividuals: 0,
    hostTotalHouseholds: 0,
    rohingyaMale: 955,
    rohingyaFemale: 1020,
    rohingyaBoys: 75,
    rohingyaGirls: 75,
    rohingyaPwd: 65,
    rohingyaTotalIndividuals: 2125,
    rohingyaTotalHouseholds: 425,
    orphanTotal: 150,
  },
  personnel: [
    { role: 'Project Director (PD)', name: 'Dr. Orakatul Jannat', title: 'Chairman of the Board of Directors', dutyStation: 'SKB HQ Dhaka', phone: '+880258956123', email: 'info@smallkindnessbd.org' },
    { role: 'Project Manager (PM)', name: 'Safwanur Rahman', title: 'Project Manager & Relief Lead', dutyStation: 'Cox’s Bazar Field Hub', phone: '+8801716350626', email: 'info@smallkindnessbd.org' },
    { role: 'General Secretary', name: 'Md. Abu Huraira', title: 'Executive Mission Oversight', dutyStation: 'SKB HQ / Cox’s Bazar', phone: '+8801716350626', email: 'huraira@skb.org.bd' },
    { role: 'Head of Finance & Audit', name: 'Daloyar Hassan', title: 'Accounts & Voucher Review', dutyStation: 'SKB HQ Dhaka', phone: '+8801733000000', email: 'daloyar@skb.org.bd' },
  ],
  budgetLines: [
    { category: '1. Goat Purchasing with 1-Year Feed (25 Families x 2 Goats @ BDT 30,553 / €223)', approvedDonorCurrency: 5575.00, approvedBdt: 763825, actualSpentBdt: 0, varianceBdt: 763825, status: 'Approved in Form-3' },
    { category: '2. Orphan Clothes & Footwear Purchasing (150 Orphans @ BDT 2,310 / €16.90)', approvedDonorCurrency: 2535.00, approvedBdt: 346500, actualSpentBdt: 0, varianceBdt: 346500, status: 'Approved in Form-3' },
    { category: '3. Food Packet Distribution (250 Families @ BDT 3,009 / €21.96)', approvedDonorCurrency: 5490.00, approvedBdt: 752250, actualSpentBdt: 0, varianceBdt: 752250, status: 'Approved in Form-3' },
    { category: '4. Administrative Overhead (5%)', approvedDonorCurrency: 680.00, approvedBdt: 93129, actualSpentBdt: 0, varianceBdt: 93129, status: 'Approved in Form-3' },
  ],
  raci: DEFAULT_RACI,
  signOffs: [
    { role: 'Project Director (PD)', officerName: 'Dr. Orakatul Jannat', signed: true, signedAt: '2026-10-08' },
    { role: 'Project Manager (PM)', officerName: 'Safwanur Rahman', signed: true, signedAt: '2026-10-08' },
    { role: 'Head of Finance', officerName: 'Daloyar Hassan', signed: true, signedAt: '2026-10-08' },
    { role: 'Head of Procurement', officerName: 'Mizbah Uddin', signed: true, signedAt: '2026-10-08' },
  ],
  isLocked: false,
  updatedAt: new Date().toISOString(),
};

// PROPOSAL 3: Women-Friendly Space (WFS Skill Development Center) - Nov 2026 to Apr 2027
export const CHARTER_WFS_2026: MasterProjectCharter = {
  projectId: 'P-SKB-2026-WFS',
  metadata: {
    projectTitle: 'Women-Friendly Space (Skill Development & Learning Center) for Rohingya Refugees 2026',
    projectCode: 'BD-SKB-2026-WFS-SDLP',
    donorName: 'IHH Humanitarian Relief Foundation (Ankara, Turkey)',
    grantNumber: 'GRANT-IHH-ANKARA-2026-WFS-50',
    ngoabRef: 'NGOAB FD-6 #2938/2026',
    rrrcRef: 'RRRC/CXB/2026/PERMIT-WFS-03',
    leadDepartment: 'Gender, Protection & Vocational Training',
    version: '1.0 Form-3 Proposal Baseline',
    startDate: '2026-11-01',
    endDate: '2027-04-30',
    durationMonths: 6,
  },
  narrative: {
    executiveSummary: '6-Month Women-Friendly Space (WFS) & Skill Development Learning Program (SDLP) tailored for 50 female Rohingya refugees (survivors of gender-based violence, widows, and unemployed adolescent girls) in Cox’s Bazar. Delivers 6 months of daily professional tailoring instruction, 3,050 yards of practice/pattern fabric, psychosocial solidarity, and permanent graduation asset handover of 50 heavy-duty sewing machines with comprehensive accessories kits. Includes hosting high-level visiting Ankara IHH delegation in November 2026.',
    keyOutput1: 'Operationalization of 1 fully equipped Women-Friendly Space learning center with qualified master tailoring instructors.',
    keyOutput2: 'Comprehensive 6-month dressmaking and tailoring curriculum for 50 female participants with skills assessment and certificates.',
    keyOutput3: 'Permanent asset handover of 50 new sewing machines with full accessories kits upon graduation for household self-reliance.',
  },
  sectors: DEFAULT_SECTORS.map((s) => {
    if (s.id === 'sec-4') return { ...s, selected: true, activityDetails: '6-Month Tailoring, Dressmaking & Pattern Drafting Certification for 50 Women' };
    if (s.id === 'sec-8') return { ...s, selected: true, activityDetails: 'Handover of 50 Sewing Machines with Full Tool Kits as Productive Assets' };
    return { ...s, selected: false };
  }),
  location: {
    division: 'Chattogram',
    district: 'Cox’s Bazar',
    upazila: 'Ukhiya & Teknaf',
    union: 'Palongkhali',
    campId: 'Camp 11 / Camp 12 (Kutupalong & Balukhali Extension)',
    gpsLat: '21.2125',
    gpsLng: '92.1550',
  },
  beneficiaries: {
    hostMale: 0,
    hostFemale: 0,
    hostBoys: 0,
    hostGirls: 0,
    hostPwd: 0,
    hostTotalIndividuals: 0,
    hostTotalHouseholds: 0,
    rohingyaMale: 0,
    rohingyaFemale: 50,
    rohingyaBoys: 0,
    rohingyaGirls: 20,
    rohingyaPwd: 8,
    rohingyaTotalIndividuals: 50,
    rohingyaTotalHouseholds: 50,
    orphanTotal: 12,
  },
  personnel: [
    { role: 'Project Director (PD)', name: 'Dr. Orakatul Jannat', title: 'Chairman of the Board of Directors', dutyStation: 'SKB HQ Dhaka', phone: '+880258956123', email: 'info@smallkindnessbd.org' },
    { role: 'Project Manager (PM)', name: 'Md. Abu Huraira', title: 'General Secretary & Project Lead', dutyStation: 'SKB HQ / Cox’s Bazar', phone: '+8801318551686', email: 'kindnessforbeauty@gmail.com' },
    { role: 'Finance Officer', name: 'Daloyar Hassan', title: 'Accounts & Expense Monitoring', dutyStation: 'SKB HQ Dhaka', phone: '+8801733000000', email: 'daloyar@skb.org.bd' },
    { role: 'Vocational Center Supervisor', name: 'Mizbah Uddin', title: 'Program Officer (WFS Center)', dutyStation: 'Cox’s Bazar Field Hub', phone: '+8801722000000', email: 'uddinmizbah902@gmail.com' },
  ],
  budgetLines: [
    { category: '1. Sewing Machines & Accessories Kit (50 Units @ BDT 55,885.90 / €407.93)', approvedDonorCurrency: 20396.50, approvedBdt: 2794295, actualSpentBdt: 0, varianceBdt: 2794295, status: 'Approved in Form-3' },
    { category: '2. Administrative & Center Operational Overhead (5%)', approvedDonorCurrency: 1018.50, approvedBdt: 139715, actualSpentBdt: 0, varianceBdt: 139715, status: 'Approved in Form-3' },
  ],
  raci: DEFAULT_RACI,
  signOffs: [
    { role: 'Project Director (PD)', officerName: 'Dr. Orakatul Jannat', signed: true, signedAt: '2026-10-08' },
    { role: 'Project Manager (PM)', officerName: 'Md. Abu Huraira', signed: true, signedAt: '2026-10-08' },
    { role: 'Head of Finance', officerName: 'Daloyar Hassan', signed: true, signedAt: '2026-10-08' },
    { role: 'Head of Procurement', officerName: 'Mizbah Uddin', signed: true, signedAt: '2026-10-08' },
  ],
  isLocked: false,
  updatedAt: new Date().toISOString(),
};

export const FORM3_PROPOSAL_CHARTERS: Record<string, MasterProjectCharter> = {
  'P-SKB-2026-COW': CHARTER_COW_2026,
  'P-SKB-2026-GOAT': CHARTER_GOAT_2026,
  'P-SKB-2026-WFS': CHARTER_WFS_2026,
  // Slugs & Case insensitive keys
  'cow': CHARTER_COW_2026,
  'cows': CHARTER_COW_2026,
  'aqiqa': CHARTER_COW_2026,
  'goat': CHARTER_GOAT_2026,
  'goats': CHARTER_GOAT_2026,
  'wfs': CHARTER_WFS_2026,
  'sdlp': CHARTER_WFS_2026,
};

export function getDefaultCharter(projectId: string, title = 'Humanitarian Aid Initiative'): MasterProjectCharter {
  const normalizedId = (projectId || '').toLowerCase();
  
  if (normalizedId.includes('cow') || normalizedId.includes('aqiqa') || normalizedId === 'p-skb-2026-cow') {
    return { ...CHARTER_COW_2026, projectId };
  }
  if (normalizedId.includes('goat') || normalizedId.includes('cloth') || normalizedId === 'p-skb-2026-goat') {
    return { ...CHARTER_GOAT_2026, projectId };
  }
  if (normalizedId.includes('wfs') || normalizedId.includes('sewing') || normalizedId === 'p-skb-2026-wfs') {
    return { ...CHARTER_WFS_2026, projectId };
  }

  if (FORM3_PROPOSAL_CHARTERS[projectId]) {
    return { ...FORM3_PROPOSAL_CHARTERS[projectId], projectId };
  }

  // Fallback generic charter
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
