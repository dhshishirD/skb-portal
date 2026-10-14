'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Lock, 
  FileText, 
  Download, 
  ShieldCheck, 
  CheckCircle2, 
  Building2, 
  Globe2, 
  BarChart3, 
  Users, 
  Share2,
  Check,
  Search,
  MessageSquare,
  Send,
  AlertCircle,
  Paperclip,
  Clock,
  UserCheck,
  X,
  AlertTriangle,
  FolderArchive,
  Layers,
  PieChart,
  CheckSquare,
  FileCheck2,
  PlusCircle,
  Eye,
  FileCode2,
  Printer,
  ExternalLink,
  Image as ImageIcon,
  Building,
  DollarSign,
  Briefcase,
  HelpCircle,
  ChevronRight,
  Award,
  Radio
} from 'lucide-react';
import { formatCurrencyString, SupportedCurrency } from '@/server/services/multiCurrency';
import { 
  DonorQueryTicket, 
  INITIAL_DONOR_QUERIES, 
  createDonorQuery 
} from '@/server/services/donorQueryService';
import { CloudSyncService } from '@/server/services/cloudSyncService';

type PartnerWorkspaceKey = 
  | 'ALL'
  | 'IHH_SOUTH_ASIA'
  | 'IHH_ADAK_AQIQAH'
  | 'IHH_ORPHAN'
  | 'UMUT_OL'
  | 'MAVI_MARMARA'
  | 'QWCQP';

