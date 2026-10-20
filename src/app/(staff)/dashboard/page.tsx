'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  UserPlus,
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
  respondToDonorQuery,
  addMessageToTicket,
  getTicketMessages,
  playNotificationSound,
  DonorQueryService
} from '@/server/services/donorQueryService';
import { CloudSyncService } from '@/server/services/cloudSyncService';
import { formatCurrencyString } from '@/server/services/multiCurrency';
import { ProjectAssignmentService, AssignableOfficer } from '@/server/services/projectAssignmentService';
import { DEFAULT_APPROVED_USERS } from '@/server/services/userApprovalService';

export default function StaffDashboardPage() {
  const [designation, setDesignation] = useState<string>('Program Officer');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Separated Desk Tabs
  const [activeDeskTab, setActiveDeskTab] = useState<'EXECUTIVE_DESK' | 'PROGRAMS_DESK' | 'DONOR_QUERIES' | 'ALL_MODULES'>('PROGRAMS_DESK');

  // Projects State
  const [projects, setProjects] = useState<SKBDonorGrantProject[]>(DEFAULT_PARTNER_PROJECTS);
  const [partnerFilter, setPartnerFilter] = useState<'ALL' | PartnerWorkspaceKey>('ALL');
  const [publicationStatusFilter, setPublicationStatusFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED'>('ALL');
  const [searchDocQuery, setSearchDocQuery] = useState('');

  // Executive Officer Assignment Modal State
  const [assigningProject, setAssigningProject] = useState<SKBDonorGrantProject | null>(null);
  const [selectedOfficerNames, setSelectedOfficerNames] = useState<string[]>([]);
  const [availableOfficers, setAvailableOfficers] = useState<AssignableOfficer[]>([]);

  // Donor Objections & Query State
  const [donorTickets, setDonorTickets] = useState<DonorQueryTicket[]>(INITIAL_DONOR_QUERIES);
  const prevTicketsRef = useRef<DonorQueryTicket[]>([]);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [replyAttachmentMap, setReplyAttachmentMap] = useState<Record<string, string>>({});
  const [replyFileMap, setReplyFileMap] = useState<Record<string, { name: string; url: string; type: 'image' | 'file'; size?: string } | null>>({});
  const [showAttachmentInput, setShowAttachmentInput] = useState<Record<string, boolean>>({});
  const [activeResponseTicket, setActiveResponseTicket] = useState<DonorQueryTicket | null>(null);
  const [responseText, setResponseText] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [successToast, setSuccessToast] = useState('');

  useEffect(() => {
    setAvailableOfficers(ProjectAssignmentService.getAssignableOfficers());

    const resolveAuthUser = async () => {
      const storedAuthor = typeof window !== 'undefined' ? localStorage.getItem('skb_current_community_author') : null;
      const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('skb_current_user_email') : null;

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      let matchedUser = undefined;
      if (user) {
        const email = user.email || '';
        const metaName = user.user_metadata?.full_name;
        matchedUser = DEFAULT_APPROVED_USERS.find(
          u => u.email.toLowerCase() === email.toLowerCase() || (metaName && u.fullName.toLowerCase() === metaName.toLowerCase())
        );
      }

      if (!matchedUser && (storedAuthor || storedEmail)) {
        matchedUser = DEFAULT_APPROVED_USERS.find(
          u => (storedAuthor && u.fullName.toLowerCase() === storedAuthor.toLowerCase()) ||
               (storedEmail && u.email.toLowerCase() === storedEmail.toLowerCase())
        );
      }

      if (matchedUser) {
        setCurrentUserName(matchedUser.fullName);
        setCurrentUserEmail(matchedUser.email);
        setDesignation(matchedUser.designation || matchedUser.requestedRole || 'Program Officer');
        
        // Determine initial desk based on role
        const isExec = matchedUser.fullName.toLowerCase().includes('huraira') || 
                       matchedUser.email.toLowerCase() === 'kindnessforbeauty@gmail.com' ||
                       (matchedUser.designation || '').toLowerCase().includes('executive director') ||
                       matchedUser.fullName.toLowerCase().includes('orakatul');
        setActiveDeskTab(isExec ? 'EXECUTIVE_DESK' : 'PROGRAMS_DESK');
      } else {
        // Fallback default
        const fallback = DEFAULT_APPROVED_USERS[2]; // Daloyar Hassan (Program Officer / HR)
        setCurrentUserName(fallback.fullName);
        setCurrentUserEmail(fallback.email);
        setDesignation(fallback.designation || fallback.requestedRole || 'Program Officer');
        setActiveDeskTab('PROGRAMS_DESK');
      }

      setIsLoadingAuth(false);
    };

    resolveAuthUser();
  }, []);

  // Merge any local uploaded project documents & assignments on mount
  useEffect(() => {
    const loadProjectsWithDocsAndAssignments = () => {
      const updatedProjects = DEFAULT_PARTNER_PROJECTS.map((proj) => {
        // 1. Sync assignments from ProjectAssignmentService
        const currentAssigned = ProjectAssignmentService.getAssignedOfficers(proj.pid, proj.assignedOfficer);

        // 2. Sync documents
        let mergedDocs = [...proj.primaryDocs];
        if (typeof window !== 'undefined') {
          const storedDocs = localStorage.getItem(`skb_documents_${proj.pid}`);
          if (storedDocs) {
            try {
              const parsed = JSON.parse(storedDocs);
              if (Array.isArray(parsed) && parsed.length > 0) {
                for (const d of parsed) {
                  const idx = mergedDocs.findIndex((md) => md.id === d.id || md.name === d.name);
                  if (idx >= 0) {
                    mergedDocs[idx] = { ...mergedDocs[idx], ...d };
                  } else {
                    mergedDocs.push(d);
                  }
                }
              }
            } catch (err) {
              console.warn('Failed parsing stored docs', err);
            }
          }
        }

        return { 
          ...proj, 
          assignedOfficers: currentAssigned,
          primaryDocs: mergedDocs 
        };
      });

      setProjects(updatedProjects);
    };

    loadProjectsWithDocsAndAssignments();

    // Load and poll live donor tickets from Supabase
    DonorQueryService.fetchTickets().then((loaded) => {
      if (loaded && loaded.length > 0) {
        setDonorTickets(loaded);
        prevTicketsRef.current = loaded;
      }
    });

    const ticketPoll = setInterval(async () => {
      const latest = await DonorQueryService.fetchTickets();
      if (latest && latest.length > 0) {
        // Automatic notification chime & toast if new donor message arrived
        if (prevTicketsRef.current.length > 0) {
          for (const newT of latest) {
            const oldT = prevTicketsRef.current.find(p => p.id === newT.id);
            const newMsgs = getTicketMessages(newT);
            const oldMsgs = oldT ? getTicketMessages(oldT) : [];
            const lastNew = newMsgs[newMsgs.length - 1];
            const lastOld = oldMsgs[oldMsgs.length - 1];
            if (
              lastNew && 
              lastNew.sender === 'donor' && 
              (!lastOld || lastNew.id !== lastOld.id || lastNew.text !== lastOld.text)
            ) {
              playNotificationSound();
              setSuccessToast(`🔔 New message from ${lastNew.senderName} (${newT.pid}): "${lastNew.text}"`);
              setTimeout(() => setSuccessToast(''), 6000);
              break;
            }
          }
        }
        prevTicketsRef.current = latest;
        setDonorTickets(latest);
      }
    }, 4000);

    // Listen for cross-component assignment updates
    const handleAssignmentsChanged = () => {
      loadProjectsWithDocsAndAssignments();
    };
    window.addEventListener('skb_assignments_changed', handleAssignmentsChanged);
    return () => {
      window.removeEventListener('skb_assignments_changed', handleAssignmentsChanged);
      clearInterval(ticketPoll);
    };
  }, []);

  // Role Checks
  const isExecutiveDirector = 
    currentUserName.toLowerCase().includes('huraira') ||
    currentUserEmail.toLowerCase() === 'kindnessforbeauty@gmail.com' ||
    designation.toLowerCase().includes('executive director');

  const isChairman = 
    currentUserName.toLowerCase().includes('orakatul') ||
    designation.toLowerCase().includes('chairman');

  const canManageExecutiveGate = isExecutiveDirector || isChairman;
  const isProgramOfficer = !canManageExecutiveGate;

  // Filtered Projects for Current User
  // Program Officers ONLY see their assigned projects!
  const displayedProjects = useMemo(() => {
    if (canManageExecutiveGate) {
      return projects;
    }
    return projects.filter(p => 
      ProjectAssignmentService.isUserAssigned(p.pid, currentUserName, currentUserEmail, p.assignedOfficer)
    );
  }, [projects, canManageExecutiveGate, currentUserName, currentUserEmail]);

  // Filtered Donor Tickets for Current User
  const relevantDonorTickets = useMemo(() => {
    if (canManageExecutiveGate) return donorTickets;
    const myPids = new Set(displayedProjects.map(p => p.pid));
    return donorTickets.filter(t => 
      myPids.has(t.pid) || 
      (currentUserName && t.assignedOfficerName.toLowerCase().includes(currentUserName.toLowerCase()))
    );
  }, [donorTickets, displayedProjects, canManageExecutiveGate, currentUserName]);

  const pendingTicketsCount = relevantDonorTickets.filter((t) => t.status === 'Pending Officer Review').length;

  // Flatten all documents for the Quality Control Gate (Executive View)
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
    if (!canManageExecutiveGate) {
      alert('Permission Denied: Only the Executive Director (Md. Abu Huraira) has signatory authority to publish files to foreign donor workspaces.');
      return;
    }

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

  // Open Officer Assignment Modal (Executive Director Only)
  const handleOpenAssignModal = (project: SKBDonorGrantProject) => {
    if (!canManageExecutiveGate) {
      alert('Only the Executive Director can assign officers to projects.');
      return;
    }
    setAssigningProject(project);
    const current = ProjectAssignmentService.getAssignedOfficers(project.pid, project.assignedOfficer);
    setSelectedOfficerNames(current);
  };

  const handleToggleOfficerSelection = (officerName: string) => {
    setSelectedOfficerNames((prev) => {
      if (prev.includes(officerName)) {
        return prev.filter(n => n !== officerName);
      } else {
        return [...prev, officerName];
      }
    });
  };

  const handleSaveAssignments = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningProject) return;

    if (selectedOfficerNames.length === 0) {
      alert('Please select at least one officer to be assigned to this project.');
      return;
    }

    ProjectAssignmentService.setAssignedOfficers(assigningProject.pid, selectedOfficerNames);

    setProjects((prev) => prev.map((p) => {
      if (p.pid === assigningProject.pid) {
        return {
          ...p,
          assignedOfficers: selectedOfficerNames,
          assignedOfficer: selectedOfficerNames[0] || p.assignedOfficer
        };
      }
      return p;
    }));

    setSuccessToast(`Officers assigned to "${assigningProject.title}": ${selectedOfficerNames.join(', ')}`);
    setAssigningProject(null);
    setTimeout(() => setSuccessToast(''), 4500);
  };

  const handlePostClarification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeResponseTicket || !responseText.trim()) return;

    const responderName = currentUserName || 'Program Officer';
    const responderRole = designation || 'Program Officer (Assigned)';

    const updatedTicket = respondToDonorQuery(
      activeResponseTicket,
      responderName,
      responderRole,
      responseText,
      attachmentName.trim() || undefined
    );

    const updatedList = donorTickets.map((t) => (t.id === updatedTicket.id ? updatedTicket : t));
    setDonorTickets(updatedList);
    DonorQueryService.saveTicket(updatedTicket);
    setSuccessToast(`Clarification posted for ${updatedTicket.id} (${updatedTicket.pid})! Synchronized with International Donor Workspace.`);
    setActiveResponseTicket(null);
    setResponseText('');
    setAttachmentName('');
    setTimeout(() => setSuccessToast(''), 4500);
  };

  const handleStaffFileSelect = (ticketId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImg = file.type.startsWith('image/');
    const fileName = file.name;

    const reader = new FileReader();
    reader.onload = async (readEvt) => {
      const dataUrl = readEvt.target?.result as string;
      setReplyFileMap(prev => ({
        ...prev,
        [ticketId]: {
          name: fileName,
          url: dataUrl,
          type: isImg ? 'image' : 'file',
          size: `${(file.size / 1024).toFixed(0)} KB`,
        }
      }));

      // Background upload
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', 'GENERAL');
        formData.append('docName', fileName);

        const res = await fetch('/api/storage/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.fileUrl) {
            setReplyFileMap(prev => ({
              ...prev,
              [ticketId]: prev[ticketId] ? { ...prev[ticketId]!, url: json.fileUrl } : null,
            }));
          }
        }
      } catch (err) {
        console.warn('Storage upload fallback to Data URL', err);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSendInlineReply = (ticket: DonorQueryTicket) => {
    const text = replyTextMap[ticket.id]?.trim();
    const attached = replyFileMap[ticket.id];
    if (!text && !attached) return;

    const responderName = currentUserName || 'Program Officer';
    const responderRole = designation || 'Program Officer (Assigned)';
    const attName = attached?.name || replyAttachmentMap[ticket.id]?.trim() || undefined;
    const attUrl = attached?.url || undefined;
    const attType = attached?.type || undefined;

    const updatedTicket = addMessageToTicket(
      ticket,
      'officer',
      responderName,
      text || (attName ? `Attached: ${attName}` : 'Response'),
      responderRole,
      attName,
      attUrl,
      attType
    );

    setDonorTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
    DonorQueryService.saveTicket(updatedTicket);
    setSuccessToast(`Reply sent to ${ticket.donorName}!`);
    setReplyTextMap(prev => ({ ...prev, [ticket.id]: '' }));
    setReplyAttachmentMap(prev => ({ ...prev, [ticket.id]: '' }));
    setReplyFileMap(prev => ({ ...prev, [ticket.id]: null }));
    setTimeout(() => setSuccessToast(''), 4000);
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
            <Building2 className="w-3.5 h-3.5" /> SKB Operations Desk • {designation}
          </div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>{isProgramOfficer ? `${currentUserName} — Assigned Projects Workspace` : 'Executive Directorate & Staff Workspace'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {isProgramOfficer
              ? `Focused operational workspace. You only see and manage the projects assigned to your desk by the Executive Director.`
              : `Executive directorate oversight, bilateral partner quality control sign-offs, and officer project assignments.`}
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
            <span>My Profile &amp; ID Desk</span>
          </Link>
        </div>
      </div>

      {/* Officer Operational Workspace Bar */}
      {isProgramOfficer && (
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 font-bold border border-blue-100">
              <FolderKanban className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-slate-900">
                Assigned Projects: {displayedProjects.length} Active Charters
              </p>
              <p className="text-slate-500 text-[11px]">
                Assigned to your desk by Executive Director Md. Abu Huraira.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1 rounded-xl shrink-0 self-start sm:self-auto">
            Officer: <strong className="text-slate-900">{currentUserName}</strong>
          </span>
        </div>
      )}

      {/* SEPARATED DESKS SELECTOR TABS */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 flex flex-wrap items-center gap-1.5">
        {/* Executive Director Desk Tab (ONLY for Executive Director / Chairman) */}
        {canManageExecutiveGate && (
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
        )}

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
          <span>{isProgramOfficer ? 'My Assigned Projects & Deliverables' : 'All Programs & Operations'} ({displayedProjects.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveDeskTab('DONOR_QUERIES')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeDeskTab === 'DONOR_QUERIES'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/60'
          }`}
        >
          <MessageSquare className={`w-4 h-4 ${activeDeskTab === 'DONOR_QUERIES' ? 'text-blue-200' : 'text-blue-600'}`} />
          <span>{isProgramOfficer ? 'Partner Messages' : 'All Partner Messages'} ({relevantDonorTickets.length})</span>
          {pendingTicketsCount > 0 && (
            <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-1.5 py-0.2 rounded-full">
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
      {/* DESK 1: EXECUTIVE DIRECTORATE DESK & PUBLICATION GATE (Executive Only)    */}
      {/* ========================================================================= */}
      {canManageExecutiveGate && activeDeskTab === 'EXECUTIVE_DESK' && (
        <div className="space-y-6 animate-in fade-in duration-150">
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
      {/* DESK 2: PROGRAMS & FIELD OPERATIONS DESK (FOCUSED OPERATIONAL VIEW)       */}
      {/* ========================================================================= */}
      {activeDeskTab === 'PROGRAMS_DESK' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <FolderKanban className="w-5 h-5 text-blue-600" />
                  <span>{isProgramOfficer ? 'My Responsible Assigned Project Charters' : 'Organization Project Portfolio'}</span>
                  <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full">
                    {displayedProjects.length} Project{displayedProjects.length === 1 ? '' : 's'}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  {isProgramOfficer
                    ? 'Execute Form-3 charters, field vouchers, biometric beneficiary registers, and donor milestones for your assigned portfolio.'
                    : 'Executive overview of all registered projects. Assign one or more operational officers to each charter.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/projects"
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <span>Open Full Projects Register</span> &rarr;
                </Link>
              </div>
            </div>

            {displayedProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedProjects.map((project) => {
                  const assignedList = project.assignedOfficers && project.assignedOfficers.length > 0
                    ? project.assignedOfficers
                    : [project.assignedOfficer];

                  return (
                    <div
                      key={project.pid}
                      className="bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3.5 transition shadow-xs flex flex-col justify-between"
                    >
                      <div className="space-y-2">
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
                          <p className="text-xs text-slate-500 font-semibold mt-0.5">{project.partner}</p>
                        </div>

                        {/* Assigned Officers Bar */}
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <Users className="w-3 h-3 text-blue-600" /> Assigned:
                            </span>
                            {assignedList.map((officerName) => {
                              const isMe = currentUserName && officerName.toLowerCase().includes(currentUserName.toLowerCase());
                              return (
                                <span
                                  key={officerName}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                    isMe
                                      ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                                      : 'bg-slate-100 text-slate-800 border-slate-200'
                                  }`}
                                >
                                  {officerName} {isMe ? '(You)' : ''}
                                </span>
                              );
                            })}
                          </div>

                          {/* Executive Director Can Reassign Officers */}
                          {canManageExecutiveGate && (
                            <button
                              type="button"
                              onClick={() => handleOpenAssignModal(project)}
                              className="text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                              title="Assign or reassign operational officers"
                            >
                              <UserPlus className="w-3 h-3" />
                              <span>Assign Officers</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-xl border border-slate-200/80">
                          <div>
                            <span className="text-slate-400">Approved Budget:</span>
                            <p className="font-bold text-emerald-700 font-mono">
                              {formatCurrencyString(project.budgetAmount, project.currency)}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400">Target Beneficiaries:</span>
                            <p className="font-bold text-slate-800">{project.beneficiariesCount} Target</p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-400">Official Field Station:</span>
                            <p className="font-medium text-slate-700 truncate">{project.location}</p>
                          </div>
                        </div>
                      </div>

                      {/* Operational Action Shortcuts */}
                      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-200/60 text-[11px]">
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
                          href={`/projects/${project.pid}/beneficiaries`}
                          className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg border border-emerald-200 text-center transition flex items-center justify-center gap-1"
                        >
                          <Users className="w-3.5 h-3.5" /> Beneficiaries
                        </Link>
                        <Link
                          href={`/projects/${project.pid}/kanban`}
                          className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg border border-slate-200 text-center transition flex items-center justify-center gap-1"
                        >
                          <CheckSquare className="w-3.5 h-3.5" /> Kanban
                        </Link>
                        <Link
                          href={`/projects/${project.pid}/logframe`}
                          className="py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg border border-indigo-200 text-center transition flex items-center justify-center gap-1"
                        >
                          <Layers className="w-3.5 h-3.5" /> Logframe
                        </Link>
                        <Link
                          href={`/projects/${project.pid}/closing-report`}
                          className="py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg border border-purple-200 text-center transition flex items-center justify-center gap-1"
                        >
                          <Award className="w-3.5 h-3.5" /> Audit Sign-off
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center space-y-3">
                <FolderKanban className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-900">No Projects Currently Assigned to Your Desk</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  You are logged in as <strong className="text-slate-800">{currentUserName}</strong> ({designation}).
                  Only the Executive Director (Md. Abu Huraira) assigns officers to project charters. Once an assignment is made, your project workspace will appear here automatically.
                </p>
                <div className="pt-2">
                  <Link
                    href="/community"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Contact Executive Director in Community
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DESK 3: PARTNER MESSAGES & INQUIRIES DESK                                  */}
      {/* ========================================================================= */}
      {activeDeskTab === 'DONOR_QUERIES' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {isProgramOfficer ? 'Partner Conversations & Messages' : 'All Donor Messages & Inquiries'} ({relevantDonorTickets.length})
                </h2>
                <p className="text-xs text-slate-500">
                  {isProgramOfficer 
                    ? 'Direct communication with international donors for your assigned projects.' 
                    : 'Real-time messages and inquiries across all foreign partner desks.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-blue-50 text-blue-800 px-3 py-1 rounded-full border border-blue-200">
                {pendingTicketsCount} Pending Reply
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

          {/* Conversations List */}
          {relevantDonorTickets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relevantDonorTickets.map((ticket) => {
                const threadMessages = getTicketMessages(ticket);
                const hasPendingReply = ticket.status === 'Pending Officer Review';

                return (
                  <div 
                    key={ticket.id}
                    className={`p-5 rounded-2xl border space-y-3.5 transition-all flex flex-col justify-between ${
                      hasPendingReply
                        ? 'bg-blue-50/20 border-blue-200 shadow-xs'
                        : 'bg-slate-50/70 border-slate-200'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex justify-between items-center border-b border-slate-200/60 pb-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                            {ticket.pid}
                          </span>
                          <span className="text-slate-500 font-mono text-[11px]">{ticket.id}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          ticket.status === 'Officer Clarification Posted'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}>
                          {ticket.status === 'Officer Clarification Posted' ? '● Replied' : '● Needs Reply'}
                        </span>
                      </div>

                      {/* Partner Info */}
                      <div className="pt-2">
                        <p className="text-xs font-bold text-slate-900">{ticket.donorName}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{ticket.donorEmail}</p>
                      </div>

                      {/* Messages Thread */}
                      <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
                        {threadMessages.map((msg) => {
                          const isOfficer = msg.sender === 'officer';
                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isOfficer ? 'items-end' : 'items-start'}`}
                            >
                              <span className="text-[10px] text-slate-400 mb-0.5 px-1">
                                {isOfficer ? `${msg.senderName} (You)` : msg.senderName} • {msg.createdAt}
                              </span>
                              <div
                                className={`p-2.5 rounded-2xl text-xs max-w-[90%] leading-relaxed ${
                                  isOfficer
                                    ? 'bg-blue-600 text-white rounded-tr-xs shadow-2xs'
                                    : 'bg-white border border-slate-200 text-slate-900 rounded-tl-xs shadow-2xs'
                                }`}
                              >
                                <p>{msg.text}</p>
                                {msg.attachmentUrl ? (
                                  msg.attachmentType === 'image' || msg.attachmentName?.match(/\.(png|jpe?g|webp|gif|svg)$/i) || msg.attachmentUrl.startsWith('data:image/') ? (
                                    <div className="mt-2 rounded-xl overflow-hidden border border-slate-200/80 bg-white max-w-[260px]">
                                      <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block cursor-zoom-in">
                                        <img
                                          src={msg.attachmentUrl}
                                          alt={msg.attachmentName || 'Screenshot attachment'}
                                          className="max-h-40 w-full object-cover hover:opacity-95 transition"
                                        />
                                      </a>
                                      <div className="bg-slate-50 px-2 py-1 text-[10px] text-slate-600 flex items-center justify-between border-t border-slate-100">
                                        <span className="truncate max-w-[150px] font-medium">{msg.attachmentName || 'Screenshot'}</span>
                                        <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline flex items-center gap-0.5">
                                          <span>View</span>
                                          <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                      </div>
                                    </div>
                                  ) : (
                                    <a
                                      href={msg.attachmentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 mt-2 bg-white text-blue-700 px-2.5 py-1.5 rounded-xl border border-blue-200 text-[11px] font-bold hover:bg-blue-50 transition shadow-2xs"
                                    >
                                      <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                                      <span className="truncate max-w-[170px]">{msg.attachmentName || 'Document'}</span>
                                      <ExternalLink className="w-3 h-3 text-slate-400" />
                                    </a>
                                  )
                                ) : msg.attachmentName ? (
                                  <div className={`mt-1.5 pt-1 border-t text-[10px] font-bold flex items-center gap-1 ${
                                    isOfficer ? 'border-blue-400/50 text-blue-100' : 'border-slate-200 text-blue-700'
                                  }`}>
                                    <Paperclip className="w-3 h-3" />
                                    <span>{msg.attachmentName}</span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Inline Quick Reply Box */}
                    <div className="pt-2 border-t border-slate-200/70 space-y-2">
                      {replyFileMap[ticket.id] && (
                        <div className="px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            {replyFileMap[ticket.id]?.type === 'image' ? (
                              <img
                                src={replyFileMap[ticket.id]?.url}
                                alt="Attachment"
                                className="w-8 h-8 object-cover rounded-lg border border-blue-200 shrink-0"
                              />
                            ) : (
                              <Paperclip className="w-4 h-4 text-blue-600 shrink-0" />
                            )}
                            <span className="font-bold text-slate-900 truncate text-[11px]">
                              {replyFileMap[ticket.id]?.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setReplyFileMap(prev => ({ ...prev, [ticket.id]: null }))}
                            className="text-slate-400 hover:text-slate-700"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSendInlineReply(ticket);
                        }}
                        className="space-y-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            id={`file_input_${ticket.id}`}
                            onChange={(e) => handleStaffFileSelect(ticket.id, e)}
                            accept="image/*,.pdf,.doc,.docx,.xlsx,.txt"
                            className="hidden"
                          />

                          <button
                            type="button"
                            onClick={() => document.getElementById(`file_input_${ticket.id}`)?.click()}
                            className="p-2 bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-700 rounded-xl border border-slate-200 transition shrink-0 cursor-pointer"
                            title="Attach screenshot or file"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="text"
                            value={replyTextMap[ticket.id] || ''}
                            onChange={(e) => setReplyTextMap(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                            placeholder={`Reply to ${ticket.donorName}...`}
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 transition"
                          />
                          <button
                            type="submit"
                            disabled={!replyTextMap[ticket.id]?.trim() && !replyFileMap[ticket.id]}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Reply</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No Active Partner Conversations</p>
              <p className="text-[11px] text-slate-400">
                Messages sent by donors in the Partner Portal will appear here in real time.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DESK 4: HQ CORE OPERATIONAL GATEWAYS                                      */}
      {/* ========================================================================= */}
      {activeDeskTab === 'ALL_MODULES' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 animate-in fade-in duration-150">
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

      {/* ========================================================================= */}
      {/* MODAL: EXECUTIVE DIRECTOR PROJECT OFFICER ASSIGNMENT                      */}
      {/* ========================================================================= */}
      {assigningProject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">Executive Governance Mandate</span>
                <h3 className="text-base font-extrabold text-slate-900">Assign Officers to Project</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{assigningProject.pid}</p>
              </div>
              <button 
                onClick={() => setAssigningProject(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl text-xs space-y-1">
              <p className="font-bold text-blue-900 truncate">{assigningProject.title}</p>
              <p className="text-blue-800 text-[11px]">
                Select one or more officers to execute this project charter. Only assigned officers can view and work on this project in their desk.
              </p>
            </div>

            <form onSubmit={handleSaveAssignments} className="space-y-4">
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <span className="text-xs font-bold text-slate-700 block">Available SKB Personnel:</span>
                {availableOfficers.map((officer) => {
                  const isChecked = selectedOfficerNames.includes(officer.name);
                  return (
                    <label
                      key={officer.id}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition ${
                        isChecked 
                          ? 'bg-blue-50/80 border-blue-300 text-blue-950 font-bold' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleOfficerSelection(officer.name)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-xs font-bold">{officer.name}</p>
                          <p className="text-[10px] text-slate-500 font-normal">{officer.role} • {officer.department}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{officer.dutyStation}</span>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium">
                  {selectedOfficerNames.length} Officer{selectedOfficerNames.length === 1 ? '' : 's'} Selected
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAssigningProject(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Save Assignments
                  </button>
                </div>
              </div>
            </form>
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
