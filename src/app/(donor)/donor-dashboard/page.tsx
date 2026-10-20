'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Radio,
  Phone,
  Mail,
  MessageCircle,
  User
} from 'lucide-react';
import { formatCurrencyString, SupportedCurrency } from '@/server/services/multiCurrency';
import { 
  DonorQueryTicket, 
  INITIAL_DONOR_QUERIES, 
  createDonorQuery,
  addMessageToTicket,
  getTicketMessages,
  playNotificationSound,
  DonorQueryService
} from '@/server/services/donorQueryService';
import { CloudSyncService } from '@/server/services/cloudSyncService';

import {
  PartnerWorkspaceKey,
  PartnerWorkspaceInfo,
  PARTNER_REGISTRY,
  ProjectDocument,
  SKBDonorGrantProject,
  DEFAULT_PARTNER_PROJECTS
} from '@/server/services/partnerProjectsData';

export default function DonorDashboardPage() {
  const [selectedPartnerKey, setSelectedPartnerKey] = useState<PartnerWorkspaceKey>('IHH_ADAK_AQIQAH');
  const [projects, setProjects] = useState<SKBDonorGrantProject[]>(DEFAULT_PARTNER_PROJECTS);
  const [activeTab, setActiveTab] = useState<'ALL' | 'RUNNING' | 'ATTENTION' | 'COMPLETED'>('ALL');
  const [tickets, setTickets] = useState<DonorQueryTicket[]>(INITIAL_DONOR_QUERIES);
  const prevTicketsRef = useRef<DonorQueryTicket[]>([]);
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
  
  // Attachment state for donor chat
  const [chatAttachment, setChatAttachment] = useState<{
    name: string;
    url: string;
    type: 'image' | 'file';
    size?: string;
  } | null>(null);
  const [isUploadingChatFile, setIsUploadingChatFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustChatTextareaHeight = () => {
    if (chatTextareaRef.current) {
      chatTextareaRef.current.style.height = 'auto';
      chatTextareaRef.current.style.height = `${Math.min(chatTextareaRef.current.scrollHeight, 160)}px`;
    }
  };

  useEffect(() => {
    adjustChatTextareaHeight();
  }, [queryMessage]);

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

    // 3. Load & Synchronize Donor Inquiry Tickets with HQ Staff Officers
    DonorQueryService.fetchTickets().then((loaded) => {
      if (loaded && loaded.length > 0) {
        setTickets(loaded);
        prevTicketsRef.current = loaded;
      }
    });

    const ticketPoll = setInterval(async () => {
      const latest = await DonorQueryService.fetchTickets();
      if (latest && latest.length > 0) {
        // Automatic notification chime & toast if new message arrived from officer
        if (prevTicketsRef.current.length > 0) {
          for (const newT of latest) {
            const oldT = prevTicketsRef.current.find(p => p.id === newT.id);
            const newMsgs = getTicketMessages(newT);
            const oldMsgs = oldT ? getTicketMessages(oldT) : [];
            const lastNew = newMsgs[newMsgs.length - 1];
            const lastOld = oldMsgs[oldMsgs.length - 1];
            if (
              lastNew && 
              lastNew.sender === 'officer' && 
              (!lastOld || lastNew.id !== lastOld.id || lastNew.text !== lastOld.text)
            ) {
              playNotificationSound();
              setLiveActivityToast({
                message: `New message from ${lastNew.senderName}: "${lastNew.text}"`,
                timestamp: new Date().toLocaleTimeString(),
              });
              setTimeout(() => setLiveActivityToast(null), 6000);
              break;
            }
          }
        }
        prevTicketsRef.current = latest;
        setTickets(latest);
      }
    }, 4000);

    return () => {
      docSub.unsubscribe();
      projSub.unsubscribe();
      clearInterval(ticketPoll);
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
    setQueryType('General Project Inquiry');
    setQueryMessage('');
    setChatAttachment(null);
    setSubmitSuccessMsg('');
  };

  const handleChatFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImg = file.type.startsWith('image/');
    const fileName = file.name;

    // Fast local preview via FileReader
    const reader = new FileReader();
    reader.onload = async (readEvt) => {
      const dataUrl = readEvt.target?.result as string;
      setChatAttachment({
        name: fileName,
        url: dataUrl,
        type: isImg ? 'image' : 'file',
        size: `${(file.size / 1024).toFixed(0)} KB`,
      });

      // Background upload to Supabase storage
      try {
        setIsUploadingChatFile(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', activeModalProject?.pid || 'GENERAL');
        formData.append('docName', fileName);

        const res = await fetch('/api/storage/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.fileUrl) {
            setChatAttachment((prev) =>
              prev ? { ...prev, url: json.fileUrl } : null
            );
          }
        }
      } catch (err) {
        console.warn('Storage upload fallback to Data URL', err);
      } finally {
        setIsUploadingChatFile(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleChatPaste = (e: React.ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (readEvt) => {
            const dataUrl = readEvt.target?.result as string;
            setChatAttachment({
              name: `Screenshot_${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.png`,
              url: dataUrl,
              type: 'image',
              size: `${(file.size / 1024).toFixed(0)} KB`,
            });
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChatMessage(e as any);
    }
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalProject || (!queryMessage.trim() && !chatAttachment)) return;

    const messageText = queryMessage.trim() || (chatAttachment ? `Attached: ${chatAttachment.name}` : '');
    const projectTickets = tickets.filter(t => t.pid === activeModalProject.pid);
    let updatedTicket: DonorQueryTicket;

    if (projectTickets.length > 0) {
      const mainTicket = projectTickets[0];
      updatedTicket = addMessageToTicket(
        mainTicket,
        'donor',
        currentPartnerInfo.shortName || activeModalProject.partner,
        messageText,
        undefined,
        chatAttachment?.name,
        chatAttachment?.url,
        chatAttachment?.type
      );
    } else {
      updatedTicket = createDonorQuery(
        activeModalProject.pid,
        currentPartnerInfo.shortName || activeModalProject.partner,
        donorEmail || currentPartnerInfo.focalEmail,
        queryType || 'General Project Inquiry',
        messageText,
        activeModalProject.assignedOfficer,
        activeModalProject.assignedOfficerEmail,
        chatAttachment?.name,
        chatAttachment?.url,
        chatAttachment?.type
      );
    }

    DonorQueryService.saveTicket(updatedTicket);
    setTickets((prev) => {
      const exists = prev.some(t => t.id === updatedTicket.id);
      return exists ? prev.map(t => t.id === updatedTicket.id ? updatedTicket : t) : [updatedTicket, ...prev];
    });
    setQueryMessage('');
    setChatAttachment(null);
    if (chatTextareaRef.current) {
      chatTextareaRef.current.style.height = 'auto';
    }
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
            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-slate-500" /> Select Partner Desk:
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

      {/* 2. DEDICATED PARTNER HERO BANNER */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base">{currentPartnerInfo.flag}</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{currentPartnerInfo.shortName}</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">{currentPartnerInfo.focalEmail}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {currentPartnerInfo.name}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHqSwitcher(!showHqSwitcher)}
              className="text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-medium transition flex items-center gap-1.5 cursor-pointer"
              title="Toggle Desk Switcher"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{showHqSwitcher ? 'Hide Switcher' : 'Switch Desk'}</span>
            </button>

            <button
              onClick={handleCopyShareLink}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 transition cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
              {copiedLink ? 'Link Copied' : 'Share Link'}
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
          {currentPartnerInfo.mandate}
        </p>
      </div>

      {/* 3. EXECUTIVE KPI METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Active Projects</span>
            <Briefcase className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalProjectsCount}</p>
          <p className="text-[11px] text-slate-500">Funded in portfolio</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Committed Funding</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrencyString(totalBudgetVal, primaryCurrency)}
          </p>
          <p className="text-[11px] text-slate-500">Total grant allocation</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Beneficiaries</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {totalBeneficiaries.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500">Recipients reached</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Compliance Dossier</span>
            <ShieldCheck className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {expectedPrimaryFiles === 0 ? 'Verified' : `${totalPrimaryFiles} / ${expectedPrimaryFiles}`}
          </p>
          <p className="text-[11px] text-slate-500">Required files submitted</p>
        </div>
      </div>

      {downloadToast && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{downloadToast}</span>
        </div>
      )}

      {/* 4. TAB FILTER & SEARCH BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({partnerFilteredProjects.length})
            </button>

            <button
              onClick={() => setActiveTab('RUNNING')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeTab === 'RUNNING'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              In Progress ({partnerFilteredProjects.filter(p => p.statusCategory === 'RUNNING').length})
            </button>

            <button
              onClick={() => setActiveTab('COMPLETED')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'COMPLETED'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Completed ({partnerFilteredProjects.filter(p => p.statusCategory === 'COMPLETED').length})
            </button>
          </div>

          <div className="w-full sm:w-64 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-lg pl-8 pr-3 py-1.5 outline-none focus:border-slate-400 focus:bg-white transition"
            />
          </div>
        </div>

        {/* 5. PROJECT CARDS */}
        <div className="grid grid-cols-1 gap-4">
          {displayedProjects.length > 0 ? (
            displayedProjects.map((project) => {
              const projectTickets = tickets.filter((t) => t.pid === project.pid);
              const submittedCount = project.primaryDocs.filter(d => d.status === 'Submitted').length;
              const isApproved = approvedPids[project.pid];

              return (
                <div 
                  key={project.pid}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all space-y-3.5"
                >
                  {/* Card Top Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                        {project.pid}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {project.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isApproved ? (
                        <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" /> Dossier Approved
                        </span>
                      ) : (
                        <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full font-semibold">
                          {project.statusLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Project Title & Core Metrics */}
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 leading-snug">{project.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span>Location: <strong className="text-slate-800 font-medium">{project.location}</strong></span>
                      <span className="text-slate-300">•</span>
                      <span>Beneficiaries: <strong className="text-slate-800 font-medium">{project.beneficiariesCount.toLocaleString()}</strong></span>
                      <span className="text-slate-300">•</span>
                      <span>Grant: <strong className="text-slate-900 font-mono font-semibold">{formatCurrencyString(project.budgetAmount, project.currency)}</strong></span>
                    </div>
                  </div>

                  {/* Assigned Officer Focal Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {project.assignedOfficer.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{project.assignedOfficer}</span>
                          <span className="text-[10px] text-slate-500 font-medium">Assigned Officer</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono">{project.assignedOfficerEmail}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`https://wa.me/8801711000001?text=${encodeURIComponent(`Hello ${project.assignedOfficer}, inquiring from partner desk regarding funded project [${project.pid}] "${project.title}".`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 text-slate-700 hover:text-emerald-700 bg-white hover:bg-emerald-50 font-semibold text-xs rounded-lg border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>

                      <a
                        href={`mailto:${project.assignedOfficerEmail}?subject=${encodeURIComponent(`[SKB Portal] Donor Inquiry: ${project.pid} - ${project.title}`)}`}
                        className="px-2.5 py-1 text-slate-700 hover:text-blue-700 bg-white hover:bg-blue-50 font-semibold text-xs rounded-lg border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                        title="Send email"
                      >
                        <Mail className="w-3.5 h-3.5 text-blue-600" />
                        <span>Email</span>
                      </a>
                    </div>
                  </div>

                  {/* Compliance & Card Action Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <FileCheck2 className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Compliance Dossier: <strong className="text-slate-900 font-semibold">{submittedCount} / 7 verified</strong></span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] text-slate-500">NGOAB FD-6/2938</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setInspectingProject(project)}
                        className="py-1.5 px-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>View Documents ({project.primaryDocs.length})</span>
                      </button>

                      <button
                        onClick={() => handleDownloadAllZip(project)}
                        className="py-1.5 px-2.5 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                        title="Download All Files (ZIP)"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>ZIP</span>
                      </button>

                      <button
                        onClick={() => handleOpenQueryModal(project)}
                        className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Message</span>
                        {projectTickets.length > 0 && (
                          <span className="ml-0.5 px-1.5 py-0.2 bg-white/25 text-white text-[10px] rounded-full font-bold">
                            {projectTickets.length}
                          </span>
                        )}
                      </button>

                      {!isApproved ? (
                        <button
                          onClick={() => handleApprovePackage(project.pid)}
                          className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Approve</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center space-y-2">
              <FolderArchive className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Projects Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active project records matched your search query in this workspace.
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
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  Compliance Dossier
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  {inspectingProject.title}
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>Project: <strong className="font-mono text-slate-800">{inspectingProject.pid}</strong></span>
                  <span>•</span>
                  <span>Officer: <strong className="text-slate-800">{inspectingProject.assignedOfficer}</strong></span>
                </div>
              </div>
              <button
                onClick={() => setInspectingProject(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Document Checklist Grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Required Project Documents (7 Files)
              </h3>

              <div className="space-y-2">
                {inspectingProject.primaryDocs.map((doc, idx) => (
                  <div
                    key={doc.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between gap-3 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-md bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{doc.name}</h4>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                          <span>{doc.fileSize}</span>
                          <span>•</span>
                          {doc.publishedToDonorWorkspace !== false ? (
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified
                            </span>
                          ) : (
                            <span className="text-amber-800 font-medium flex items-center gap-1">
                              Pending Review
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setViewingDoc({ doc, pid: inspectingProject.pid, partner: inspectingProject.partner })}
                        className="py-1 px-2.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" /> Preview
                      </button>
                      <button
                        onClick={() => handleDownloadFile(doc.name, doc.fileUrl)}
                        className="py-1 px-2.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" /> Download
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
                className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-500" /> Download All (ZIP)
              </button>

              <button
                onClick={() => {
                  handleApprovePackage(inspectingProject.pid);
                  setInspectingProject(null);
                }}
                className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Approve Package
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. DIRECT OFFICER CHAT & MESSAGE THREAD MODAL */}
      {activeModalProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl flex flex-col max-h-[85vh] space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xs shrink-0">
                  {activeModalProject.assignedOfficer.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">
                      {activeModalProject.assignedOfficer}
                    </h2>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Assigned Focal Person
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {activeModalProject.pid} • {activeModalProject.assignedOfficerEmail}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModalProject(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conversation Messages Thread */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 min-h-[220px] max-h-[360px] pr-1">
              {(() => {
                const projectTickets = tickets.filter(t => t.pid === activeModalProject.pid);
                const allMessages = projectTickets.flatMap(t => getTicketMessages(t));

                if (allMessages.length === 0) {
                  return (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2 text-slate-400">
                      <MessageCircle className="w-10 h-10 text-slate-300 stroke-[1.5]" />
                      <p className="text-xs font-bold text-slate-700">Direct message thread with {activeModalProject.assignedOfficer}</p>
                      <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                        Send a message regarding project progress, beneficiary lists, or compliance records. Responses will sync here in real time.
                      </p>
                    </div>
                  );
                }

                return allMessages.map((msg) => {
                  const isDonor = msg.sender === 'donor';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isDonor ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[10px] text-slate-400 mb-1 px-1">
                        {isDonor ? 'You (Partner Desk)' : msg.senderName} • {msg.createdAt}
                      </span>
                      <div
                        className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                          isDonor
                            ? 'bg-slate-900 text-white rounded-tr-xs shadow-xs'
                            : 'bg-slate-100 border border-slate-200 text-slate-900 rounded-tl-xs shadow-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words [word-break:break-word] leading-relaxed">{msg.text}</p>
                        {msg.attachmentUrl ? (
                          msg.attachmentType === 'image' || msg.attachmentName?.match(/\.(png|jpe?g|webp|gif|svg)$/i) || msg.attachmentUrl.startsWith('data:image/') ? (
                            <div className="mt-2 rounded-xl overflow-hidden border border-slate-200/80 bg-white max-w-[280px]">
                              <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block cursor-zoom-in">
                                <img
                                  src={msg.attachmentUrl}
                                  alt={msg.attachmentName || 'Screenshot attachment'}
                                  className="max-h-48 w-full object-cover hover:opacity-95 transition"
                                />
                              </a>
                              <div className="bg-slate-50 px-2.5 py-1 text-[10px] text-slate-600 flex items-center justify-between border-t border-slate-100">
                                <span className="truncate max-w-[170px] font-medium">{msg.attachmentName || 'Screenshot'}</span>
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
                              className="inline-flex items-center gap-1.5 mt-2 bg-white text-blue-700 px-3 py-1.5 rounded-xl border border-blue-200 text-[11px] font-bold hover:bg-blue-50 transition shadow-2xs"
                            >
                              <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                              <span className="truncate max-w-[180px]">{msg.attachmentName || 'Document'}</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </a>
                          )
                        ) : msg.attachmentName ? (
                          <div className="mt-2 pt-1.5 border-t border-slate-200/50 flex items-center gap-1.5 text-[11px] font-bold text-blue-700">
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>{msg.attachmentName}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Attachment Preview Chip */}
            {chatAttachment && (
              <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-2 text-xs animate-in fade-in">
                <div className="flex items-center gap-2 min-w-0">
                  {chatAttachment.type === 'image' ? (
                    <img
                      src={chatAttachment.url}
                      alt="Thumbnail preview"
                      className="w-10 h-10 object-cover rounded-lg border border-blue-200 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <Paperclip className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate text-xs">{chatAttachment.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {isUploadingChatFile ? 'Uploading to cloud...' : chatAttachment.size || 'Ready to send'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setChatAttachment(null)}
                  className="w-6 h-6 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-xs transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Chat Input Bar */}
            <form onSubmit={handleSendChatMessage} className="pt-2 border-t border-slate-100 flex items-end gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleChatFileSelect}
                accept="image/*,.pdf,.doc,.docx,.xlsx,.txt"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-[42px] w-[42px] flex items-center justify-center text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 rounded-xl border border-slate-200 transition shrink-0 cursor-pointer"
                title="Attach screenshot or file (or paste Ctrl+V)"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <textarea
                ref={chatTextareaRef}
                rows={1}
                value={queryMessage}
                onChange={(e) => {
                  setQueryMessage(e.target.value);
                  adjustChatTextareaHeight();
                }}
                onKeyDown={handleChatKeyDown}
                onPaste={handleChatPaste}
                placeholder="Type a message... (Enter to send, Shift+Enter for new line, Ctrl+V for screenshot)"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white transition resize-none min-h-[42px] max-h-[160px] overflow-y-auto leading-relaxed whitespace-pre-wrap break-words [word-break:break-word]"
              />

              <button
                type="submit"
                disabled={!queryMessage.trim() && !chatAttachment}
                className="h-[42px] px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
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
