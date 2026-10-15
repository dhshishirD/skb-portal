import { SupportedCurrency } from './multiCurrency';

export type PartnerWorkspaceKey = 
  | 'ALL'
  | 'IHH_SOUTH_ASIA'
  | 'IHH_ADAK_AQIQAH'
  | 'IHH_ORPHAN'
  | 'UMUT_OL'
  | 'MAVI_MARMARA'
  | 'QWCQP';

export interface PartnerWorkspaceInfo {
  key: PartnerWorkspaceKey;
  name: string;
  shortName: string;
  badge: string;
  flag: string;
  country: string;
  headquarters: string;
  focalDesk: string;
  focalEmail: string;
  mandate: string;
  accreditationBadge: string;
  accentBg: string;
}

export const PARTNER_REGISTRY: Record<PartnerWorkspaceKey, PartnerWorkspaceInfo> = {
  ALL: {
    key: 'ALL',
    name: 'Small Kindness Bangladesh — Executive Directorate Master Portal',
    shortName: 'All Partner Desks',
    badge: 'HQ Overview',
    flag: '🏛️',
    country: 'Bangladesh / Global',
    headquarters: 'Dhaka HQ, Bangladesh',
    focalDesk: 'Executive Directorate & Board General Secretariat',
    focalEmail: 'kindnessforbeauty@gmail.com',
    mandate: 'Unified executive oversight of all 6 international donor workspaces, compliance quality-gates, and multi-currency grant tracking.',
    accreditationBadge: 'Directorate General Master Console',
    accentBg: 'bg-slate-900 text-white'
  },
  IHH_SOUTH_ASIA: {
    key: 'IHH_SOUTH_ASIA',
    name: 'IHH Humanitarian Relief Foundation — South Asian Desk',
    shortName: 'IHH South Asia Desk',
    badge: 'IHH South Asia',
    flag: '🇹🇷',
    country: 'Turkey',
    headquarters: 'Fatih, Istanbul, Turkey',
    focalDesk: 'South Asia Regional Relief Bureau',
    focalEmail: 'southasia@ihh.org.tr',
    mandate: 'Regional emergency relief, disaster response, self-development livelihood centers (SDLP / WFS), and community empowerment in Bangladesh.',
    accreditationBadge: 'Bilateral Accredited Partner Desk',
    accentBg: 'bg-blue-900 text-white'
  },
  IHH_ADAK_AQIQAH: {
    key: 'IHH_ADAK_AQIQAH',
    name: 'IHH Humanitarian Relief Foundation — Adak & Aqiqah Department',
    shortName: 'IHH Adak Aqiqah',
    badge: 'IHH Adak Aqiqah',
    flag: '🇹🇷',
    country: 'Turkey',
    headquarters: 'Fatih, Istanbul, Turkey',
    focalDesk: 'Livestock & Food Security Directorate',
    focalEmail: 'adak.aqiqah@ihh.org.tr',
    mandate: 'Sacrificial livestock procurement (20 Cows Project), veterinary health checks, cold-chain packaging, and Form-7 delivery distribution.',
    accreditationBadge: 'Dedicated Livestock & Qurbani Bureau',
    accentBg: 'bg-emerald-900 text-white'
  },
  IHH_ORPHAN: {
    key: 'IHH_ORPHAN',
    name: 'IHH Humanitarian Relief Foundation — Orphan Care Department',
    shortName: 'IHH Orphan Care',
    badge: 'IHH Orphan Care',
    flag: '🇹🇷',
    country: 'Turkey',
    headquarters: 'Fatih, Istanbul, Turkey',
    focalDesk: 'Child Protection & Orphan Sponsorship Desk',
    focalEmail: 'orphan@ihh.org.tr',
    mandate: 'Orphan sponsorship, education kits, clothing distributions, live goats & food baskets for vulnerable families and orphans.',
    accreditationBadge: 'Specialized Child Protection Desk',
    accentBg: 'bg-indigo-900 text-white'
  },
  UMUT_OL: {
    key: 'UMUT_OL',
    name: 'UMUT OL Uluslararası İnsani Yardım Derneği',
    shortName: 'UMUT OL Derneği',
    badge: 'UMUT OL Turkey',
    flag: '🇹🇷',
    country: 'Turkey',
    headquarters: 'Istanbul, Turkey',
    focalDesk: 'International Programs & Water Sanitation Desk',
    focalEmail: 'info@umutol.org.tr',
    mandate: 'Clean drinking water deep tube-wells, community water filtration plants, seasonal food parcels, and community education centers.',
    accreditationBadge: 'Accredited Turkish INGO Desk',
    accentBg: 'bg-cyan-900 text-white'
  },
  MAVI_MARMARA: {
    key: 'MAVI_MARMARA',
    name: 'Mavi Marmara Freedom and Solidarity Association',
    shortName: 'Mavi Marmara Solidarity',
    badge: 'Mavi Marmara',
    flag: '🇹🇷',
    country: 'Turkey',
    headquarters: 'Istanbul, Turkey',
    focalDesk: 'Refugee Relief & Solidarity Missions Bureau',
    focalEmail: 'contact@mavimarmara.org',
    mandate: 'Emergency Rohingya refugee solidarity, vital clinical supplies, emergency food rations, and urgent camp shelter rehabilitation.',
    accreditationBadge: 'International Solidarity Mission Desk',
    accentBg: 'bg-rose-900 text-white'
  },
  QWCQP: {
    key: 'QWCQP',
    name: 'Qatar & World Charity Welfare Program (QWCQP)',
    shortName: 'QWCQP Welfare',
    badge: 'QWCQP International',
    flag: '🌐',
    country: 'International',
    headquarters: 'Doha / International Operations Desk',
    focalDesk: 'Social Protection & Women Empowerment Division',
    focalEmail: 'programs@qwcqp.org',
    mandate: 'Widow sustenance allowances, women vocational sewing machine grants, winter blankets, and emergency relief programs.',
    accreditationBadge: 'Global Humanitarian Welfare Partner',
    accentBg: 'bg-violet-900 text-white'
  }
};

