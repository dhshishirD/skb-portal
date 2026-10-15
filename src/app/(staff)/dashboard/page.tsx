'use client';

import { useState, useEffect, useMemo } from 'react';
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
  UserCheck,
  Globe2,
  Lock,
  Eye,
  ShieldAlert,
  Search,
  Filter,
  Check,
  RefreshCw,
  ExternalLink,
  LayoutDashboard,
  CheckSquare,
  Clock,
  Layers,
  Award,
  ChevronRight,
  Download,
  FileText
} from 'lucide-react';
import { 
  DEFAULT_PARTNER_PROJECTS,
  SKBDonorGrantProject,
  ProjectDocument,
  PartnerWorkspaceKey,
  PARTNER_REGISTRY
} from '@/server/services/partnerProjectsData';
import { 
  DonorQueryTicket, 
  INITIAL_DONOR_QUERIES, 
  respondToDonorQuery 
} from '@/server/services/donorQueryService';
import { CloudSyncService } from '@/server/services/cloudSyncService';
import { formatCurrencyString } from '@/server/services/multiCurrency';

export default function StaffDashboardPage() {
  const [designation, setDesignation] = useState<string>('Staff Workspace');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');

  // Separated Desk Tabs
  const [activeDeskTab, setActiveDeskTab] = useState<'EXECUTIVE_DESK' | 'PROGRAMS_DESK' | 'DONOR_QUERIES' | 'ALL_MODULES'>('EXECUTIVE_DESK');

  // Executive Publication Gate State
  const [projects, setProjects] = useState<SKBDonorGrantProject[]>(DEFAULT_PARTNER_PROJECTS);
  const [partnerFilter, setPartnerFilter] = useState<'ALL' | PartnerWorkspaceKey>('ALL');
  const [publicationStatusFilter, setPublicationStatusFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED'>('ALL');
  const [searchDocQuery, setSearchDocQuery] = useState('');

  // Donor Objections & Query State
  const [donorTickets, setDonorTickets] = useState<DonorQueryTicket[]>(INITIAL_DONOR_QUERIES);
  const [activeResponseTicket, setActiveResponseTicket] = useState<DonorQueryTicket | null>(null);
  const [responseText, setResponseText] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [successToast, setSuccessToast] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        if (user.user_metadata?.designation) {
          setDesignation(user.user_metadata.designation);
        }
        setCurrentUserEmail(user.email || '');
        setCurrentUserName(user.user_metadata?.full_name || '');
      } else {
        const storedAuthor = localStorage.getItem('skb_current_community_author');
        if (storedAuthor) {
          setCurrentUserName(storedAuthor);
        }
      }
    });
  }, []);

  // Merge any local uploaded project documents on mount
  useEffect(() => {
    const loadProjectsWithDocs = () => {
      const updatedProjects = DEFAULT_PARTNER_PROJECTS.map((proj) => {
        if (typeof window !== 'undefined') {
          const storedDocs = localStorage.getItem(`skb_documents_${proj.pid}`);
          if (storedDocs) {
            try {
              const parsed = JSON.parse(storedDocs);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const mergedDocs = [...proj.primaryDocs];
                for (const d of parsed) {
                  const idx = mergedDocs.findIndex((md) => md.id === d.id || md.name === d.name);
                  if (idx >= 0) {
                    mergedDocs[idx] = { ...mergedDocs[idx], ...d };
                  } else {
                    mergedDocs.push(d);
                  }
                }
                return { ...proj, primaryDocs: mergedDocs };
              }
            } catch (err) {
              console.warn('Failed parsing stored docs', err);
            }
          }
        }
        return proj;
      });
      setProjects(updatedProjects);
    };

    loadProjectsWithDocs();
  }, []);

  const isProgramOfficer = designation.toLowerCase().includes('program') || designation.toLowerCase().includes('officer');
  const isExecutive = designation.toLowerCase().includes('director') || designation.toLowerCase().includes('executive');
  const isExecutiveOrAdmin =
    currentUserEmail.toLowerCase() === 'kindnessforbeauty@gmail.com' ||
    currentUserEmail.toLowerCase() === 'daloyar.pro@gmail.com' ||
    currentUserName.toLowerCase().includes('huraira') ||
    currentUserName.toLowerCase().includes('daloyar');

  const pendingTicketsCount = donorTickets.filter((t) => t.status === 'Pending Officer Review').length;

  // Flatten all documents for the Quality Control Gate
  const allDocumentsList = useMemo(() => {
    const list: Array<ProjectDocument & { projectId: string; projectTitle: string; partner: string; partnerKey: PartnerWorkspaceKey; currency: string }> = [];
    projects.forEach((p) => {
      p.primaryDocs.forEach((d) => {
        list.push({
          ...d,
          projectId: p.pid,
          projectTitle: p.title,
          partner: p.partner,
          partnerKey: p.partnerKey,
          currency: p.currency,
        });
      });
    });
    return list;
  }, [projects]);

  const filteredDocuments = useMemo(() => {
    return allDocumentsList.filter((d) => {
      const matchesPartner = partnerFilter === 'ALL' || d.partnerKey === partnerFilter;
      const isPublished = d.publishedToDonorWorkspace !== false;
      const matchesStatus =
        publicationStatusFilter === 'ALL' ||
        (publicationStatusFilter === 'PUBLISHED' && isPublished) ||
        (publicationStatusFilter === 'DRAFT' && !isPublished);
      const matchesSearch =
        d.name.toLowerCase().includes(searchDocQuery.toLowerCase()) ||
        d.projectId.toLowerCase().includes(searchDocQuery.toLowerCase()) ||
        d.projectTitle.toLowerCase().includes(searchDocQuery.toLowerCase());
      return matchesPartner && matchesStatus && matchesSearch;
    });
  }, [allDocumentsList, partnerFilter, publicationStatusFilter, searchDocQuery]);

  // Executive Director Quality Gate: Publish / Recall Toggle
  const handleTogglePublication = async (projectId: string, docId: string, docName: string, publish: boolean) => {
    const signatory = currentUserName || 'Md. Abu Huraira (Executive Director)';
    await CloudSyncService.togglePublicationToDonor(projectId, docId, publish, signatory);

    setProjects((prevProjects) => {
      return prevProjects.map((p) => {
        if (p.pid === projectId) {
          const updatedDocs = p.primaryDocs.map((d) => {
            if (d.id === docId || d.name === docName) {
              return {
                ...d,
                publishedToDonorWorkspace: publish,
                publishedBy: publish ? signatory : undefined,
                publishedAt: publish ? new Date().toLocaleString() : undefined,
              };
            }
            return d;
          });
          return { ...p, primaryDocs: updatedDocs };
        }
        return p;
      });
    });

    setSuccessToast(
      publish
        ? `Quality Control Approved: "${docName}" is now officially published to Foreign Donor Workspace by ${signatory}!`
        : `Recalled to Internal Draft: "${docName}" is now hidden from foreign donor view.`
    );
    setTimeout(() => setSuccessToast(''), 5000);
  };

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

    const updatedList = donorTickets.map((t) => (t.id === updatedTicket.id ? updatedTicket : t));
    setDonorTickets(updatedList);
    setSuccessToast(`Clarification posted for ${updatedTicket.id} (${updatedTicket.pid})! Synchronized with International Donor Workspace.`);
    setActiveResponseTicket(null);
    setResponseText('');
    setAttachmentName('');
    setTimeout(() => setSuccessToast(''), 4500);
  };

  return (
    <div className="space-y-6 pb-12 font-sans max-w-7xl mx-auto">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Main Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <Building2 className="w-3.5 h-3.5" /> SKB Operations • {designation}
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            {isProgramOfficer ? 'Program Officer Operations Desk' : 'Executive Directorate & Staff Workspace'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Separated functional desks for Executive Director sign-off, field programs execution, donor compliance audit, and HQ gateways.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link 
            href="/donor-dashboard" 
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl border border-amber-300 transition"
          >
            <Globe2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Donor Inspection Portal</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>
          <Link 
            href="/me/profile" 
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Officer ID Desk</span>
          </Link>
        </div>
      </div>

      {/* SEPARATED DESKS SELECTOR TABS */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setActiveDeskTab('EXECUTIVE_DESK')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
            activeDeskTab === 'EXECUTIVE_DESK'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/60'
          }`}
        >
          <ShieldCheck className={`w-4 h-4 ${activeDeskTab === 'EXECUTIVE_DESK' ? 'text-emerald-300' : 'text-blue-600'}`} />
          <span>Executive Directorate Desk &amp; Publication Gate</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
            activeDeskTab === 'EXECUTIVE_DESK' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            QC Gate
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveDeskTab('PROGRAMS_DESK')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
            activeDeskTab === 'PROGRAMS_DESK'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/60'
          }`}
        >
          <FolderKanban className={`w-4 h-4 ${activeDeskTab === 'PROGRAMS_DESK' ? 'text-amber-300' : 'text-amber-500'}`} />
          <span>Programs &amp; Field Operations Desk ({projects.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveDeskTab('DONOR_QUERIES')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
            activeDeskTab === 'DONOR_QUERIES'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/60'
          }`}
        >
          <AlertTriangle className={`w-4 h-4 ${activeDeskTab === 'DONOR_QUERIES' ? 'text-amber-300' : 'text-amber-600'}`} />
          <span>Donor Objections &amp; Audit Desk ({donorTickets.length})</span>
          {pendingTicketsCount > 0 && (
            <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
              {pendingTicketsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveDeskTab('ALL_MODULES')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
            activeDeskTab === 'ALL_MODULES'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/60'
          }`}
        >
          <LayoutDashboard className={`w-4 h-4 ${activeDeskTab === 'ALL_MODULES' ? 'text-indigo-300' : 'text-indigo-600'}`} />
          <span>Core Portal Gateways</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* DESK 1: EXECUTIVE DIRECTORATE DESK & PUBLICATION GATE                     */}
      {/* ========================================================================= */}
      {activeDeskTab === 'EXECUTIVE_DESK' && (
        <div className="space-y-6">
          {/* Executive Overview Telemetry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Active Grants</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">{projects.length} Bilateral Projects</p>
              <p className="text-[11px] text-slate-500 font-medium">IHH, UMUT OL, QWCQP, Mavi Marmara</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Program Funding</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Globe2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-600">€62,975 / $62,000</p>
              <p className="text-[11px] text-emerald-700 font-medium">100% Reconciled Bank Allocations</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Published to Donors</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-indigo-600">
                {allDocumentsList.filter((d) => d.publishedToDonorWorkspace !== false).length} / {allDocumentsList.length} Files
              </p>
              <p className="text-[11px] text-indigo-700 font-medium">Live on Foreign Partner Workspaces</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Beneficiary Reach</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-purple-700">15,775 Records</p>
              <p className="text-[11px] text-purple-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> NID Verified in Field
              </p>
            </div>
          </div>

          {/* PUBLICATION GATE CONTROL CONSOLE */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-blue-50 text-blue-700 rounded-xl">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                  </span>
                  <h2 className="text-base font-black text-slate-900">
                    Executive Quality Control Gate — Publish to Donor Workspace
                  </h2>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Guarantees rigorous quality control before foreign partners inspect files. Field compliance submissions stay as internal drafts until the Executive Director signs off.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  Signatory: <strong>{currentUserName || 'Md. Abu Huraira (Executive Director)'}</strong>
                </span>
                <Link
                  href="/donor-dashboard"
                  target="_blank"
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Partner View</span>
                </Link>
              </div>
            </div>

            {/* Filter by Partner Desk */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold pt-1">
              <span className="text-slate-400 text-[11px] mr-1 uppercase tracking-wider">Partner Desk:</span>
              <button
                onClick={() => setPartnerFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  partnerFilter === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All 6 International Desks ({allDocumentsList.length})
              </button>
              {(Object.keys(PARTNER_REGISTRY) as PartnerWorkspaceKey[])
                .filter((k) => k !== 'ALL')
                .map((key) => {
                  const info = PARTNER_REGISTRY[key];
                  const count = allDocumentsList.filter((d) => d.partnerKey === key).length;
                  return (
                    <button
                      key={key}
                      onClick={() => setPartnerFilter(key)}
                      className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                        partnerFilter === key
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                      }`}
                    >
                      <span>{info.flag}</span>
                      <span>{info.shortName}</span>
                      <span className="text-[10px] opacity-75">({count})</span>
                    </button>
                  );
                })}
            </div>

            {/* Secondary Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                <button
                  onClick={() => setPublicationStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl transition ${
                    publicationStatusFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  All Statuses ({filteredDocuments.length})
                </button>
                <button
                  onClick={() => setPublicationStatusFilter('PUBLISHED')}
                  className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                    publicationStatusFilter === 'PUBLISHED'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <Globe2 className="w-3.5 h-3.5" /> Published to Donors
                </button>
                <button
                  onClick={() => setPublicationStatusFilter('DRAFT')}
                  className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                    publicationStatusFilter === 'DRAFT'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" /> Drafts Pending Sign-off
                </button>
              </div>

              <div className="w-full sm:w-64 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchDocQuery}
                  onChange={(e) => setSearchDocQuery(e.target.value)}
                  placeholder="Search document title or PID..."
                  className="w-full bg-white border border-slate-200 text-xs rounded-xl pl-9 pr-3 py-1.5 outline-none focus:border-blue-500 font-medium"
                />
              </div>
            </div>

            {/* Quality Control Documents Table */}
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
              {filteredDocuments.length > 0 ? (
                filteredDocuments.map((doc) => {
                  const isPublished = doc.publishedToDonorWorkspace !== false;
                  return (
                    <div
                      key={`${doc.projectId}_${doc.id}`}
                      className="p-4 hover:bg-slate-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2.5 rounded-2xl shrink-0 ${isPublished ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          <FileCheck2 className="w-5 h-5" />
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-xs font-black text-slate-900 truncate">{doc.name}</h4>
                            <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                              {doc.projectId}
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              {doc.partner}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                            <span>Size: <strong className="text-slate-700">{doc.fileSize}</strong></span>
                            <span>•</span>
                            <span>Project: <strong className="text-slate-700">{doc.projectTitle}</strong></span>
                            <span>•</span>
                            {isPublished ? (
                              <span className="text-emerald-700 font-extrabold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Vetted &amp; Live on Partner Portal {doc.publishedBy ? `(Signed by ${doc.publishedBy})` : ''}
                              </span>
                            ) : (
                              <span className="text-amber-800 font-extrabold flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <Lock className="w-3.5 h-3.5 text-amber-600" />
                                Internal Draft • Hidden from Foreign Donors
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Publication Gate Switch */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTogglePublication(doc.projectId, doc.id, doc.name, !isPublished)}
                          className={`px-3.5 py-2 font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer ${
                            isPublished
                              ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                          }`}
                          title={isPublished ? 'Recall to internal draft' : 'Publish to foreign donor portal'}
                        >
                          {isPublished ? (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Recall to Draft</span>
                            </>
                          ) : (
                            <>
                              <Globe2 className="w-3.5 h-3.5" />
                              <span>Sign &amp; Publish to Donors</span>
                            </>
                          )}
                        </button>

                        <Link
                          href={`/projects/${doc.projectId}/documents`}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition text-xs font-bold flex items-center gap-1"
                          title="Open Project Document Library"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Inspect</span>
                        </Link>

                        <Link
                          href={`/donor-dashboard?partner=${doc.partnerKey}`}
                          target="_blank"
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition text-xs font-bold flex items-center gap-1"
                          title="View on Live Donor Dashboard"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-10 text-center space-y-2">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No Documents Found for This Filter</p>
                  <p className="text-[11px] text-slate-400">Try adjusting your partner filter or search query above.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DESK 2: PROGRAMS & FIELD OPERATIONS DESK                                 */}
      {/* ========================================================================= */}
      {activeDeskTab === 'PROGRAMS_DESK' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <FolderKanban className="w-5 h-5 text-blue-600" />
                  Active Program Portfolio &amp; Field Workspaces ({projects.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Select a project to access its Form-3 Master Charter, Compliance Documents, Kanban Task Board, and Closing Audits.
                </p>
              </div>

              <Link
                href="/projects"
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>View Full Projects Register</span> &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <div
                  key={project.pid}
                  className="bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3 transition shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                    <span className="font-mono text-xs font-black text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-lg border border-blue-200">
                      {project.pid}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      project.statusCategory === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-blue-100 text-blue-800 border-blue-300'
                    }`}>
                      {project.statusLabel}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-900 line-clamp-2 leading-snug">{project.title}</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1">{project.partner}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-xl border border-slate-200/80">
                    <div>
                      <span className="text-slate-400">Budget:</span>
                      <p className="font-bold text-emerald-700 font-mono">
                        {formatCurrencyString(project.budgetAmount, project.currency)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Beneficiaries:</span>
                      <p className="font-bold text-slate-800">{project.beneficiariesCount} Target</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400">Field Desk:</span>
                      <p className="font-medium text-slate-700 truncate">{project.location}</p>
                    </div>
                  </div>

                  {/* Operational Action Shortcuts */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                    <Link
                      href={`/projects/${project.pid}/documents`}
                      className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg border border-blue-200 text-center transition flex items-center justify-center gap-1"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" /> Docs ({project.primaryDocs.length})
                    </Link>
                    <Link
                      href={`/projects/${project.pid}/charter`}
                      className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg border border-slate-200 text-center transition flex items-center justify-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" /> Form-3
                    </Link>
                    <Link
                      href={`/projects/${project.pid}/closing-report`}
                      className="py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg border border-purple-200 text-center transition flex items-center justify-center gap-1"
                    >
                      <Award className="w-3.5 h-3.5" /> Audit Sign-off
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DESK 3: DONOR OBJECTIONS & AUDIT CLARIFICATION DESK                       */}
      {/* ========================================================================= */}
      {activeDeskTab === 'DONOR_QUERIES' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Donor Objections &amp; Special Document Requests ({donorTickets.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Realtime inquiries and compliance clarification tickets submitted by foreign donors on /donor-dashboard.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-300">
                {pendingTicketsCount} Pending Officer Response
              </span>
              <Link 
                href="/donor-dashboard" 
                target="_blank"
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                Inspect Live Partner View &rsaquo;
              </Link>
            </div>
          </div>

          {/* Ticket List */}
          {donorTickets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {donorTickets.map((ticket) => (
                <div 
                  key={ticket.id}
                  className={`p-4 rounded-2xl border space-y-3 transition-all ${
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

                  <p className="text-xs text-slate-700 italic bg-white p-2.5 rounded-xl border border-slate-200/80">
                    &ldquo;{ticket.message}&rdquo;
                  </p>

                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                    <span>Assigned: <strong>{ticket.assignedOfficerName}</strong></span>
                    <span>{ticket.createdAt}</span>
                  </div>

                  {ticket.officerResponse ? (
                    <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-200 text-xs space-y-1">
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
                      type="button"
                      onClick={() => {
                        setActiveResponseTicket(ticket);
                        setResponseText('');
                        setAttachmentName('');
                      }}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" /> Post Officer Clarification Response
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No Pending Donor Audit Clarification Queries</p>
              <p className="text-[11px] text-slate-400">
                Clarification requests sent by donors in the Partner Command Portal will appear here in real-time.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DESK 4: HQ CORE OPERATIONAL GATEWAYS                                      */}
      {/* ========================================================================= */}
      {activeDeskTab === 'ALL_MODULES' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-black text-slate-900">Core Portal Functional Desks</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              href="/finance/approvals" 
              className="group p-5 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition space-y-2 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-600" />
                  Finance &amp; Expense Approvals Desk
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-xs text-slate-500">
                Multi-tier approval workflows (PM &rarr; Finance &rarr; Executive Director) and grant disbursements.
              </p>
            </Link>

            <Link 
              href="/community" 
              className="group p-5 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 transition space-y-2 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  HQ Staff Community &amp; Presence
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-xs text-slate-500">
                Live officer presence, interactive profile cards, WhatsApp/Call shortcuts, and public bulletins.
              </p>
            </Link>

            <Link 
              href="/me/dashboard" 
              className="group p-5 rounded-2xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 transition space-y-2 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 group-hover:text-purple-600 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                  M&amp;E &amp; Field Analytics
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-xs text-slate-500">
                District coverage metrics, indicator logframes, beneficiary verification, and telemetry charts.
              </p>
            </Link>

            <Link 
              href="/me/report-generator" 
              className="group p-5 rounded-2xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 transition space-y-2 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 group-hover:text-amber-600 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  AI Donor Narrative &amp; Form-7 Generator
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-xs text-slate-500">
                Automated humanitarian donor narratives in English and Turkish matching INGO audit standards.
              </p>
            </Link>

            <Link 
              href="/admin/users" 
              className="group p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition space-y-2 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Admin Governance &amp; RBAC Security
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-xs text-slate-500">
                Multi-tenant access control, role promotions, Super Admin audits, and officer account approval.
              </p>
            </Link>

            <Link 
              href="/me/profile" 
              className="group p-5 rounded-2xl border border-slate-200 hover:border-cyan-500 hover:bg-cyan-50/50 transition space-y-2 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 group-hover:text-cyan-600 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-cyan-600" />
                  Officer Profile &amp; Organogram Gateway
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-xs text-slate-500">
                Official staff ID card, QR code verification, duty station management, and designation presets.
              </p>
            </Link>
          </div>
        </div>
      )}

      {/* MODAL: POST OFFICER RESPONSE */}
      {activeResponseTicket && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
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

            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-xs space-y-1">
              <p className="font-bold text-amber-900">Donor Query / Objection Message:</p>
              <p className="text-amber-950 italic">&ldquo;{activeResponseTicket.message}&rdquo;</p>
            </div>

            <form onSubmit={handlePostClarification} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Official Clarification Statement</label>
                <textarea
                  rows={4}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Provide precise explanation or reference to attached clarification letter..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 outline-none focus:border-blue-500"
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
                  <Send className="w-4 h-4" /> Post &amp; Send to Donor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
