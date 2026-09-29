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
  X
} from 'lucide-react';
import { formatCurrencyString, SupportedCurrency } from '@/server/services/multiCurrency';
import { 
  DonorQueryTicket, 
  INITIAL_DONOR_QUERIES, 
  createDonorQuery 
} from '@/server/services/donorQueryService';

interface SKBRealProjectReport {
  pid: string;
  title: string;
  category: 'Rohingya Relief' | 'Income Generation (IGP)' | 'Seasonal Relief' | 'Emergency & Health';
  partner: string;
  donorLogo: string;
  currency: SupportedCurrency;
  budgetAmount: number;
  spentAmount: number;
  beneficiariesCount: number;
  status: string;
  location: string;
  assignedOfficer: string;
  assignedOfficerEmail: string;
}

const REAL_SKB_PROJECTS: SKBRealProjectReport[] = [
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
    status: 'Completed (100% Disbursed)',
    location: 'Sylhet & Kurigram Rural Districts',
    assignedOfficer: 'Mizbah Uddin',
    assignedOfficerEmail: 'uddinmizbah902@gmail.com',
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
    status: 'Active (80% Disbursed)',
    location: 'Rohingya Camps, Cox’s Bazar',
    assignedOfficer: 'MD. Emran',
    assignedOfficerEmail: 'emran@skb.org.bd',
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
    status: 'Active (78% Disbursed)',
    location: 'Northern & Southern Bangladesh',
    assignedOfficer: 'Mizbah Uddin',
    assignedOfficerEmail: 'uddinmizbah902@gmail.com',
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
    status: 'Completed (95% Disbursed)',
    location: 'Ukhiya Camp 11 Fire Affected Zone',
    assignedOfficer: 'MD. Emran',
    assignedOfficerEmail: 'emran@skb.org.bd',
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
    status: 'Active (83% Disbursed)',
    location: 'Cox’s Bazar Refugee Camps',
    assignedOfficer: 'Adv. Aminul Islam Bulbul',
    assignedOfficerEmail: 'bulbuluu43@gmail.com',
  },
  {
    pid: 'PID 20634',
    title: 'Food Basket & Specialized Medical Treatment for Vulnerable Bangladeshi Families',
    category: 'Emergency & Health',
    partner: 'SKB Humanitarian Fund',
    donorLogo: '🇧🇩',
    currency: 'BDT',
    budgetAmount: 8500000,
    spentAmount: 7900000,
    beneficiariesCount: 2200,
    status: 'Active (92% Disbursed)',
    location: 'Sunamganj & Kurigram Villages',
    assignedOfficer: 'Mizbah Uddin',
    assignedOfficerEmail: 'uddinmizbah902@gmail.com',
  }
];