export interface ProjectDocument {
  id: string;
  name: string;
  category: 'MANDATORY_PRIMARY' | 'SPECIAL_AD_HOC';
  fileSize: string;
  status: 'Submitted' | 'Missing' | 'Special Request Pending';
  downloadUrl?: string;
  fileUrl?: string;
  specialReason?: string;
  publishedToDonorWorkspace?: boolean;
  publishedBy?: string;
  publishedAt?: string;
}

export interface SKBDonorGrantProject {
  pid: string;
  title: string;
  category: string;
  partner: string;
  partnerKey: PartnerWorkspaceKey;
  donorLogo: string;
  currency: SupportedCurrency;
  budgetAmount: number;
  spentAmount: number;
  beneficiariesCount: number;
  statusCategory: 'RUNNING' | 'ATTENTION' | 'COMPLETED' | 'ARCHIVED';
  statusLabel: string;
  location: string;
  assignedOfficer: string;
  assignedOfficerEmail: string;
  primaryDocs: ProjectDocument[];
  specialDocs: ProjectDocument[];
}

export const DEFAULT_PARTNER_PROJECTS: SKBDonorGrantProject[] = [
  {
    pid: 'BD-SKB-2026-COW-20',
    title: 'Adak Aqiqa (Sacrificing 20 Cows) for Rohingya Refugees & Needy Host Families',
    category: 'Livestock & Food Security',
    partner: 'IHH Humanitarian Relief Foundation — Adak & Aqiqah Department',
    partnerKey: 'IHH_ADAK_AQIQAH',
    donorLogo: '🇹🇷 IHH Adak',
    currency: 'EUR',
    budgetAmount: 12280,
    spentAmount: 12280,
    beneficiariesCount: 800,
    statusCategory: 'RUNNING',
    statusLabel: 'Form-3 Proposal Approved',
    location: "Cox's Bazar, Ukhiya (Hakim-para & Jamtoli Camps)",
    assignedOfficer: 'Md. Abu Huraira',
    assignedOfficerEmail: 'kindnessforbeauty@gmail.com',
    primaryDocs: [
      { id: 'cow_doc_1', name: 'Form-3 Master Project Charter (Signed).pdf', category: 'MANDATORY_PRIMARY', fileSize: '1.8 MB', status: 'Submitted' },
      { id: 'cow_doc_2', name: 'Form-7 Beneficiary Registry & Distribution Vouchers.pdf', category: 'MANDATORY_PRIMARY', fileSize: '2.4 MB', status: 'Submitted' },
      { id: 'cow_doc_3', name: 'Form-8 Financial Expense Statement & Bank Reconciliations.pdf', category: 'MANDATORY_PRIMARY', fileSize: '980 KB', status: 'Submitted' },
      { id: 'cow_doc_4', name: 'Veterinary Certification & Cow Ear-Tag Health Dossier.pdf', category: 'MANDATORY_PRIMARY', fileSize: '3.1 MB', status: 'Submitted' },
      { id: 'cow_doc_5', name: 'Geotagged Photo Evidence of Livestock Distribution.pdf', category: 'MANDATORY_PRIMARY', fileSize: '5.2 MB', status: 'Submitted' },
      { id: 'cow_doc_6', name: 'NGO Affairs Bureau (NGOAB) FD-6 Project Approval.pdf', category: 'MANDATORY_PRIMARY', fileSize: '1.1 MB', status: 'Submitted' },
      { id: 'cow_doc_7', name: 'Project Completion & Meat Quality Verification Certificate.pdf', category: 'MANDATORY_PRIMARY', fileSize: '850 KB', status: 'Submitted' }
    ],
    specialDocs: []
  },
  {
    pid: 'BD-SKB-2026-LIV-CLO',
    title: 'Distribution of Goats, Clothing & Food Packets for Orphans & Vulnerable Families',
    category: 'Orphan Care & Seasonal Relief',
    partner: 'IHH Humanitarian Relief Foundation — Orphan Care Department',
    partnerKey: 'IHH_ORPHAN',
    donorLogo: '🇹🇷 IHH Orphan',
    currency: 'EUR',
    budgetAmount: 14280,
    spentAmount: 14280,
    beneficiariesCount: 425,
    statusCategory: 'RUNNING',
    statusLabel: 'Proposal & Budget Baseline',
    location: "Cox's Bazar, Ukhiya & Teknaf (Kutupalong, Balukhali, Jamtoli)",
    assignedOfficer: 'Emran Ahmed',
    assignedOfficerEmail: 'emran.ahmed@skb.org.bd',
    primaryDocs: [
      { id: 'goat_doc_1', name: 'Form-3 Master Project Charter (Signed).pdf', category: 'MANDATORY_PRIMARY', fileSize: '1.9 MB', status: 'Submitted' },
      { id: 'goat_doc_2', name: 'Form-7 Orphan Roster with Guardian NID & Birth Records.pdf', category: 'MANDATORY_PRIMARY', fileSize: '3.2 MB', status: 'Submitted' },
      { id: 'goat_doc_3', name: 'Form-9 Reconciled Financial Ledger & Procurement Invoices.pdf', category: 'MANDATORY_PRIMARY', fileSize: '1.3 MB', status: 'Submitted' },
      { id: 'goat_doc_4', name: 'Livestock Veterinary Fitness Clearance.pdf', category: 'MANDATORY_PRIMARY', fileSize: '890 KB', status: 'Submitted' },
      { id: 'goat_doc_5', name: 'Clothing & Educational Kit Distribution Photo Log.pdf', category: 'MANDATORY_PRIMARY', fileSize: '4.6 MB', status: 'Submitted' },
      { id: 'goat_doc_6', name: 'Child Safeguarding & Protection Compliance Report.pdf', category: 'MANDATORY_PRIMARY', fileSize: '1.4 MB', status: 'Submitted' },
      { id: 'goat_doc_7', name: 'NGOAB FD-7 Emergency Clearance Reference.pdf', category: 'MANDATORY_PRIMARY', fileSize: '780 KB', status: 'Submitted' }
    ],
    specialDocs: []
  },
  {
    pid: 'BD-SKB-2026-WFS-SDLP',
    title: 'Women-Friendly Space (Skill Development & Learning Center - WFS 22221)',
    category: 'Self-Development Livelihoods',
    partner: 'IHH Humanitarian Relief Foundation — South Asian Desk',
    partnerKey: 'IHH_SOUTH_ASIA',
    donorLogo: '🇹🇷 IHH South Asia',
    currency: 'EUR',
    budgetAmount: 21415,
    spentAmount: 21415,
    beneficiariesCount: 3200,
    statusCategory: 'COMPLETED',
    statusLabel: 'Final Audited & Closed',
    location: "Cox's Bazar, Ukhiya & Teknaf (Camp 11 / 12)",
    assignedOfficer: 'Daloyar Hassan',
    assignedOfficerEmail: 'daloyar.pro@gmail.com',
    primaryDocs: [
      { id: 'wfs_doc_1', name: 'Form-3 Master Project Charter (WFS 22221).pdf', category: 'MANDATORY_PRIMARY', fileSize: '2.1 MB', status: 'Submitted' },
      { id: 'wfs_doc_2', name: 'Form-7 Trainee Enrollment & Graduation Directory.pdf', category: 'MANDATORY_PRIMARY', fileSize: '4.1 MB', status: 'Submitted' },
      { id: 'wfs_doc_3', name: 'Form-8 Audited Financial Statement & Bank Swift Vouchers.pdf', category: 'MANDATORY_PRIMARY', fileSize: '2.8 MB', status: 'Submitted' },
      { id: 'wfs_doc_4', name: 'Tailoring & Asset Handover Slips.pdf', category: 'MANDATORY_PRIMARY', fileSize: '1.7 MB', status: 'Submitted' },
      { id: 'wfs_doc_5', name: 'High-Resolution Center Activity & Graduation Photos.pdf', category: 'MANDATORY_PRIMARY', fileSize: '6.4 MB', status: 'Submitted' },
      { id: 'wfs_doc_6', name: 'RRRC Camp In-Charge (CiC) Center Operation NOC.pdf', category: 'MANDATORY_PRIMARY', fileSize: '1.2 MB', status: 'Submitted' },
      { id: 'wfs_doc_7', name: 'Official Comprehensive Project Closing Report.pdf', category: 'MANDATORY_PRIMARY', fileSize: '3.5 MB', status: 'Submitted' }
    ],
    specialDocs: []
  },
  {
    pid: 'BD-SKB-2026-UOL-WTR',
    title: 'Clean Drinking Water Deep Tube-Well & Hygiene Station Program',
    category: 'WASH & Community Health',
    partner: 'UMUT OL Uluslararası İnsani Yardım Derneği',
    partnerKey: 'UMUT_OL',
    donorLogo: '🇹🇷 UMUT OL',
    currency: 'EUR',
    budgetAmount: 15000,
    spentAmount: 13500,
    beneficiariesCount: 4500,
    statusCategory: 'RUNNING',
    statusLabel: 'Under Construction & Testing',
    location: 'Satkhira & Bagerhat Coastal Belt',
    assignedOfficer: 'Mizbah Uddin',
    assignedOfficerEmail: 'mizbah.uddin@skb.org.bd',
    primaryDocs: [
      { id: 'uol_doc_1', name: 'Form-3 Water Sanitation Project Charter.pdf', category: 'MANDATORY_PRIMARY', fileSize: '1.5 MB', status: 'Submitted' },
      { id: 'uol_doc_2', name: 'Water Quality Laboratory Testing & Arsenic Clearance.pdf', category: 'MANDATORY_PRIMARY', fileSize: '1.8 MB', status: 'Submitted' },
      { id: 'uol_doc_3', name: 'Civil Engineering Boring & Plaque Construction Ledger.pdf', category: 'MANDATORY_PRIMARY', fileSize: '1.2 MB', status: 'Submitted' },
      { id: 'uol_doc_4', name: 'GPS Geo-Coordinate Mapping of 15 Deep Wells.pdf', category: 'MANDATORY_PRIMARY', fileSize: '950 KB', status: 'Submitted' },
      { id: 'uol_doc_5', name: 'Community Beneficiary Verification Register.pdf', category: 'MANDATORY_PRIMARY', fileSize: '2.1 MB', status: 'Submitted' },
      { id: 'uol_doc_6', name: 'Turkish Donor Marble Plaque Inscription Photos.pdf', category: 'MANDATORY_PRIMARY', fileSize: '4.8 MB', status: 'Submitted' },
      { id: 'uol_doc_7', name: 'NGOAB Clearance & Local Union Council NOC.pdf', category: 'MANDATORY_PRIMARY', fileSize: '1.0 MB', status: 'Submitted' }
    ],
    specialDocs: []
  },
  {
    pid: 'BD-SKB-2026-MVM-REF',
    title: 'Rohingya Refugee Emergency Food Rations & Medical Solidarity Clinic',
    category: 'Emergency Relief & Solidarity',
    partner: 'Mavi Marmara Freedom and Solidarity Association',
    partnerKey: 'MAVI_MARMARA',
    donorLogo: '🇹🇷 Mavi Marmara',
    currency: 'USD',
    budgetAmount: 40000,
    spentAmount: 38200,
    beneficiariesCount: 6000,
    statusCategory: 'RUNNING',
    statusLabel: 'Active Distribution',
    location: 'Cox\'s Bazar, Ukhia Refugee Camp 4 & Camp 9',
    assignedOfficer: 'Emran Ahmed',
    assignedOfficerEmail: 'emran.ahmed@skb.org.bd',
    primaryDocs: [
      { id: 'mvm_doc_1', name: 'Form-3 Emergency Humanitarian Charter.pdf', category: 'MANDATORY_PRIMARY', fileSize: '2.0 MB', status: 'Submitted' },
      { id: 'mvm_doc_2', name: 'Refugee Family Food Distribution Master Log.pdf', category: 'MANDATORY_PRIMARY', fileSize: '3.9 MB', status: 'Submitted' },
      { id: 'mvm_doc_3', name: 'Medical Clinic Doctor Prescription & Supply Vouchers.pdf', category: 'MANDATORY_PRIMARY', fileSize: '2.4 MB', status: 'Submitted' },
      { id: 'mvm_doc_4', name: 'RRRC Camp Entry & Volunteer Clearance Permit.pdf', category: 'MANDATORY_PRIMARY', fileSize: '1.1 MB', status: 'Submitted' },
      { id: 'mvm_doc_5', name: 'Distribution Point Photo & Video Audit Ledger.pdf', category: 'MANDATORY_PRIMARY', fileSize: '7.1 MB', status: 'Submitted' },
      { id: 'mvm_doc_6', name: 'Form-8 Inter-Bank Swift Reconciliation Memo.pdf', category: 'MANDATORY_PRIMARY', fileSize: '1.3 MB', status: 'Submitted' },
      { id: 'mvm_doc_7', name: 'Interim Monitoring & Field Evaluation Report.pdf', category: 'MANDATORY_PRIMARY', fileSize: '1.6 MB', status: 'Submitted' }
    ],
    specialDocs: []
  },
  {
    pid: 'BD-SKB-2026-QWC-WLF',
    title: 'Widow Sustenance & Women Livelihood Empowerment Initiative',
    category: 'Social Protection & Welfare',
    partner: 'Qatar & World Charity Welfare Program (QWCQP)',
    partnerKey: 'QWCQP',
    donorLogo: '🌐 QWCQP',
    currency: 'USD',
    budgetAmount: 22000,
    spentAmount: 22000,
    beneficiariesCount: 850,
    statusCategory: 'RUNNING',
    statusLabel: 'Beneficiary Asset Handover',
    location: 'Rangpur & Kurigram Rural Unions',
    assignedOfficer: 'Daloyar Hassan',
    assignedOfficerEmail: 'daloyar.pro@gmail.com',
    primaryDocs: [
      { id: 'qwc_doc_1', name: 'Form-3 Welfare Project Charter.pdf', category: 'MANDATORY_PRIMARY', fileSize: '1.7 MB', status: 'Submitted' },
      { id: 'qwc_doc_2', name: 'Widow Household Vulnerability Assessment Register.pdf', category: 'MANDATORY_PRIMARY', fileSize: '2.8 MB', status: 'Submitted' },
      { id: 'qwc_doc_3', name: 'Sewing Machine & Grant Handover Acknowledgements.pdf', category: 'MANDATORY_PRIMARY', fileSize: '3.4 MB', status: 'Submitted' },
      { id: 'qwc_doc_4', name: 'Form-9 Financial Ledger & Vendor Invoices.pdf', category: 'MANDATORY_PRIMARY', fileSize: '1.5 MB', status: 'Submitted' },
      { id: 'qwc_doc_5', name: 'High-Res Asset Distribution & Training Photos.pdf', category: 'MANDATORY_PRIMARY', fileSize: '5.9 MB', status: 'Submitted' },
      { id: 'qwc_doc_6', name: 'Local Administration & Union Parishad Endorsements.pdf', category: 'MANDATORY_PRIMARY', fileSize: '1.2 MB', status: 'Submitted' },
      { id: 'qwc_doc_7', name: 'Final Social Impact & Empowerment Evaluation.pdf', category: 'MANDATORY_PRIMARY', fileSize: '2.1 MB', status: 'Submitted' }
    ],
    specialDocs: []
  }
];