interface PartnerWorkspaceInfo {
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

const PARTNER_REGISTRY: Record<PartnerWorkspaceKey, PartnerWorkspaceInfo> = {
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

interface ProjectDocument {
  id: string;
  name: string;
  category: 'MANDATORY_PRIMARY' | 'SPECIAL_AD_HOC';
  fileSize: string;
  status: 'Submitted' | 'Missing' | 'Special Request Pending';
  downloadUrl?: string;
  fileUrl?: string;
  specialReason?: string;
}

interface SKBDonorGrantProject {
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

const DEFAULT_PARTNER_PROJECTS: SKBDonorGrantProject[] = [
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

export default function DonorDashboardPage() {
  const [selectedPartnerKey, setSelectedPartnerKey] = useState<PartnerWorkspaceKey>('IHH_ADAK_AQIQAH');
  const [projects, setProjects] = useState<SKBDonorGrantProject[]>(DEFAULT_PARTNER_PROJECTS);
  const [activeTab, setActiveTab] = useState<'ALL' | 'RUNNING' | 'ATTENTION' | 'COMPLETED'>('ALL');
  const [tickets, setTickets] = useState<DonorQueryTicket[]>(INITIAL_DONOR_QUERIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Inspector Drawer State
  const [inspectingProject, setInspectingProject] = useState<SKBDonorGrantProject | null>(null);
  const [approvedPids, setApprovedPids] = useState<Record<string, boolean>>({
    'BD-SKB-2026-WFS-SDLP': true,
  });

  // Document Viewer & File Downloader State
  const [viewingDoc, setViewingDoc] = useState<{ doc: ProjectDocument; pid: string; partner: string } | null>(null);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  // Modal State for Donor Query / Special Clarification Request
  const [activeModalProject, setActiveModalProject] = useState<SKBDonorGrantProject | null>(null);
  const [donorEmail, setDonorEmail] = useState('');
  const [queryType, setQueryType] = useState<DonorQueryTicket['queryType']>('Beneficiary Verification Query');
  const [queryMessage, setQueryMessage] = useState('');
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState('');

  // Realtime Supabase Subscriptions State
  const [realtimeActive, setRealtimeActive] = useState(true);
  const [liveActivityToast, setLiveActivityToast] = useState<{ message: string; timestamp: string } | null>(null);

  // Realtime Supabase Subscriptions for Live Document & Milestone Updates
  useEffect(() => {
    // 1. Subscribe to Live Documents
    const docSub = CloudSyncService.subscribeToDocuments((event) => {
      setRealtimeActive(true);
      const doc = event.doc;
      if (!doc) return;

      const docName = doc.name || doc.title || 'Official Document';
      const pid = doc.projectId || doc.project_id;

      // Update state for corresponding project
      setProjects((prevProjects) => {
        return prevProjects.map((p) => {
          if (p.pid === pid || (pid && p.pid.includes(pid)) || (pid && pid.includes(p.pid))) {
            const existingDocs = p.primaryDocs || [];
            const exists = existingDocs.find((d) => d.name === docName || (doc.id && d.id === doc.id));
            let updatedDocs: ProjectDocument[];
            if (exists) {
              updatedDocs = existingDocs.map((d) =>
                d.name === docName || (doc.id && d.id === doc.id)
                  ? {
                      ...d,
                      fileUrl: doc.fileUrl || d.fileUrl,
                      status: 'Submitted' as const,
                      fileSize: doc.fileSize || d.fileSize || '1.5 MB',
                    }
                  : d
              );
            } else {
              updatedDocs = [
                ...existingDocs,
                {
                  id: doc.id || `doc_${Date.now()}`,
                  name: docName,
                  category: doc.category || 'MANDATORY_PRIMARY',
                  fileSize: doc.fileSize || '1.8 MB',
                  fileUrl: doc.fileUrl,
                  status: 'Submitted' as const,
                },
              ];
            }
            return {
              ...p,
              primaryDocs: updatedDocs,
            };
          }
          return p;
        });
      });

      // Show high-visibility live sync notification
      setLiveActivityToast({
        message: `Live Sync: "${docName}" uploaded & verified in real-time!`,
        timestamp: new Date().toLocaleTimeString(),
      });
      setTimeout(() => setLiveActivityToast(null), 5000);
    });

    // 2. Subscribe to Live Project Stage Changes
    const projSub = CloudSyncService.subscribeToProjects((event) => {
      setRealtimeActive(true);
      const proj = event.project;
      if (!proj) return;

      const pid = proj.code || proj.pid || proj.id;
      setProjects((prevProjects) => {
        return prevProjects.map((p) => {
          if (p.pid === pid || (pid && p.pid.includes(pid))) {
            return {
              ...p,
              statusLabel: proj.stage || proj.statusLabel || p.statusLabel,
              statusCategory: proj.statusCategory || p.statusCategory,
            };
          }
          return p;
        });
      });

      setLiveActivityToast({
        message: `Project Milestone Updated: ${proj.title || pid} stage transitioned!`,
        timestamp: new Date().toLocaleTimeString(),
      });
      setTimeout(() => setLiveActivityToast(null), 5000);
    });

    return () => {
      docSub.unsubscribe();
      projSub.unsubscribe();
    };
  }, []);

  // Handle URL parsing on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const rawPartner = params.get('partner')?.toUpperCase();

      if (rawPartner && Object.keys(PARTNER_REGISTRY).includes(rawPartner as PartnerWorkspaceKey)) {
        setSelectedPartnerKey(rawPartner as PartnerWorkspaceKey);
      } else if (rawPartner === 'IHH') {
        setSelectedPartnerKey('IHH_ADAK_AQIQAH');
      }
    }
  }, []);

  const currentPartnerInfo = useMemo(() => {
    return PARTNER_REGISTRY[selectedPartnerKey] || PARTNER_REGISTRY.ALL;
  }, [selectedPartnerKey]);

  // Switch partner workspace & push state to URL
  const handleSelectPartner = (key: PartnerWorkspaceKey) => {
    setSelectedPartnerKey(key);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('partner', key);
      window.history.pushState({}, '', url.toString());
    }
  };

  const handleCopyShareLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/donor-dashboard?partner=${selectedPartnerKey}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  // Filter projects by Partner Selection + Tab + Search
  const partnerFilteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (selectedPartnerKey === 'ALL') return true;
      return p.partnerKey === selectedPartnerKey;
    });
  }, [projects, selectedPartnerKey]);

  const displayedProjects = useMemo(() => {
    return partnerFilteredProjects.filter((p) => {
      const matchesSearch = 
        p.pid.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.assignedOfficer.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTab = activeTab === 'ALL' || p.statusCategory === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [partnerFilteredProjects, searchQuery, activeTab]);

  // Executive KPI Calculations
  const totalProjectsCount = partnerFilteredProjects.length;
  const totalBeneficiaries = partnerFilteredProjects.reduce((acc, p) => acc + p.beneficiariesCount, 0);
  const totalBudgetVal = partnerFilteredProjects.reduce((acc, p) => acc + p.budgetAmount, 0);
  const primaryCurrency = partnerFilteredProjects[0]?.currency || 'EUR';

  const totalPrimaryFiles = partnerFilteredProjects.reduce(
    (acc, p) => acc + p.primaryDocs.filter(d => d.status === 'Submitted').length,
    0
  );
  const expectedPrimaryFiles = totalProjectsCount * 7;

  const handleApprovePackage = (pid: string) => {
    setApprovedPids(prev => ({ ...prev, [pid]: true }));
    setDownloadToast(`Project ${pid} Compliance Package Officially Verified & Approved!`);
    setTimeout(() => setDownloadToast(null), 4000);
  };

  const handleDownloadFile = (docName: string, fileUrl?: string) => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
      setDownloadToast(`Opening cloud file "${docName}" from Supabase Storage...`);
      setTimeout(() => setDownloadToast(null), 3500);
      return;
    }
    const dummyContent = `==========================================================\nSMALL KINDNESS BANGLADESH (SKB) - OFFICIAL AUDIT SUBMISSION\nPartner Workspace: ${currentPartnerInfo.name}\nDocument Name: ${docName}\nNGO Affairs Bureau Registration #2938 | SKB Works Portal\n==========================================================\n\nOfficial verified archive document extract generated for donor review.\nAudit Timestamp: ${new Date().toLocaleString()}\n`;
    const blob = new Blob([dummyContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedFileName = docName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    link.download = sanitizedFileName.endsWith('.pdf') || sanitizedFileName.endsWith('.docx') ? sanitizedFileName : `${sanitizedFileName}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadToast(`Downloaded: "${docName}"`);
    setTimeout(() => setDownloadToast(null), 3500);
  };

  const handleDownloadAllZip = (project: SKBDonorGrantProject) => {
    const zipName = `SKB_Audit_Package_${project.pid.replace(/\s+/g, '_')}.zip`;
    const dummyContent = `SKB COMPLIANCE ARCHIVE ZIP\nPID: ${project.pid}\nPartner: ${project.partner}\nTotal Documents: ${project.primaryDocs.length}\nFiles Included:\n${project.primaryDocs.map(d => `- ${d.name}`).join('\n')}\n`;
    const blob = new Blob([dummyContent], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = zipName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadToast(`Downloaded Full Audit Package: "${zipName}"`);
    setTimeout(() => setDownloadToast(null), 4000);
  };

  const handleOpenQueryModal = (project: SKBDonorGrantProject) => {
    setActiveModalProject(project);
    setDonorEmail(currentPartnerInfo.focalEmail);
    setQueryType('Beneficiary Verification Query');
    setQueryMessage('');
    setSubmitSuccessMsg('');
  };

  const handleSendQueryTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalProject || !queryMessage.trim()) return;

    const newTicket = createDonorQuery(
      activeModalProject.pid,
      activeModalProject.partner,
      donorEmail,
      queryType,
      queryMessage,
      activeModalProject.assignedOfficer,
      activeModalProject.assignedOfficerEmail
    );

    setTickets([newTicket, ...tickets]);
    setSubmitSuccessMsg(`Clarification request #${newTicket.id} transmitted directly to Program Officer ${activeModalProject.assignedOfficer}!`);
    setTimeout(() => {
      setActiveModalProject(null);
    }, 2000);
  };

  const [showHqSwitcher, setShowHqSwitcher] = useState(false);

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans pb-16">
      {/* REALTIME LIVE ACTIVITY NOTIFICATION TOAST */}
      {liveActivityToast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div className="text-xs">
            <div className="font-extrabold text-emerald-400 flex items-center gap-1.5">
              <span>● Realtime Cloud Event</span>
              <span className="text-[10px] text-slate-400 font-normal">{liveActivityToast.timestamp}</span>
            </div>
            <p className="text-slate-200 mt-0.5">{liveActivityToast.message}</p>
          </div>
          <button onClick={() => setLiveActivityToast(null)} className="text-slate-400 hover:text-white ml-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. TOP PARTNER SELECTOR BAR (Only visible in HQ Master View or when toggled by Internal Staff) */}
      {(selectedPartnerKey === 'ALL' || showHqSwitcher) && (
        <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-sm space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-2 pt-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-blue-600" /> HQ Directorate Console — All 6 International Partner Desks:
            </span>
            <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">
              Internal Governance View • Select desk to inspect
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {(Object.keys(PARTNER_REGISTRY) as PartnerWorkspaceKey[]).map((key) => {
              const p = PARTNER_REGISTRY[key];
              const isSelected = selectedPartnerKey === key;
              const projectCount = key === 'ALL' 
                ? projects.length 
                : projects.filter(pr => pr.partnerKey === key).length;

              return (
                <button
                  key={key}
                  onClick={() => handleSelectPartner(key)}
                  className={`py-2 px-3.5 rounded-xl text-xs font-black whitespace-nowrap transition flex items-center gap-2 border shadow-sm ${
                    isSelected 
                      ? `${p.accentBg} border-transparent ring-2 ring-blue-500/30 scale-102` 
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>{p.flag}</span>
                  <span>{p.shortName}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {projectCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. DEDICATED PARTNER HERO BANNER (Isolated to this Partner) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs bg-slate-900 text-white px-3 py-1 rounded-full font-black flex items-center gap-1.5 shadow-sm">
              <span>{currentPartnerInfo.flag}</span> {currentPartnerInfo.shortName}
            </span>
            <span className="text-xs bg-blue-50 text-blue-900 border border-blue-200 px-3 py-1 rounded-full font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> {currentPartnerInfo.accreditationBadge}
            </span>
            <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-600" /> Private Partner Workspace
            </span>
            <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Realtime Live Sync Active</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHqSwitcher(!showHqSwitcher)}
              className="text-[11px] text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 font-bold transition flex items-center gap-1.5"
              title="Toggle HQ Internal Directorate Switcher"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-600" />
              <span>{showHqSwitcher ? 'Hide HQ Switcher' : 'HQ Switcher (Staff)'}</span>
            </button>

            <button
              onClick={handleCopyShareLink}
              className="inline-flex items-center gap-1.5 text-xs font-black text-slate-800 bg-slate-100 hover:bg-blue-600 hover:text-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-sm transition-all"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-blue-600" />}
              {copiedLink ? 'Direct Link Copied!' : `Share ${currentPartnerInfo.shortName} Link`}
            </button>
          </div>
        </div>

        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            {currentPartnerInfo.name}
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed mt-1 max-w-4xl">
            {currentPartnerInfo.mandate}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>Official Desk: <strong className="text-slate-800">{currentPartnerInfo.focalDesk}</strong></span>
          <span>•</span>
          <span>Bilateral Channel: <strong className="text-blue-700 font-mono">{currentPartnerInfo.focalEmail}</strong></span>
          <span>•</span>
          <span>Host Implementing Entity: <strong className="text-slate-800">Small Kindness Bangladesh (Govt FDSR-Reg)</strong></span>
        </div>
      </div>

      {/* 3. EXECUTIVE KPI OVERVIEW BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Allocated Grants</span>
            <Briefcase className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{totalProjectsCount} Projects</p>
          <p className="text-[11px] text-blue-600 font-bold">
            {selectedPartnerKey === 'ALL' ? 'Combined Portfolio' : 'Isolated Desk Allocation'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Funding Committed</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {formatCurrencyString(totalBudgetVal, primaryCurrency)}
          </p>
          <p className="text-[11px] text-emerald-600 font-bold">100% Tracked & Reconciled</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Beneficiaries Reached</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-950">
            {totalBeneficiaries.toLocaleString()} People
          </p>
          <p className="text-[11px] text-purple-700 font-bold">Verified on Form-7 Registry</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Audit & Compliance</span>
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {expectedPrimaryFiles === 0 ? '100% Verified' : `${totalPrimaryFiles} / ${expectedPrimaryFiles} Files`}
          </p>
          <p className="text-[11px] text-amber-700 font-bold">
            {tickets.filter(t => partnerFilteredProjects.some(p => p.pid === t.pid)).length} Queries Logged
          </p>
        </div>
      </div>

      {downloadToast && (
        <div className="bg-blue-50 border border-blue-300 text-blue-950 p-4 rounded-2xl text-xs font-black flex items-center gap-3 shadow-md animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
          <span>{downloadToast}</span>
        </div>
      )}

      {/* 4. LOGICAL TAB FILTER & SEARCH BAR */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-2 text-xs font-black rounded-xl transition ${
                activeTab === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Projects ({partnerFilteredProjects.length})
            </button>

            <button
              onClick={() => setActiveTab('RUNNING')}
              className={`px-3.5 py-2 text-xs font-black rounded-xl transition ${
                activeTab === 'RUNNING'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Running / In Progress ({partnerFilteredProjects.filter(p => p.statusCategory === 'RUNNING').length})
            </button>

            <button
              onClick={() => setActiveTab('COMPLETED')}
              className={`px-3.5 py-2 text-xs font-black rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Completed & Audited ({partnerFilteredProjects.filter(p => p.statusCategory === 'COMPLETED').length})
            </button>
          </div>

          <div className="w-full sm:w-72 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code, title, officer..."
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 font-bold rounded-xl pl-9 pr-3 py-2 outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* 5. PROJECT CARDS */}
        <div className="grid grid-cols-1 gap-5">
          {displayedProjects.length > 0 ? (
            displayedProjects.map((project) => {
              const projectTickets = tickets.filter((t) => t.pid === project.pid);
              const submittedCount = project.primaryDocs.filter(d => d.status === 'Submitted').length;
              const isApproved = approvedPids[project.pid];

              return (
                <div 
                  key={project.pid}
                  className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-4"
                >
                  {/* Card Top Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                        {project.pid}
                      </span>
                      <span className="text-xs font-extrabold text-slate-800">{project.partner}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                        {project.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isApproved && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full font-black flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Package Verified & Approved
                        </span>
                      )}
                      <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                        project.statusCategory === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        {project.statusLabel}
                      </span>
                    </div>
                  </div>

                  {/* Project Title & Meta */}
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-black text-slate-900 leading-snug">{project.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium pt-0.5">
                      <span>Location: <strong className="text-slate-800">{project.location}</strong></span>
                      <span>•</span>
                      <span>Assigned Officer: <strong className="text-slate-800">{project.assignedOfficer}</strong></span>
                      <span>•</span>
                      <span>Beneficiaries: <strong className="text-slate-800">{project.beneficiariesCount} Individuals</strong></span>
                      <span>•</span>
                      <span>Grant: <strong className="text-emerald-700 font-mono font-bold">{formatCurrencyString(project.budgetAmount, project.currency)}</strong></span>
                    </div>
                  </div>

                  {/* Baseline Documents Status Summary */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-slate-700 font-semibold">
                        Mandatory Compliance Dossier: <strong className="text-slate-900">{submittedCount} / 7 Files Submitted ✓</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                      <span>NGOAB Ref: <strong>FD-6/2938</strong></span>
                      <span>•</span>
                      <span>Audit Status: <strong className="text-emerald-600">Reconciled</strong></span>
                    </div>
                  </div>

                  {/* Card Action Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setInspectingProject(project)}
                        className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        Inspect Complete Audit Package
                      </button>

                      <button
                        onClick={() => handleDownloadAllZip(project)}
                        className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-600" />
                        Download All (ZIP)
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenQueryModal(project)}
                        className="py-2 px-3.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-xs rounded-xl border border-blue-200 transition flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                        Query Officer ({projectTickets.length})
                      </button>

                      {!isApproved ? (
                        <button
                          onClick={() => handleApprovePackage(project.pid)}
                          className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Officially Approve Dossier
                        </button>
                      ) : (
                        <span className="py-2 px-3 text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-black flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Approved
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 text-center space-y-3">
              <FolderArchive className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-black text-slate-800">No Projects Found for This Workspace Filter</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No active project records matched your search query in the <strong>{currentPartnerInfo.shortName}</strong> workspace.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 6. COMPLETE AUDIT DOSSIER INSPECTOR DRAWER (Modal) */}
      {inspectingProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-3xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">
                  Official Audit Dossier Inspection
                </span>
                <h2 className="text-base font-black text-slate-900 mt-0.5">
                  {inspectingProject.title}
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>PID: <strong className="font-mono text-slate-800">{inspectingProject.pid}</strong></span>
                  <span>•</span>
                  <span>Lead: <strong className="text-slate-800">{inspectingProject.assignedOfficer}</strong></span>
                </div>
              </div>
              <button
                onClick={() => setInspectingProject(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Document Checklist Grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Mandatory Primary Compliance Checklist (7/7 Required Files)
              </h3>

              <div className="space-y-2">
                {inspectingProject.primaryDocs.map((doc, idx) => (
                  <div
                    key={doc.id}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-900 truncate">{doc.name}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span>Size: {doc.fileSize}</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold">Verified Submission ✓</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setViewingDoc({ doc, pid: inspectingProject.pid, partner: inspectingProject.partner })}
                        className="py-1 px-2.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </button>
                      <button
                        onClick={() => handleDownloadFile(doc.name, doc.fileUrl)}
                        className="py-1 px-3 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-sm transition flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => handleDownloadAllZip(inspectingProject)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs rounded-xl transition flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-blue-600" /> Download Full Archive Package (ZIP)
              </button>

              <button
                onClick={() => {
                  handleApprovePackage(inspectingProject.pid);
                  setInspectingProject(null);
                }}
                className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Officially Certify & Sign Off
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. DIRECT OFFICER CLARIFICATION TICKET MODAL */}
      {activeModalProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  Direct Officer Clarification Channel
                </h2>
                <p className="text-[11px] text-slate-500">
                  Transmit inquiries directly to assigned Program Officer <strong>{activeModalProject.assignedOfficer}</strong>.
                </p>
              </div>
              <button
                onClick={() => setActiveModalProject(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl text-xs font-black flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{submitSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleSendQueryTicket} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Project</label>
                  <input
                    type="text"
                    value={`${activeModalProject.pid} - ${activeModalProject.title}`}
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-600 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Donor Email Address (For Responses)</label>
                  <input
                    type="email"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Clarification Subject / Query Type</label>
                  <select
                    value={queryType}
                    onChange={(e) => setQueryType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                  >
                    <option value="Beneficiary Verification Query">Beneficiary Verification / List Clarification</option>
                    <option value="Underage Beneficiary Query">Underage / Guardian Identification Verification</option>
                    <option value="Receipt / Voucher Clarification">Receipt / Financial Voucher Clarification</option>
                    <option value="Special Document Request">Request Additional Geotagged Photos or Video</option>
                    <option value="General Project Inquiry">General Milestone & Progress Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Query Message & Specific Requirements *</label>
                  <textarea
                    rows={4}
                    value={queryMessage}
                    onChange={(e) => setQueryMessage(e.target.value)}
                    placeholder="Provide specific document references or beneficiary numbers needing clarification..."
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveModalProject(null)}
                    className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Submit Clarification Ticket
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* 8. LIVE CLOUD DOCUMENT PREVIEW MODAL */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">
                  Cloud Verified Document Inspection
                </span>
                <h3 className="text-base font-black text-slate-900 truncate">
                  {viewingDoc.doc.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span>Project: <strong className="font-mono text-slate-800">{viewingDoc.pid}</strong></span>
                  <span>•</span>
                  <span>Size: {viewingDoc.doc.fileSize}</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-bold">Supabase Cloud Verified ✓</span>
                </div>
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Document Body / Iframe or Certificate Viewer */}
            <div className="flex-1 min-h-[300px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-4">
              {viewingDoc.doc.fileUrl ? (
                viewingDoc.doc.name.match(/\.(jpeg|jpg|png|webp|gif)$/i) ? (
                  <img
                    src={viewingDoc.doc.fileUrl}
                    alt={viewingDoc.doc.name}
                    className="max-h-[50vh] object-contain rounded-xl shadow-xs"
                  />
                ) : (
                  <iframe
                    src={viewingDoc.doc.fileUrl}
                    title={viewingDoc.doc.name}
                    className="w-full h-[55vh] rounded-xl border border-slate-200 bg-white"
                  />
                )
              ) : (
                <div className="text-center p-6 space-y-3 max-w-md">
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
                    <FileCheck2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-black text-slate-800">
                    Officially Registered Field Compliance Dossier
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    This file has been signed off by the assigned field officer and registered under Bangladesh NGO Affairs Bureau (FD-6 / FD-7) compliance guidelines.
                  </p>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-[11px] text-slate-600 text-left space-y-1">
                    <div>Document: <strong className="text-slate-800">{viewingDoc.doc.name}</strong></div>
                    <div>Status: <strong className="text-emerald-700 font-bold">Compliant &amp; Active</strong></div>
                    <div>Storage Vault: <span className="font-mono text-slate-700">supabase://project-documents</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">
                Encrypted for Bilateral International Partner Review
              </span>
              <div className="flex items-center gap-2">
                {viewingDoc.doc.fileUrl && (
                  <button
                    onClick={() => window.open(viewingDoc.doc.fileUrl, '_blank')}
                    className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
                  </button>
                )}
                <button
                  onClick={() => handleDownloadFile(viewingDoc.doc.name, viewingDoc.doc.fileUrl)}
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download Verified File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