export default function DonorDashboardPage() {
  const roleT = useTranslations('RoleAreas');
  const [projects] = useState<SKBRealProjectReport[]>(REAL_SKB_PROJECTS);
  const [tickets, setTickets] = useState<DonorQueryTicket[]>(INITIAL_DONOR_QUERIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copiedLink, setCopiedLink] = useState(false);

  // Modal State for Donor Clarification Request
  const [activeModalProject, setActiveModalProject] = useState<SKBRealProjectReport | null>(null);
  const [donorEmail, setDonorEmail] = useState('');
  const [queryType, setQueryType] = useState<DonorQueryTicket['queryType']>('Underage Beneficiary Query');
  const [queryMessage, setQueryMessage] = useState('');
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState('');

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = 
      p.pid.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.partner.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}/donor-dashboard`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenQueryModal = (project: SKBRealProjectReport) => {
    setActiveModalProject(project);
    setDonorEmail('donor-audit@partner.org');
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
    setSubmitSuccessMsg(`Clarification Ticket #${newTicket.id} submitted! Assigned to ${activeModalProject.assignedOfficer}. Notification sent via Email/SMS.`);
    setTimeout(() => {
      setActiveModalProject(null);
    }, 1800);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-amber-100 text-amber-900 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-700" /> Interactive Donor Connectivity & Feedback Engine
            </span>
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Real-Time Officer Clarification Thread
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
          <h1 className="text-xl font-extrabold text-slate-900">Small Kindness Bangladesh (SKB) Interactive Donor Portal</h1>
          <p className="text-xs text-slate-600 leading-relaxed mt-1">
            Donors can inspect live project PIDs, review logframe achievements, and **submit questions or objections directly to assigned Program Officers** for instant official clarifications.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <div className="flex-1 min-w-[220px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by PID (e.g. PID 22567), IHH, Rohingya, Cows..."
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-xl pl-9 pr-3 py-2 outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 rounded-xl px-3 py-2 outline-none"
          >
            <option value="ALL">All Project Categories</option>
            <option value="Income Generation (IGP)">Income Generation (IGP)</option>
            <option value="Rohingya Relief">Rohingya Relief</option>
            <option value="Seasonal Relief">Seasonal Relief (Ramadan/Winter)</option>
            <option value="Emergency & Health">Emergency & Health</option>
          </select>
        </div>
      </div>

      {/* Projects List with Interactive Donor Objection & Clarification Engine */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
          <span>Displaying {filteredProjects.length} Verified SKB Projects & Active Tickets</span>
          <span>Respective Officers Assigned for Instant Clarification</span>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {filteredProjects.map((project) => {
            const projectTickets = tickets.filter((t) => t.pid === project.pid);

            return (
              <div 
                key={project.pid}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-400 transition-all space-y-4"
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
                    <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {project.status}
                    </span>
                    <span className="text-[11px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-blue-600" /> Officer: {project.assignedOfficer}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">{project.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Location: 📍 {project.location}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Grant Allocation</span>
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
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Contact</span>
                    <span className="font-semibold text-slate-700">{project.assignedOfficerEmail}</span>
                  </div>
                </div>

                {/* Donor Objection & Clarification Button */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    Questions or objections regarding this PID submission?
                  </span>
                  
                  <button
                    onClick={() => handleOpenQueryModal(project)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-[0.98]"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Submit Query / Request Officer Clarification
                  </button>
                </div>

                {/* Live Clarification Thread for this PID */}
                {projectTickets.length > 0 && (
                  <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-amber-700" />
                      <h4 className="text-xs font-bold text-amber-950">Active Donor Clarification Thread ({projectTickets.length})</h4>
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

                        {/* Donor Objection Query Text */}
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Donor Query ({t.donorName}):</p>
                          <p className="text-slate-800 italic leading-relaxed">&ldquo;{t.message}&rdquo;</p>
                        </div>

                        {/* Respective Officer Response */}
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
                            <span>Assigned Officer <strong>{t.assignedOfficerName}</strong> is preparing official clarification letter.</span>
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

      {/* Modal: Submit Clarification / Objection Ticket */}
      {activeModalProject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Request Officer Clarification</h3>
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
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Ticket Submitted Successfully!
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
                  <label className="block font-bold text-slate-700 mb-1">Clarification / Objection Category</label>
                  <select
                    value={queryType}
                    onChange={(e) => setQueryType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="Underage Beneficiary Query">Underage / Guardian Beneficiary Query</option>
                    <option value="Budget Discrepancy">Budget & Expenditure Reconciliation Query</option>
                    <option value="Photo Request">Additional Field Photo Evidence Request</option>
                    <option value="Logframe Question">Logframe Target Metric Question</option>
                    <option value="General Feedback">General Donor Feedback</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Details of Query / Objection</label>
                  <textarea
                    rows={4}
                    value={queryMessage}
                    onChange={(e) => setQueryMessage(e.target.value)}
                    placeholder="Describe your question or audit query regarding this PID submission..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <span>
                    Your query will be routed directly to assigned Program Officer <strong>{activeModalProject.assignedOfficer}</strong> ({activeModalProject.assignedOfficerEmail}) with instant email & SMS alert.
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
