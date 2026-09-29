'use client';

import { useState } from 'react';
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
  ArrowUpRight,
  PieChart,
  CheckSquare
} from 'lucide-react';
import { formatCurrencyString, SupportedCurrency } from '@/server/services/multiCurrency';
import { 
  DonorQueryTicket, 
  INITIAL_DONOR_QUERIES, 
  createDonorQuery 
} from '@/server/services/donorQueryService';

interface SKBDonorGrantProject {
  pid: string;
  title: string;
  category: 'Income Generation (IGP)' | 'Rohingya Relief' | 'Seasonal Relief' | 'Emergency & Health';
  partner: string;
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
  submittedDocsCount: number; // Out of 9
  missingDocsList: string[];
}

const ALL_SKB_DONOR_PROJECTS: SKBDonorGrantProject[] = [
  {
    pid: 'PID 22567',
    title: 'Income Generating Project (IGP): 20 Cows, 60 Goats & 40 Sewing Machines',
    category: 'Income Generation (IGP)',
    partner: 'IHH Humanitarian Relief Foundation',
    donorLogo: '🇹🇷',
    currency: 'TRY',
    budgetAmount: 1850000,
    spentAmount: 1850000,
    beneficiariesCount: 120,
    statusCategory: 'ATTENTION',
    statusLabel: 'Needs Attention (Guardian Clarification Requested)',
    location: 'Sylhet & Kurigram Rural Districts',
    assignedOfficer: 'Mizbah Uddin',
    assignedOfficerEmail: 'uddinmizbah902@gmail.com',
    submittedDocsCount: 8,
    missingDocsList: ['Underaged Guardian Replacement Certificate'],
  },
  {
    pid: 'PID 22211',
    title: 'Income Generating Project (IGP) in Bangladesh 2025',
    category: 'Income Generation (IGP)',
    partner: 'IHH Humanitarian Relief Foundation',
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
    submittedDocsCount: 9,
    missingDocsList: [],
  },
  {
    pid: 'PID 23431',
    title: 'Ramadan Support Program for Rohingya Refugees 2026',
    category: 'Seasonal Relief',
    partner: 'IHH & International Donors',
    donorLogo: '🇺🇳',
    currency: 'USD',
    budgetAmount: 150000,
    spentAmount: 120000,
    beneficiariesCount: 4500,
    statusCategory: 'RUNNING',
    statusLabel: 'Running (80% Disbursed)',
    location: 'Rohingya Camps, Cox’s Bazar',
    assignedOfficer: 'MD. Emran',
    assignedOfficerEmail: 'emran@skb.org.bd',
    submittedDocsCount: 7,
    missingDocsList: ['Form-7 Final PDF Report', 'Beneficiary NID Archive PDF'],
  },
  {
    pid: 'PID 23429',
    title: 'Ramadan Support Program for Vulnerable Bangladeshi Families 2026',
    category: 'Seasonal Relief',
    partner: 'SKB Local & Global Donors',
    donorLogo: '🇧🇩',
    currency: 'BDT',
    budgetAmount: 12500000,
    spentAmount: 9800000,
    beneficiariesCount: 6200,
    statusCategory: 'RUNNING',
    statusLabel: 'Running (78% Disbursed)',
    location: 'Northern & Southern Bangladesh',
    assignedOfficer: 'Mizbah Uddin',
    assignedOfficerEmail: 'uddinmizbah902@gmail.com',
    submittedDocsCount: 9,
    missingDocsList: [],
  },
  {
    pid: 'PID 23616',
    title: 'Rohingya Emergency Fire Victims Relief & Shelter Support 2026',
    category: 'Emergency & Health',
    partner: 'UNHCR & IHH Alliance',
    donorLogo: '🇹🇷',
    currency: 'USD',
    budgetAmount: 220000,
    spentAmount: 210000,
    beneficiariesCount: 1800,
    statusCategory: 'COMPLETED',
    statusLabel: 'Completed (Closed & Audited)',
    location: 'Ukhiya Camp 11 Fire Affected Zone',
    assignedOfficer: 'MD. Emran',
    assignedOfficerEmail: 'emran@skb.org.bd',
    submittedDocsCount: 9,
    missingDocsList: [],
  },
  {
    pid: 'PID 20742',
    title: 'Mobile Medical Emergency Team for Rohingya Refugees',
    category: 'Emergency & Health',
    partner: 'EU ECHO & Medical Partners',
    donorLogo: '🇪🇺',
    currency: 'EUR',
    budgetAmount: 180000,
    spentAmount: 150000,
    beneficiariesCount: 10500,
    statusCategory: 'RUNNING',
    statusLabel: 'Running (83% Disbursed)',
    location: 'Cox’s Bazar Refugee Camps',
    assignedOfficer: 'Adv. Aminul Islam Bulbul',
    assignedOfficerEmail: 'bulbuluu43@gmail.com',
    submittedDocsCount: 8,
    missingDocsList: ['Invoice Declaration Certificate'],
  },
  {
    pid: 'PID 20967',
    title: 'IGP Livelihoods Support 2024-2025 Archive',
    category: 'Income Generation (IGP)',
    partner: 'IHH Turkey Relief',
    donorLogo: '🇹🇷',
    currency: 'TRY',
    budgetAmount: 1200000,
    spentAmount: 1200000,
    beneficiariesCount: 95,
    statusCategory: 'ARCHIVED',
    statusLabel: 'Archived Prior Grant (2024-2025)',
    location: 'Kurigram Villages',
    assignedOfficer: 'Mizbah Uddin',
    assignedOfficerEmail: 'uddinmizbah902@gmail.com',
    submittedDocsCount: 9,
    missingDocsList: [],
  }
];

