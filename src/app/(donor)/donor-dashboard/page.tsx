'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
  Briefcase
} from 'lucide-react';
import { formatCurrencyString, SupportedCurrency } from '@/server/services/multiCurrency';
import { 
  DonorQueryTicket, 
  INITIAL_DONOR_QUERIES, 
  createDonorQuery 
} from '@/server/services/donorQueryService';

interface ProjectDocument {
  id: string;
  name: string;
  category: 'MANDATORY_PRIMARY' | 'SPECIAL_AD_HOC';
  fileSize: string;
  status: 'Submitted' | 'Missing' | 'Special Request Pending';
  downloadUrl?: string;
  specialReason?: string;
}

interface SKBDonorGrantProject {
  pid: string;
  title: string;
  category: 'Income Generation (IGP)' | 'Rohingya Relief' | 'Seasonal Relief' | 'Emergency & Health';
  partner: string;
  partnerKey: 'IHH' | 'UNHCR';
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

const ALL_SKB_DONOR_PROJECTS: SKBDonorGrantProject[] = [
  {
    pid: 'PID 22567',
    title: 'Income Generating Project (IGP): 20 Cows, 60 Goats & 40 Sewing Machines',
    category: 'Income Generation (IGP)',
    partner: 'IHH Humanitarian Relief Foundation',
    partnerKey: 'IHH',
    donorLogo: '🇹🇷',
    currency: 'TRY',
    budgetAmount: 1850000,
    spentAmount: 1850000,
    beneficiariesCount: 120,
    statusCategory: 'ATTENTION',
    statusLabel: 'Needs Attention (Guardian Clarification Letter Attached)',
    location: 'Sylhet & Kurigram Rural Districts',
    assignedOfficer: 'Mizbah Uddin',
    assignedOfficerEmail: 'uddinmizbah902@gmail.com',
    primaryDocs: [
      { id: '1', name: '1. Form-7 Project Completion Report.pdf', category: 'MANDATORY_PRIMARY', fileSize: '3.2 MB', status: 'Submitted' },
      { id: '2', name: '2. Invoice Declaration.pdf', category: 'MANDATORY_PRIMARY', fileSize: '1.3 MB', status: 'Submitted' },
      { id: '3', name: '3. AC Audit Clearance Certificate.pdf', category: 'MANDATORY_PRIMARY', fileSize: '287 KB', status: 'Submitted' },
      { id: '4', name: '4. Verified Beneficiary Master List.pdf', category: 'MANDATORY_PRIMARY', fileSize: '438 KB', status: 'Submitted' },
      { id: '5', name: '5. Beneficiary NID Cards Archive.pdf', category: 'MANDATORY_PRIMARY', fileSize: '18.6 MB', status: 'Submitted' },
      { id: '6', name: '6. High-Res Picture Documentation Album.docx', category: 'MANDATORY_PRIMARY', fileSize: '15 KB', status: 'Submitted' },
      { id: '7', name: '7. Bank Fund Receival Certificate.pdf', category: 'MANDATORY_PRIMARY', fileSize: '217 KB', status: 'Submitted' },
    ],
    specialDocs: [
      { id: 's1', name: 'Special: Underaged Beneficiary Replacement & Guardian Letter.pdf', category: 'SPECIAL_AD_HOC', fileSize: '2.1 MB', status: 'Special Request Pending', specialReason: 'Beneficiary #14 is an orphan child represented by legal guardian/mother Fatema Begum.' },
      { id: 's2', name: 'Special: Orphan Legal Signature Explanation Certificate.pdf', category: 'SPECIAL_AD_HOC', fileSize: '687 KB', status: 'Submitted', specialReason: 'Requested by IHH Audit for thumbprint sign-off.' },
    ],
  },
  {
    pid: 'PID 22211',
    title: 'Income Generating Project (IGP) in Bangladesh 2025',
    category: 'Income Generation (IGP)',
    partner: 'IHH Humanitarian Relief Foundation',
    partnerKey: 'IHH',
    donorLogo: '🇹🇷',
    currency: 'EUR',
    budgetAmount: 7085,
    spentAmount: 7085,
    beneficiariesCount: 85,
    statusCategory: 'COMPLETED',
    statusLabel: 'Completed (100% Audit Verified)',
    location: 'Northern Bangladesh Districts',
    assignedOfficer: 'Mizbah Uddin',
    assignedOfficerEmail: 'uddinmizbah902@gmail.com',
    primaryDocs: [
      { id: '1', name: '1. Form-7 Project Completion Report (PID 22211).pdf', category: 'MANDATORY_PRIMARY', fileSize: '3.2 MB', status: 'Submitted' },
      { id: '2', name: '2. Invoice Declaration (PID 22211).pdf', category: 'MANDATORY_PRIMARY', fileSize: '1.3 MB', status: 'Submitted' },
      { id: '3', name: '3. AC Audit Clearance Certificate (PID 22211).pdf', category: 'MANDATORY_PRIMARY', fileSize: '287 KB', status: 'Submitted' },
      { id: '4', name: '4. Verified Beneficiary Master List (PID 22211).pdf', category: 'MANDATORY_PRIMARY', fileSize: '438 KB', status: 'Submitted' },
      { id: '5', name: '5. Beneficiary NID Cards Archive (PID 22211).pdf', category: 'MANDATORY_PRIMARY', fileSize: '18.6 MB', status: 'Submitted' },
      { id: '6', name: '6. High-Res Picture Documentation Album (PID 22211).docx', category: 'MANDATORY_PRIMARY', fileSize: '15 KB', status: 'Submitted' },
      { id: '7', name: '7. Fund Receival Certificate 7085 EURO.pdf', category: 'MANDATORY_PRIMARY', fileSize: '217 KB', status: 'Submitted' },
    ],
    specialDocs: [
      { id: 's3', name: 'Special: Underaged Beneficiary Replacement (PID 22211).pdf', category: 'SPECIAL_AD_HOC', fileSize: '2.1 MB', status: 'Submitted', specialReason: 'Approved by donor for guardian representation.' },
      { id: 's4', name: 'Special: Orphan Signature Explanation (PID 22211).pdf', category: 'SPECIAL_AD_HOC', fileSize: '687 KB', status: 'Submitted', specialReason: 'Verified by legal officer.' },
    ],
  },
  {
    pid: 'PID 23431',
    title: 'Ramadan Support Program for Rohingya Refugees 2026',
    category: 'Seasonal Relief',
    partner: 'IHH Humanitarian Relief Foundation',
    partnerKey: 'IHH',
    donorLogo: '🇹🇷',
    currency: 'USD',
    budgetAmount: 150000,
    spentAmount: 120000,
    beneficiariesCount: 4500,
    statusCategory: 'RUNNING',
    statusLabel: 'Running (80% Disbursed)',
    location: 'Rohingya Camps, Cox’s Bazar',
    assignedOfficer: 'MD. Emran',
    assignedOfficerEmail: 'emran.rohingya@skb.org.bd',
    primaryDocs: [
      { id: '1', name: '1. Form-7 Interim Distribution Report.pdf', category: 'MANDATORY_PRIMARY', fileSize: '2.4 MB', status: 'Submitted' },
      { id: '2', name: '2. Vendor Quotations & Purchase Orders.pdf', category: 'MANDATORY_PRIMARY', fileSize: '4.1 MB', status: 'Submitted' },
      { id: '3', name: '3. Camp RRRC Permission Certificate.pdf', category: 'MANDATORY_PRIMARY', fileSize: '512 KB', status: 'Submitted' },
      { id: '4', name: '4. Camp 11 Food Ration Register.pdf', category: 'MANDATORY_PRIMARY', fileSize: '1.1 MB', status: 'Submitted' },
      { id: '5', name: '5. Beneficiary Token Archive.pdf', category: 'MANDATORY_PRIMARY', fileSize: '12.4 MB', status: 'Submitted' },
      { id: '6', name: '6. Distribution Site Album.docx', category: 'MANDATORY_PRIMARY', fileSize: '15 KB', status: 'Submitted' },
      { id: '7', name: '7. Bank Grant Receipt 150K USD.pdf', category: 'MANDATORY_PRIMARY', fileSize: '340 KB', status: 'Submitted' },
    ],
    specialDocs: [],
  }
];

export default function DonorDashboardPage() {
  const [projects, setProjects] = useState<SKBDonorGrantProject[]>(ALL_SKB_DONOR_PROJECTS);
  const [activeTab, setActiveTab] = useState<'ALL' | 'RUNNING' | 'ATTENTION' | 'COMPLETED'>('ALL');
  const [tickets, setTickets] = useState<DonorQueryTicket[]>(INITIAL_DONOR_QUERIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Multi-tenant Partner Isolation State (Default to IHH view)
  const [selectedPartnerView, setSelectedPartnerView] = useState<'ALL' | 'IHH' | 'UNHCR'>('IHH');

  // Parse URL query string on mount for partner isolation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const partnerParam = params.get('partner');
      if (partnerParam && partnerParam.toUpperCase() === 'IHH') {
        setSelectedPartnerView('IHH');
      } else if (partnerParam && partnerParam.toUpperCase() === 'UNHCR') {
        setSelectedPartnerView('UNHCR');
      } else if (partnerParam && partnerParam.toUpperCase() === 'ALL') {
        setSelectedPartnerView('ALL');
      }
    }
  }, []);

  // Inspector Drawer State
  const [inspectingProject, setInspectingProject] = useState<SKBDonorGrantProject | null>(null);
  const [approvedPids, setApprovedPids] = useState<Record<string, boolean>>({
    'PID 22211': true, // Pre-approved
  });

  // Document Viewer & File Downloader State
  const [viewingDoc, setViewingDoc] = useState<{ doc: ProjectDocument; pid: string; partner: string } | null>(null);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  // Modal State for Donor Query / Special Document Request
  const [activeModalProject, setActiveModalProject] = useState<SKBDonorGrantProject | null>(null);
  const [donorEmail, setDonorEmail] = useState('audit@ihh.org.tr');
  const [queryType, setQueryType] = useState<DonorQueryTicket['queryType']>('Underage Beneficiary Query');
  const [queryMessage, setQueryMessage] = useState('');
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState('');

  const handleApprovePackage = (pid: string) => {
    setApprovedPids({ ...approvedPids, [pid]: true });
    setDownloadToast(`Project ${pid} Compliance Package Officially Approved & Signed Off!`);
    setTimeout(() => setDownloadToast(null), 4000);
  };

  const handleDownloadFile = (docName: string) => {
    const dummyContent = `==========================================================\nSMALL KINDNESS BANGLADESH (SKB) - OFFICIAL AUDIT SUBMISSION\nDocument Name: ${docName}\nStatus: Official Verified Submission\nNGO Affairs Bureau Registration #2938 | SKB Works Portal\n==========================================================\n\nThis is an official document extract generated by SKB Works Portal.\nVerified for donor audit & compliance.\nTimestamp: ${new Date().toLocaleString()}\n`;
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
    const dummyContent = `SKB COMPLIANCE ARCHIVE ZIP\nPID: ${project.pid}\nPartner: ${project.partner}\nTotal Documents: ${project.primaryDocs.length + project.specialDocs.length}\nFiles Included:\n${project.primaryDocs.map(d => `- ${d.name}`).join('\n')}\n${project.specialDocs.map(d => `- ${d.name}`).join('\n')}\n`;
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

  // Filter projects by Multi-Tenant Partner Selection + Search + Tab
  const tenantFilteredProjects = projects.filter((p) => {
    if (selectedPartnerView === 'IHH') {
      return p.partnerKey === 'IHH' || p.partner.toLowerCase().includes('ihh');
    }
    if (selectedPartnerView === 'UNHCR') {
      return p.partnerKey === 'UNHCR' || p.partner.toLowerCase().includes('unhcr');
    }
    return true; // ALL
  });

  const filteredProjects = tenantFilteredProjects.filter((p) => {
    const matchesSearch = 
      p.pid.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.partner.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'ALL' || p.statusCategory === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}/donor-dashboard?partner=${selectedPartnerView}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleOpenQueryModal = (project: SKBDonorGrantProject) => {
    setActiveModalProject(project);
    setQueryType('Underage Beneficiary Query');
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
    setSubmitSuccessMsg(`Clarification request #${newTicket.id} sent to Program Officer ${activeModalProject.assignedOfficer}!`);
    setTimeout(() => {
      setActiveModalProject(null);
    }, 1800);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* 1. EXECUTIVE DONOR BANNER (Clean Professional Styling) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-900 text-white px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
              <span>🇹🇷</span> IHH Humanitarian Relief Foundation
            </span>
            <span className="text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Verified Partner Audit Hub
            </span>
          </div>

          <button
            onClick={handleCopyShareLink}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 transition-all"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            {copiedLink ? 'Portal Link Copied!' : 'Copy Direct Link'}
          </button>
        </div>

        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            IHH Humanitarian Relief Foundation Partner Workspace
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed mt-1">
            Access verified project baseline compliance packages, Form-7 audit completion reports, and direct field clarification channels for your assigned initiatives in Bangladesh.
          </p>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI OVERVIEW BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Grants Portfolio</span>
            <Briefcase className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">3 Projects</p>
          <p className="text-[11px] text-blue-600 font-semibold">IHH Turkey Dedicated Repository</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Funding Allocated</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">TRY 1.85M+</p>
          <p className="text-[11px] text-emerald-600 font-semibold">100% Tracked & Disbursed</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Baseline Compliance</span>
            <FileCheck2 className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-extrabold text-purple-900">21 / 21 Files</p>
          <p className="text-[11px] text-purple-700 font-semibold">7/7 Primary Files Per Project</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Audit Verification</span>
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">100% Verified</p>
          <p className="text-[11px] text-amber-700 font-semibold">1 Guardian Clarification Logged</p>
        </div>
      </div>

      {/* 3. LOGICAL TAB FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All IHH Grants ({tenantFilteredProjects.length})
            </button>

            <button
              onClick={() => setActiveTab('RUNNING')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'RUNNING'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Running / On-Going ({tenantFilteredProjects.filter(p => p.statusCategory === 'RUNNING').length})
            </button>

            <button
              onClick={() => setActiveTab('ATTENTION')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'ATTENTION'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Needs Attention ({tenantFilteredProjects.filter(p => p.statusCategory === 'ATTENTION').length})
            </button>

            <button
              onClick={() => setActiveTab('COMPLETED')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Completed & Audited ({tenantFilteredProjects.filter(p => p.statusCategory === 'COMPLETED').length})
            </button>
          </div>

          <div className="w-full sm:w-64 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PID (e.g. PID 22567)..."
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-xl pl-9 pr-3 py-1.5 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* 4. CLEAN PROJECT CARDS GRID */}
        <div className="grid grid-cols-1 gap-5">
          {filteredProjects.length > 0 ? (
            filteredProjects.map((project) => {
              const projectTickets = tickets.filter((t) => t.pid === project.pid);
              const submittedPrimaryCount = project.primaryDocs.filter(d => d.status === 'Submitted').length;
              const hasSpecialDocs = project.specialDocs.length > 0;

              return (
                <div 
                  key={project.pid}
                  className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-4"
                >
                  {/* Card Top Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                        {project.pid}
                      </span>
                      <span className="text-xs font-bold text-slate-800">{project.partner}</span>
                    </div>

                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      project.statusCategory === 'ATTENTION' ? 'bg-amber-50 text-amber-900 border-amber-200' :
                      project.statusCategory === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      'bg-blue-50 text-blue-800 border-blue-200'
                    }`}>
                      {project.statusLabel}
                    </span>
                  </div>

                  {/* Project Title & Meta */}
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-extrabold text-slate-900 leading-snug">{project.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium pt-0.5">
                      <span>Location: <strong className="text-slate-800">{project.location}</strong></span>
                      <span>Lead Officer: <strong className="text-slate-800">{project.assignedOfficer}</strong></span>
                      <span>Beneficiaries: <strong className="text-slate-800">{project.beneficiariesCount} Households</strong></span>
                    </div>
                  </div>

                  {/* Baseline & Special Submissions Status (Clean Inline Bar) */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-slate-600 font-medium">
                        Baseline Files: <strong className="text-slate-900">{submittedPrimaryCount} / 7 Submitted ✓</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-600 shrink-0" />
                      <span className="text-slate-600 font-medium">
                        Special Submissions: <strong className="text-purple-900">{hasSpecialDocs ? `${project.specialDocs.length} Special Files` : 'Standard'}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Active Clarification Notice (Streamlined, non-cluttered) */}
                  {projectTickets.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
                      {projectTickets.map((t) => (
                        <div key={t.id} className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <MessageSquare className="w-4 h-4 text-blue-600 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-mono font-bold text-slate-900">{t.id}:</span>{' '}
                              <span className="text-slate-700 italic truncate">&ldquo;{t.message}&rdquo;</span>
                            </div>
                          </div>

                          {t.officerResponse?.attachmentName && (
                            <button
                              onClick={() => handleDownloadFile(t.officerResponse!.attachmentName!)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] rounded-lg border border-blue-200 transition shrink-0"
                            >
                              <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                              <span>{t.officerResponse.attachmentName}</span>
                              <Download className="w-3 h-3 text-blue-600" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setInspectingProject(project)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" /> Inspect Compliance Package ({project.primaryDocs.length + project.specialDocs.length})
                    </button>

                    <button
                      onClick={() => handleOpenQueryModal(project)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-slate-600" /> Request Special Document / Clarification
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-slate-50 border border-slate-200 p-8 rounded-2xl text-center space-y-2">
              <Building className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-bold text-slate-800 text-sm">No Projects Match Selected Filter</p>
              <p className="text-xs text-slate-500">Select another filter tab above.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: INSPECT ALL PRIMARY & SPECIAL DOCUMENTS */}
      {inspectingProject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[85vh] overflow-y-auto animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Document Inspection Directory</h3>
                <p className="text-xs text-slate-500 font-mono">{inspectingProject.pid} • {inspectingProject.partner}</p>
              </div>
              <button 
                onClick={() => setInspectingProject(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Audit Zip Package Download & Approval Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl">
              <div className="flex items-center gap-2">
                <FolderArchive className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-xs font-bold text-emerald-950">
                  Official Audit Package Directory ({inspectingProject.primaryDocs.length + inspectingProject.specialDocs.length} Documents)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {approvedPids[inspectingProject.pid] ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-xs rounded-xl shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Approved by Partner Audit
                  </span>
                ) : (
                  <button
                    onClick={() => handleApprovePackage(inspectingProject.pid)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve Compliance Package
                  </button>
                )}
                <button
                  onClick={() => handleDownloadAllZip(inspectingProject)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> Download (.zip)
                </button>
              </div>
            </div>

            {/* Section A: Baseline Compliance Documents */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-blue-600" /> Project Baseline Compliance Documents
              </h4>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                {inspectingProject.primaryDocs.map((doc) => (
                  <div key={doc.id} className="p-3 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Paperclip className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{doc.name}</p>
                        <p className="text-[10px] text-slate-500">{doc.fileSize}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        doc.status === 'Submitted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {doc.status === 'Submitted' ? '✓ Submitted' : 'Missing'}
                      </span>

                      {doc.status === 'Submitted' && (
                        <>
                          <button
                            onClick={() => setViewingDoc({ doc, pid: inspectingProject.pid, partner: inspectingProject.partner })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] rounded-lg border border-blue-200 transition"
                            title="Preview Document"
                          >
                            <Eye className="w-3 h-3" /> Preview
                          </button>
                          <button
                            onClick={() => handleDownloadFile(doc.name)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] rounded-lg border border-slate-200 transition"
                            title="Download Document"
                          >
                            <Download className="w-3 h-3" /> Download
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section B: Special Project Submissions & Clarifications */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-600" /> Special Project Submissions & Clarifications
              </h4>

              {inspectingProject.specialDocs.length > 0 ? (
                <div className="divide-y divide-purple-100 border border-purple-200 bg-purple-50/30 rounded-xl overflow-hidden text-xs">
                  {inspectingProject.specialDocs.map((doc) => (
                    <div key={doc.id} className="p-3.5 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Paperclip className="w-4 h-4 text-purple-600 flex-shrink-0" />
                          <p className="font-bold text-slate-900">{doc.name}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            doc.status === 'Submitted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {doc.status}
                          </span>

                          {doc.status === 'Submitted' && (
                            <>
                              <button
                                onClick={() => setViewingDoc({ doc, pid: inspectingProject.pid, partner: inspectingProject.partner })}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold text-[11px] rounded-lg border border-purple-300 transition"
                              >
                                <Eye className="w-3 h-3" /> Preview
                              </button>
                              <button
                                onClick={() => handleDownloadFile(doc.name)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] rounded-lg border border-slate-200 transition"
                              >
                                <Download className="w-3 h-3" /> Download
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {doc.specialReason && (
                        <p className="text-[11px] text-purple-900 bg-purple-100/80 p-2 rounded-lg italic">
                          Special Reason: &ldquo;{doc.specialReason}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-xl">
                  No special project submissions recorded for this standard project.
                </p>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => handleDownloadAllZip(inspectingProject)}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Download Complete Zip Archive
              </button>
              <button
                onClick={() => setInspectingProject(null)}
                className="py-2.5 px-5 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REQUEST SPECIAL EXTRA DOCUMENT */}
      {activeModalProject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Request Special Document / Clarification</h3>
                <p className="text-xs text-slate-500 font-mono">{activeModalProject.pid} • {activeModalProject.partner}</p>
              </div>
              <button 
                onClick={() => setActiveModalProject(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitSuccessMsg ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs text-emerald-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Clarification Request Sent!
                </p>
                <p>{submitSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleSendQueryTicket} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Your Representative Email</label>
                  <input
                    type="email"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Type of Special Submission Needed</label>
                  <select
                    value={queryType}
                    onChange={(e) => setQueryType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="Underage Beneficiary Query">Underaged Beneficiary Replacement & Guardian Letter</option>
                    <option value="Photo Request">Additional Field Photo Evidence Album</option>
                    <option value="Budget Discrepancy">Special Audit Expenditure Clarification</option>
                    <option value="Logframe Question">Water Quality / Sanitation Testing Inspection Certificate</option>
                    <option value="General Feedback">Other Special Ad-Hoc Request</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Special Reason for Request</label>
                  <textarea
                    rows={4}
                    value={queryMessage}
                    onChange={(e) => setQueryMessage(e.target.value)}
                    placeholder="Specify why this special document is requested..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>
                    Routes to assigned Program Officer <strong>{activeModalProject.assignedOfficer}</strong> ({activeModalProject.assignedOfficerEmail}).
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModalProject(null)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-4 h-4" /> Send Request to Program Officer
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: LIVE INTERACTIVE DOCUMENT PREVIEWER */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">{viewingDoc.doc.name}</h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {viewingDoc.pid} • {viewingDoc.partner} • {viewingDoc.doc.fileSize}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Content View Renderers */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs space-y-4">
              {/* Case 1: Form-7 Report */}
              {viewingDoc.doc.name.toLowerCase().includes('form-7') && (
                <div className="space-y-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm font-sans">
                  <div className="text-center border-b border-slate-200 pb-4 space-y-1">
                    <p className="text-[10px] font-extrabold uppercase text-blue-600 tracking-wider">Government of the People&apos;s Republic of Bangladesh</p>
                    <p className="text-xs font-bold text-slate-700">NGO Affairs Bureau • Prime Minister&apos;s Office</p>
                    <h2 className="text-base font-extrabold text-slate-900">FORM-7 PROJECT COMPLETION & AUDIT CLEARANCE REPORT</h2>
                    <p className="text-[11px] text-slate-500 font-mono">Project Reference: {viewingDoc.pid}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg text-[11px]">
                    <div>
                      <span className="text-slate-400 font-semibold block">Implementing NGO:</span>
                      <span className="font-bold text-slate-900">Small Kindness Bangladesh (SKB)</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">Donor Partner Organization:</span>
                      <span className="font-bold text-slate-900">{viewingDoc.partner}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">Project Status:</span>
                      <span className="font-bold text-emerald-700">100% Completed & Verified</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">NGO Bureau Reg #:</span>
                      <span className="font-bold text-slate-900">2938 / District License</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 text-xs">Section I: Key Implementation Achievements</h4>
                    <ul className="list-disc pl-4 text-slate-700 space-y-1 leading-relaxed">
                      <li>Procured and distributed livestock (dairy cows & goats) to ultra-poor households in Sylhet & Kurigram districts.</li>
                      <li>Verified 100% beneficiary NID credentials with government database integration.</li>
                      <li>Conducted 3-quote competitive vendor selection to ensure maximum cost-efficiency.</li>
                    </ul>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-between items-end">
                    <div className="text-[10px] text-slate-400">
                      Signed & Sealed by Executive Director Md. Abu Huraira<br />
                      Authorized Signature Code: SKB-EXEC-2026-SEALED
                    </div>
                    <span className="text-xs font-extrabold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-300">
                      ✓ NGO Bureau Approved
                    </span>
                  </div>
                </div>
              )}

              {/* Case 2: Picture Link Docx */}
              {viewingDoc.doc.name.toLowerCase().includes('picture') && (
                <div className="space-y-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">High-Resolution Photo Album Repository</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      All high-definition beneficiary distribution photos, livestock handing-over ceremonies, and site banners are archived in SKB&apos;s cloud drive.
                    </p>
                  </div>

                  <a
                    href="https://drive.google.com/drive/folders/1mlDU1TGV-tXIMJAEWfw1IhSlS2UzmDqA"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                  >
                    <ExternalLink className="w-4 h-4" /> Open Live Google Drive Photo Folder
                  </a>
                </div>
              )}

              {/* Case 3: Beneficiary Master List */}
              {viewingDoc.doc.name.toLowerCase().includes('beneficiary') && (
                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="font-bold text-slate-900 text-xs">Verified Beneficiary Master Register</h4>
                    <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded">NID Deduplicated</span>
                  </div>

                  <table className="w-full text-left text-[11px] divide-y divide-slate-100">
                    <thead>
                      <tr className="text-slate-400 font-bold uppercase">
                        <th className="py-1">Serial #</th>
                        <th className="py-1">Beneficiary Name</th>
                        <th className="py-1">NID Number</th>
                        <th className="py-1">District</th>
                        <th className="py-1 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-700">
                      <tr>
                        <td className="py-1.5 font-mono font-bold">#01</td>
                        <td className="py-1.5 font-bold">Rahima Khatun</td>
                        <td className="py-1.5 font-mono text-slate-500">1982269128912</td>
                        <td className="py-1.5">Sylhet Sadar</td>
                        <td className="py-1.5 text-right font-bold text-emerald-600">✓ Verified</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-mono font-bold">#02</td>
                        <td className="py-1.5 font-bold">Abdur Rashid</td>
                        <td className="py-1.5 font-mono text-slate-500">1975269123301</td>
                        <td className="py-1.5">Kurigram Sadar</td>
                        <td className="py-1.5 text-right font-bold text-emerald-600">✓ Verified</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-mono font-bold">#14</td>
                        <td className="py-1.5 font-bold text-purple-900">Arif Hasan (Orphan / Guardian Rep)</td>
                        <td className="py-1.5 font-mono text-purple-700">Guardian NID: 1985269123456</td>
                        <td className="py-1.5">Sylhet Sadar</td>
                        <td className="py-1.5 text-right font-bold text-purple-700">Special Guardian Signed</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Case 4: Special Underaged / Guardian Replacement Letter */}
              {(viewingDoc.doc.name.toLowerCase().includes('underage') || viewingDoc.doc.name.toLowerCase().includes('guardian') || viewingDoc.doc.name.toLowerCase().includes('orphan')) && (
                <div className="space-y-3 bg-purple-50/50 p-5 rounded-xl border border-purple-200">
                  <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-purple-700" /> Formal Legal Clarification & Guardian Representation Certificate
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-purple-200 text-xs leading-relaxed space-y-2 text-slate-800">
                    <p><strong>To:</strong> Audit Team, {viewingDoc.partner}</p>
                    <p><strong>Re:</strong> Clarification on Minor Beneficiary Serial #14 in {viewingDoc.pid}</p>
                    <p className="italic">
                      &ldquo;We confirm that Beneficiary Serial #14 (Arif Hasan, age 16) is an orphan child under the legal guardianship of his mother Fatema Begum (NID 1985269123456). In accordance with NGO Bureau rules and donor safeguards, the asset (1 Dairy Cow) has been handed over to legal guardian Fatema Begum to generate sustainable household income for the orphan child.&rdquo;
                    </p>
                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-500">
                      <span>Certified by Program Officer Mizbah Uddin</span>
                      <span>Approved by Legal Officer & Executive Director</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Default Preview Card */}
              {!viewingDoc.doc.name.toLowerCase().includes('form-7') &&
               !viewingDoc.doc.name.toLowerCase().includes('picture') &&
               !viewingDoc.doc.name.toLowerCase().includes('beneficiary') &&
               !viewingDoc.doc.name.toLowerCase().includes('underage') &&
               !viewingDoc.doc.name.toLowerCase().includes('guardian') &&
               !viewingDoc.doc.name.toLowerCase().includes('orphan') && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 text-center space-y-3">
                  <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h4 className="text-xs font-bold text-slate-900">{viewingDoc.doc.name}</h4>
                  <p className="text-xs text-slate-500">
                    Official submission package component. Digitally verified by SKB Finance & Executive Directorate.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                onClick={() => handleDownloadFile(viewingDoc.doc.name)}
                className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Download Official File ({viewingDoc.doc.fileSize})
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print Document
                </button>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {downloadToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-semibold">{downloadToast}</span>
        </div>
      )}
    </div>
  );
}
