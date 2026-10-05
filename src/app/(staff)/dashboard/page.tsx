'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { 
  FolderKanban, 
  Receipt, 
  CheckCircle2, 
  Users, 
  BarChart3, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Building2,
  Calendar,
  Briefcase,
  MessageSquare,
  Paperclip,
  Send,
  Heart,
  MessageCircle,
  FileCheck2,
  AlertTriangle,
  X,
  UserCheck
} from 'lucide-react';
import { 
  DonorQueryTicket, 
  INITIAL_DONOR_QUERIES, 
  respondToDonorQuery 
} from '@/server/services/donorQueryService';

export default function StaffDashboardPage() {
  const [designation, setDesignation] = useState<string>('Staff Workspace');
  const [donorTickets, setDonorTickets] = useState<DonorQueryTicket[]>(INITIAL_DONOR_QUERIES);
  const [activeResponseTicket, setActiveResponseTicket] = useState<DonorQueryTicket | null>(null);
  const [responseText, setResponseText] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const navT = useTranslations('Navigation');
  const roleT = useTranslations('RoleAreas');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.designation) {
        setDesignation(user.user_metadata.designation);
      }
    });
  }, []);

  const isProgramOfficer = designation.toLowerCase().includes('program') || designation.toLowerCase().includes('officer');
  const isExecutive = designation.toLowerCase().includes('director') || designation.toLowerCase().includes('executive');
  const isAdmin = designation.toLowerCase().includes('admin') || designation.toLowerCase().includes('it');

  const pendingTicketsCount = donorTickets.filter(t => t.status === 'Pending Officer Review').length;

  const handlePostClarification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeResponseTicket || !responseText.trim()) return;

    const updatedTicket = respondToDonorQuery(
      activeResponseTicket,
      isProgramOfficer ? 'Mizbah Uddin' : 'Md. Abu Huraira',
      isProgramOfficer ? 'Program Officer (Assigned)' : 'Executive Director',
      responseText,
      attachmentName.trim() || undefined
    );

    const updatedList = donorTickets.map(t => t.id === updatedTicket.id ? updatedTicket : t);
    setDonorTickets(updatedList);
    setSuccessToast(`Clarification posted for ${updatedTicket.id} (${updatedTicket.pid})! Synchronized with Donor Hub.`);
    setActiveResponseTicket(null);
    setResponseText('');
    setAttachmentName('');
    setTimeout(() => setSuccessToast(''), 4000);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <Building2 className="w-3.5 h-3.5" /> SKB Operations • {designation}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isProgramOfficer ? 'Program Officer Workspace' : isExecutive ? 'Executive Control Panel' : 'Staff Operations Center'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isProgramOfficer 
              ? 'Manage project logframes, work plans, field submissions, and M&E indicator progress.'
              : isExecutive
              ? 'High-level strategic portfolio overview, grant burn rates, and financial approvals.'
              : 'Overview of active projects, multi-tenant grants, pending approvals, and system telemetry.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/me/report-generator" 
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            AI Donor Generator
          </Link>
          <Link 
            href="/finance/approvals" 
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition"
          >
            Pending Approvals (3)
          </Link>
        </div>
      </div>

      {/* Respectful Executive & Donor Development Preview Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-blue-600/30 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-white/20 text-white font-extrabold px-2.5 py-0.5 rounded-full border border-white/20">
              Live Development & Field Progress
            </span>
            <span className="text-xs text-blue-200 font-bold">
              Updated Daily for Donor Partners & Executive Directorate
            </span>
          </div>
          <p className="text-xs text-blue-100 leading-relaxed max-w-2xl">
            Welcome to Small Kindness Bangladesh. External stakeholders and executive management can preview live operational progress, field telemetry, and compliance repository submissions in real-time.
          </p>
        </div>
        <Link
          href="/donor-dashboard"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition shrink-0"
        >
          Inspect Live Donor Hub &rsaquo;
        </Link>
      </div>

      {/* Primary Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Projects</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">4</p>
          <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> 100% On-Track Milestones
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Grants</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">3</p>
          <p className="text-[11px] text-slate-500">৳45.2M Total Funding</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Donor Correction Alerts</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-600">{donorTickets.length}</p>
          <p className="text-[11px] text-amber-700 font-medium">{pendingTicketsCount} Pending Officer Response</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Beneficiaries</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">12,450</p>
          <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> NID Verified Records
          </p>
        </div>
      </div>

      {/* DONOR CORRECTION & SPECIAL DOCUMENT REQUESTS SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Donor Objections & Special Document Requests
              </h2>
              <p className="text-xs text-slate-500">
                Incoming queries and special document requests submitted by donors on /donor-dashboard.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-300">
              {pendingTicketsCount} Pending Review
            </span>
            <Link 
              href="/donor-dashboard" 
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              View Donor Hub &rsaquo;
            </Link>
          </div>
        </div>

        {successToast && (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {successToast}
          </div>
        )}

        {/* Ticket List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {donorTickets.map((ticket) => (
            <div 
              key={ticket.id}
              className={`p-4 rounded-xl border space-y-3 transition-all ${
                ticket.status === 'Pending Officer Review'
                  ? 'bg-amber-50/50 border-amber-300 shadow-sm'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-2 text-xs">
                <span className="font-mono font-extrabold text-blue-700">{ticket.id} • {ticket.pid}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  ticket.status === 'Officer Clarification Posted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                }`}>
                  {ticket.status}
                </span>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-900">{ticket.queryType}</p>
                <p className="text-[11px] text-slate-500">From: {ticket.donorName} ({ticket.donorEmail})</p>
              </div>

              <p className="text-xs text-slate-700 italic bg-white p-2.5 rounded-lg border border-slate-200/80">
                &ldquo;{ticket.message}&rdquo;
              </p>

              <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                <span>Assigned: <strong>{ticket.assignedOfficerName}</strong></span>
                <span>{ticket.createdAt}</span>
              </div>

              {ticket.officerResponse ? (
                <div className="bg-blue-50/80 p-3 rounded-lg border border-blue-200 text-xs space-y-1">
                  <p className="font-bold text-blue-900 text-[11px]">
                    Posted Response ({ticket.officerResponse.responderName}):
                  </p>
                  <p className="text-blue-800 text-[11px]">{ticket.officerResponse.responseText}</p>
                  {ticket.officerResponse.attachmentName && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded mt-1">
                      <Paperclip className="w-3 h-3" /> {ticket.officerResponse.attachmentName}
                    </span>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => {
                    setActiveResponseTicket(ticket);
                    setResponseText('');
                    setAttachmentName('');
                  }}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Post Officer Clarification Response
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Operational Module Shortcuts */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900">Core Portal Workspaces</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link 
            href="/finance/approvals" 
            className="group p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" />
                Finance & Approvals
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="text-xs text-slate-500">
              3-tier expense review (PM &rarr; Finance &rarr; HQ Admin), multi-currency budgets.
            </p>
          </Link>

          <Link 
            href="/community" 
            className="group p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 transition space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                HQ Community Hub
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="text-xs text-slate-500">
              Field announcement feed, internal staff discussions, and donor ticket updates.
            </p>
          </Link>

          <Link 
            href="/me/dashboard" 
            className="group p-4 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 transition space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 group-hover:text-purple-600 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                M&E & Field Analytics
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="text-xs text-slate-500">
              District coverage maps, indicator achievements, and offline field validations.
            </p>
          </Link>

          <Link 
            href="/admin/users" 
            className="group p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Admin & Governance
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="text-xs text-slate-500">
              Role-based Access Control (RBAC), multi-tenant user provisioning, audit logging.
            </p>
          </Link>
        </div>
      </div>

      {/* Recent Activity & Key Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Projects Portfolio */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Active Program Portfolio</h2>
            <span className="text-xs text-blue-600 font-medium">4 Projects Live</span>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 bg-slate-50 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">Rohingya WASH Emergency Phase 2</span>
                <span className="text-emerald-600 font-semibold">85% Complete</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-1.5 rounded-full w-[85%]"></div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Cox&apos;s Bazar District</span>
                <span>Budget: $150,000</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">Flood Resilience & Livelihoods</span>
                <span className="text-amber-600 font-semibold">60% Complete</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-1.5 rounded-full w-[60%]"></div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Kurigram District</span>
                <span>Budget: $120,000</span>
              </div>
            </div>
          </div>
        </div>

        {/* HQ Community Discussion Bulletin */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" /> HQ Staff Community Bulletin
            </h2>
            <Link href="/community" className="text-xs text-blue-600 hover:underline font-semibold">
              Open Community &rsaquo;
            </Link>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 border border-slate-200 bg-slate-50/50 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-900">Mizbah Uddin • Program Officer</span>
                <span className="text-slate-400">2 hours ago</span>
              </div>
              <p className="text-xs font-semibold text-slate-800">
                PID 22567 Beneficiary #14 Guardian Clarification Letter Submitted
              </p>
              <p className="text-[11px] text-slate-500 line-clamp-2">
                Posted formal clarification letter for IHH Audit regarding orphan child beneficiary #14 in Sylhet...
              </p>
            </div>

            <div className="p-3.5 border border-slate-200 bg-slate-50/50 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-900">Md. Abu Huraira • Executive Director</span>
                <span className="text-slate-400">Yesterday</span>
              </div>
              <p className="text-xs font-semibold text-slate-800">
                New 2026 Donor Intelligence Portal Deployed
              </p>
              <p className="text-[11px] text-slate-500 line-clamp-2">
                Multi-currency grant tracking engine and 9-file compliance package repository now active...
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: POST OFFICER RESPONSE */}
      {activeResponseTicket && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Post Officer Clarification Response</h3>
                <p className="text-xs text-slate-500 font-mono">{activeResponseTicket.id} • {activeResponseTicket.pid}</p>
              </div>
              <button 
                onClick={() => setActiveResponseTicket(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs space-y-1">
              <p className="font-bold text-amber-900">Donor Query / Objection Message:</p>
              <p className="text-amber-950 italic">&ldquo;{activeResponseTicket.message}&rdquo;</p>
            </div>

            <form onSubmit={handlePostClarification} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Official Officer Clarification Text</label>
                <textarea
                  rows={4}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Provide precise explanation or reference to attached clarification letter..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Attachment File Name (Optional PDF/Doc)</label>
                <input
                  type="text"
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  placeholder="e.g. Clarification_Letter_PID_23431.pdf"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveResponseTicket(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5"
                >
                  <Send className="w-4 h-4" /> Post & Send to Donor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