export default function DonorDashboardPage() {
  const roleT = useTranslations('RoleAreas');
  const [projects] = useState<SKBDonorGrantProject[]>(ALL_SKB_DONOR_PROJECTS);
  const [activeTab, setActiveTab] = useState<'ALL' | 'RUNNING' | 'ATTENTION' | 'COMPLETED' | 'ARCHIVED'>('ALL');
  const [tickets, setTickets] = useState<DonorQueryTicket[]>(INITIAL_DONOR_QUERIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Modal State for Donor Query / Objection
  const [activeModalProject, setActiveModalProject] = useState<SKBDonorGrantProject | null>(null);
  const [donorEmail, setDonorEmail] = useState('audit-donor@partner.org');
  const [queryType, setQueryType] = useState<DonorQueryTicket['queryType']>('Underage Beneficiary Query');
  const [queryMessage, setQueryMessage] = useState('');
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState('');

  // Calculate High-Level Executive KPI Metrics
  const totalProjectsCount = projects.length;
  const runningCount = projects.filter((p) => p.statusCategory === 'RUNNING').length;
  const attentionCount = projects.filter((p) => p.statusCategory === 'ATTENTION').length;
  const completedCount = projects.filter((p) => p.statusCategory === 'COMPLETED').length;
  const archivedCount = projects.filter((p) => p.statusCategory === 'ARCHIVED').length;
  const totalBeneficiariesReached = projects.reduce((sum, p) => sum + p.beneficiariesCount, 0);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = 
      p.pid.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.partner.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'ALL' || p.statusCategory === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}/donor-dashboard`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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
    setSubmitSuccessMsg(`Clarification Ticket #${newTicket.id} submitted to Officer ${activeModalProject.assignedOfficer}!`);
    setTimeout(() => {
      setActiveModalProject(null);
    }, 1800);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* 1. FIRST SIGHT EXECUTIVE DONOR KPI DASHBOARD */}
      <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-amber-100 text-amber-900 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-700" /> Executive Donor Intelligence Dashboard
            </span>
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Audit Verified Portal
            </span>
          </div>

          <button
            onClick={handleCopyShareLink}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl border border-amber-300 transition-all"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            {copiedLink ? 'Portal Link Copied!' : 'Share Donor Portal Link'}
          </button>
        </div>

        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Welcome to SKB International Partner Portal</h1>
          <p className="text-xs text-slate-600 leading-relaxed mt-1">
            First-sight executive overview of active grants, required document submission compliance, logframe progress, and direct clarification channels with SKB Officers.
          </p>
        </div>

        {/* Executive KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-blue-50/60 border border-blue-200/80 p-3.5 rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-blue-700 block">On-Going / Running</span>
            <span className="text-2xl font-extrabold text-blue-900">{runningCount} Grants</span>
            <span className="text-[10px] text-blue-600 block">Live Field Intake</span>
          </div>

          <div className="bg-amber-50/70 border border-amber-300 p-3.5 rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-amber-800 block">Needs Attention</span>
            <span className="text-2xl font-extrabold text-amber-900">{attentionCount} Project</span>
            <span className="text-[10px] text-amber-700 font-semibold block">Missing / Clarification Query</span>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200/80 p-3.5 rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Completed & Audited</span>
            <span className="text-2xl font-extrabold text-emerald-900">{completedCount} Grants</span>
            <span className="text-[10px] text-emerald-600 block">Form-7 Certified</span>
          </div>

          <div className="bg-slate-100 border border-slate-200 p-3.5 rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Beneficiaries</span>
            <span className="text-2xl font-extrabold text-slate-900">{totalBeneficiariesReached.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 block">Verified Families</span>
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE TAB SELECTION ENGINE */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'ALL'
                  ? 'bg-amber-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Projects ({totalProjectsCount})
            </button>

            <button
              onClick={() => setActiveTab('RUNNING')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'RUNNING'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" /> Running / On-Going ({runningCount})
            </button>

            <button
              onClick={() => setActiveTab('ATTENTION')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'ATTENTION'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Needs Attention / Corrections ({attentionCount})
            </button>

            <button
              onClick={() => setActiveTab('COMPLETED')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Completed & Audited ({completedCount})
            </button>

            <button
              onClick={() => setActiveTab('ARCHIVED')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'ARCHIVED'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FolderArchive className="w-3.5 h-3.5" /> Archived Prior Grants ({archivedCount})
            </button>
          </div>

          <div className="w-full sm:w-64 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PID (e.g. PID 22567)..."
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-xl pl-9 pr-3 py-1.5 outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Projects Cards List */}
        <div className="grid grid-cols-1 gap-5">
          {filteredProjects.map((project) => {
            const projectTickets = tickets.filter((t) => t.pid === project.pid);
            const isDocComplete = project.submittedDocsCount === 9;

            return (
              <div 
                key={project.pid}
                className={`bg-white p-6 rounded-2xl border transition-all space-y-4 ${
                  project.statusCategory === 'ATTENTION'
                    ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-md'
                    : 'border-slate-200 shadow-sm hover:border-blue-400'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{project.donorLogo}</span>
                    <span className="font-mono text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                      {project.pid}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{project.partner}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      project.statusCategory === 'ATTENTION' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                      project.statusCategory === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      project.statusCategory === 'ARCHIVED' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                      'bg-blue-50 text-blue-800 border-blue-200'
                    }`}>
                      {project.statusLabel}
                    </span>

                    {/* Required Documents Submission Status Badge */}
                    <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1 border ${
                      isDocComplete ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}>
                      <CheckSquare className="w-3.5 h-3.5" />
                      Required Docs: {project.submittedDocsCount}/9 Submitted
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">{project.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Location: 📍 {project.location}</p>
                </div>

                {/* Missing / Required Documents Breakdown */}
                {project.missingDocsList.length > 0 && (
                  <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-xl text-xs space-y-1">
                    <p className="font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Action Needed: {project.missingDocsList.length} Missing Document(s):
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {project.missingDocsList.map((doc, i) => (
                        <span key={i} className="bg-white text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded">
                          ⚠️ {doc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Grant Funding</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrencyString(project.budgetAmount, project.currency)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Verified Beneficiaries</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-emerald-600" /> {project.beneficiariesCount.toLocaleString()} Families
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Officer</span>
                    <span className="font-semibold text-slate-700">{project.assignedOfficer} ({project.assignedOfficerEmail})</span>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    Need corrections, additions, or official clarification from officer?
                  </span>
                  
                  <button
                    onClick={() => handleOpenQueryModal(project)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-[0.98]"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Request Officer Correction / Feedback
                  </button>
                </div>

                {/* Live Clarification Thread */}
                {projectTickets.length > 0 && (
                  <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-amber-700" />
                      <h4 className="text-xs font-bold text-amber-950">Active Donor Feedback Thread ({projectTickets.length})</h4>
                    </div>

                    {projectTickets.map((t) => (
                      <div key={t.id} className="bg-white p-3.5 rounded-xl border border-amber-200/80 space-y-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{t.id}</span>
                            <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-[10px]">
                              {t.queryType}
                            </span>
                          </div>
                          <span className={`font-semibold text-[10px] px-2 py-0.5 rounded-full ${
                            t.status === 'Officer Clarification Posted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {t.status}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Donor Feedback ({t.donorName}):</p>
                          <p className="text-slate-800 italic leading-relaxed">&ldquo;{t.message}&rdquo;</p>
                        </div>

                        {t.officerResponse ? (
                          <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200 space-y-1.5 mt-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-blue-900 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> {t.officerResponse.responderName} ({t.officerResponse.responderRole})
                              </span>
                              <span className="text-[10px] text-blue-700 font-mono">{t.officerResponse.respondedAt}</span>
                            </div>
                            <p className="text-slate-800 text-xs font-medium leading-relaxed">
                              {t.officerResponse.responseText}
                            </p>
                            {t.officerResponse.attachmentName && (
                              <div className="pt-1">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded border border-blue-300">
                                  <Paperclip className="w-3 h-3" /> {t.officerResponse.attachmentName}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-amber-100/50 p-2.5 rounded-lg border border-amber-200 text-[11px] text-amber-900 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                            <span>Assigned Officer <strong>{t.assignedOfficerName}</strong> is reviewing and uploading required clarification document.</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Submit Clarification / Feedback Ticket */}
      {activeModalProject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Request Officer Clarification / Addition</h3>
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
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Feedback Ticket Submitted!
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
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Feedback / Request Type</label>
                  <select
                    value={queryType}
                    onChange={(e) => setQueryType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="Underage Beneficiary Query">Underage / Guardian Replacement Request</option>
                    <option value="Photo Request">Missing Document / Photo Evidence Request</option>
                    <option value="Budget Discrepancy">Budget Reconciliation Query</option>
                    <option value="Logframe Question">Logframe Target Metric Question</option>
                    <option value="General Feedback">General Correction / Addition</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Details of Correction / Question</label>
                  <textarea
                    rows={4}
                    value={queryMessage}
                    onChange={(e) => setQueryMessage(e.target.value)}
                    placeholder="Describe what addition, correction, or clarification is requested from SKB officers..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <span>
                    Directly alerts Program Officer <strong>{activeModalProject.assignedOfficer}</strong> ({activeModalProject.assignedOfficerEmail}) via Email & SMS.
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
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-4 h-4" /> Send Ticket to Officer
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
