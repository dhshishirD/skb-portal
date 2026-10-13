'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { 
  FolderKanban, 
  Plus, 
  UserCheck, 
  MapPin, 
  DollarSign, 
  Calendar, 
  ChevronRight, 
  Users, 
  Target, 
  CheckCircle2,
  Clock,
  ShieldAlert,
  Building2,
  Search,
  Sparkles,
  FileText,
  Filter,
  Check,
  Award
} from 'lucide-react';
import { BeneficiaryService } from '@/server/services/beneficiaryService';

interface ProjectItem {
  id: string;
  code: string;
  name: string;
  assignedOfficer: string;
  location: string;
  budget: string;
  status: string;
  progressPct: number;
  beneficiariesCount: number;
  stage: string;
  isProposal?: boolean;
}

const INITIAL_PROJECTS: ProjectItem[] = [
  {
    id: 'P-SKB-2026-COW',
    code: 'BD-SKB-2026-COW-20',
    name: 'Adak Aqiqa (Sacrificing 20 Cows) for the Rohingya Refugees, October 2026',
    assignedOfficer: 'Md. Abu Huraira',
    location: "Cox's Bazar, Ukhiya (Hakim-para & Jamtoli Camps)",
    budget: '€12,280 EUR (BDT 1,719,204)',
    status: 'Form-3 Proposal Approved',
    progressPct: 25,
    beneficiariesCount: 800,
    stage: 'Charter Baseline & Inception',
    isProposal: true,
  },
  {
    id: 'P-SKB-2026-GOAT',
    code: 'BD-SKB-2026-LIV-CLO',
    name: 'Distribution of Goats, Clothing & Food Packets for Rohingya Refugees',
    assignedOfficer: 'Safwanur Rahman',
    location: "Cox's Bazar, Ukhiya & Teknaf (Kutupalong, Balukhali, Jamtoli)",
    budget: '€14,280 EUR (BDT 1,955,704)',
    status: 'Form-3 Proposal Approved',
    progressPct: 25,
    beneficiariesCount: 425,
    stage: 'Proposal & Budget Baseline',
    isProposal: true,
  },
  {
    id: 'P-SKB-2026-WFS',
    code: 'BD-SKB-2026-WFS-SDLP',
    name: 'Women-Friendly Space (Skill Development & Learning Center) for Rohingya Refugees',
    assignedOfficer: 'Md. Abu Huraira',
    location: "Cox's Bazar, Ukhiya & Teknaf (Camp 11 / 12)",
    budget: '€21,415 EUR (BDT 2,934,010)',
    status: 'Form-3 Proposal Approved',
    progressPct: 20,
    beneficiariesCount: 50,
    stage: 'Charter Baseline & Inception',
    isProposal: true,
  },
  {
    id: 'PID 22222',
    code: 'PID 22222',
    name: 'Boat Distribution Project',
    assignedOfficer: 'Muktadir Rahaman',
    location: "Cox's Bazar District",
    budget: '$100,000 USD',
    status: 'Active',
    progressPct: 75,
    beneficiariesCount: 8,
    stage: 'Pre-Submission Audit',
    isProposal: false,
  },
];

export default function ProjectsDirectoryPage() {
  const [projects, setProjects] = useState<ProjectItem[]>(INITIAL_PROJECTS);
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  
  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'PROPOSALS' | 'ACTIVE' | 'AUDIT'>('ALL');

  // New Project Form State
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCode, setNewProjectCode] = useState('');
  const [newOfficer, setNewOfficer] = useState('Md. Abu Huraira');
  const [newLocation, setNewLocation] = useState("Cox's Bazar, Ukhiya");
  const [newBudget, setNewBudget] = useState('€15,000 EUR');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || '';
        const designation = user.user_metadata?.designation || '';
        setUserName(name);
        setUserRole(designation);
      }
    });

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('skb_portal_projects_v3');
      let mergedList: ProjectItem[] = [...INITIAL_PROJECTS];
      
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Keep user-created custom projects and combine with proposal templates
            const existingCodesOrIds = new Set(INITIAL_PROJECTS.map(p => p.id).concat(INITIAL_PROJECTS.map(p => p.code)));
            const customProjects = parsed.filter(p => !existingCodesOrIds.has(p.id) && !existingCodesOrIds.has(p.code));
            mergedList = [...INITIAL_PROJECTS, ...customProjects];
          }
        } catch (e) {
          console.error('Failed to load saved projects', e);
        }
      }
      
      setProjects(mergedList);
      localStorage.setItem('skb_portal_projects_v3', JSON.stringify(mergedList));
    }

    // Dynamic live beneficiary count sync from Central Registry
    BeneficiaryService.getBeneficiaries().then((bList) => {
      if (bList && bList.length > 0) {
        setProjects((prev) =>
          prev.map((p) => {
            const count = bList.filter(
              (b) => b.projectId === p.id || b.projectId === p.code
            ).length;
            return count > 0 ? { ...p, beneficiariesCount: count } : p;
          })
        );
      }
    });
  }, []);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const newId = `P-SKB-${Date.now()}`;
    const created: ProjectItem = {
      id: newId,
      code: newProjectCode.trim() || `P-SKB-0${projects.length + 1}`,
      name: newProjectName.trim(),
      assignedOfficer: newOfficer,
      location: newLocation,
      budget: newBudget,
      status: 'Active',
      progressPct: 15,
      beneficiariesCount: 0,
      stage: 'Charter Baseline & Inception',
      isProposal: false,
    };

    const updatedProjects = [created, ...projects];
    setProjects(updatedProjects);
    if (typeof window !== 'undefined') {
      localStorage.setItem('skb_portal_projects_v3', JSON.stringify(updatedProjects));
    }

    setShowCreateModal(false);
    setStatusMsg(`Project "${newProjectName}" (${created.code}) successfully created & permanently saved!`);
    setNewProjectName('');
    setNewProjectCode('');
  };

  const handleDeleteProject = (projectId: string, projectName: string) => {
    if (confirm(`Are you sure you want to remove project "${projectName}"?`)) {
      const updatedProjects = projects.filter(p => p.id !== projectId);
      setProjects(updatedProjects);
      if (typeof window !== 'undefined') {
        localStorage.setItem('skb_portal_projects_v3', JSON.stringify(updatedProjects));
      }
      setStatusMsg(`Project "${projectName}" deleted from directory.`);
      setTimeout(() => setStatusMsg(''), 3500);
    }
  };

  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editOfficer, setEditOfficer] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editProgressPct, setEditProgressPct] = useState(15);

  const handleOpenEditModal = (p: ProjectItem) => {
    setEditingProject(p);
    setEditName(p.name);
    setEditCode(p.code);
    setEditOfficer(p.assignedOfficer);
    setEditLocation(p.location);
    setEditBudget(p.budget);
    setEditProgressPct(p.progressPct);
  };

  const handleSaveEditedProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editName.trim()) return;

    const updatedProjects = projects.map(p => {
      if (p.id === editingProject.id) {
        return {
          ...p,
          name: editName.trim(),
          code: editCode.trim() || p.code,
          assignedOfficer: editOfficer,
          location: editLocation.trim(),
          budget: editBudget.trim(),
          progressPct: Number(editProgressPct) || p.progressPct,
        };
      }
      return p;
    });

    setProjects(updatedProjects);
    if (typeof window !== 'undefined') {
      localStorage.setItem('skb_portal_projects_v3', JSON.stringify(updatedProjects));
    }

    setEditingProject(null);
    setStatusMsg(`Project "${editName}" updated successfully & saved to live directory!`);
    setTimeout(() => setStatusMsg(''), 3500);
  };

  // Filter projects by Tab and Search Query
  const filteredProjects = projects.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.assignedOfficer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedTab === 'PROPOSALS') return p.isProposal === true;
    if (selectedTab === 'ACTIVE') return p.stage.toLowerCase().includes('execution') || p.stage.toLowerCase().includes('inception') || p.stage.toLowerCase().includes('charter') || p.stage.toLowerCase().includes('proposal');
    if (selectedTab === 'AUDIT') return p.stage.toLowerCase().includes('audit') || p.stage.toLowerCase().includes('close');

    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <Building2 className="w-3.5 h-3.5" /> SKB Operations & Projects Portfolio
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Projects & Program Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage official project charters, multi-currency budgets, stage-gate approvals, and live execution.
          </p>
        </div>

        {/* Executive Project Creation Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4.5 py-2.5 rounded-xl shadow-sm transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create & Assign Project
        </button>
      </div>

      {/* 2. Top Executive KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Projects</span>
            <FolderKanban className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-1">{projects.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Active NGOAB registered</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Form-3 Proposals</span>
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-black text-indigo-700 mt-1">3 Active</p>
          <p className="text-[11px] text-slate-400 mt-0.5">IHH Turkey Humanitarian</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Portfolio Value</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-700 mt-1">€47,975 EUR</p>
          <p className="text-[11px] text-slate-400 mt-0.5">BDT 6.6 Million Total</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Target Reach</span>
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-1">1,275+ Families</p>
          <p className="text-[11px] text-slate-400 mt-0.5">6,000+ Individuals</p>
        </div>
      </div>

      {statusMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {statusMsg}
        </div>
      )}

      {/* 3. Search Bar & Status Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedTab('ALL')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 border ${
              selectedTab === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>All Projects</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedTab === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {projects.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedTab('PROPOSALS')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 border ${
              selectedTab === 'PROPOSALS'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-indigo-50/60 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>IHH Form-3 Proposals</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${selectedTab === 'PROPOSALS' ? 'bg-indigo-500 text-white' : 'bg-indigo-200 text-indigo-900'}`}>
              3
            </span>
          </button>

          <button
            onClick={() => setSelectedTab('ACTIVE')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 border ${
              selectedTab === 'ACTIVE'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>Active Implementation</span>
          </button>

          <button
            onClick={() => setSelectedTab('AUDIT')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 border ${
              selectedTab === 'AUDIT'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>Audit & Closed</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="w-full sm:w-72 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Title, Code, Officer, or Location..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-9 pr-3 py-1.5 outline-none focus:border-blue-500 focus:bg-white font-medium text-xs transition"
          />
        </div>
      </div>

      {/* 4. Projects Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:border-blue-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200 font-mono">
                        {p.code}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {p.stage}
                      </span>
                      {p.isProposal && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-indigo-600" /> IHH Form-3
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                      {p.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleOpenEditModal(p)}
                      className="text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200 transition"
                      title="Edit Project Details"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteProject(p.id, p.name)}
                      className="text-[10px] font-bold text-slate-400 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-2 py-1 rounded-md border border-slate-200 transition"
                      title="Delete Project"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Assigned Lead: <strong className="text-slate-900">{p.assignedOfficer}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="truncate">{p.location}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px] font-medium text-slate-600">
                    <span>Budget: <strong className="text-slate-900">{p.budget}</strong></span>
                    <span>Beneficiaries: <strong className="text-slate-900">{p.beneficiariesCount} Registered</strong></span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Milestone Progress</span>
                    <span className="font-bold text-blue-600">{p.progressPct}% Complete</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${p.progressPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Project Quick Sub-Tabs Bar */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center text-[11px] font-semibold">
                <Link 
                  href={`/projects/${encodeURIComponent(p.id)}/charter`} 
                  className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold transition flex flex-col items-center justify-center gap-0.5"
                  title="View Official Project Charter"
                >
                  <span>📄</span>
                  <span>Charter</span>
                </Link>
                <Link 
                  href={`/projects/${encodeURIComponent(p.id)}/kanban`} 
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-700 transition flex flex-col items-center justify-center gap-0.5"
                >
                  <span>📋</span>
                  <span>Kanban</span>
                </Link>
                <Link 
                  href={`/projects/${encodeURIComponent(p.id)}/logframe`} 
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-purple-50 hover:text-purple-600 text-slate-700 transition flex flex-col items-center justify-center gap-0.5"
                >
                  <span>🎯</span>
                  <span>Logframe</span>
                </Link>
                <Link 
                  href={`/projects/${encodeURIComponent(p.id)}/beneficiaries`} 
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 text-slate-700 transition flex flex-col items-center justify-center gap-0.5"
                >
                  <span>👥</span>
                  <span>Register</span>
                </Link>
                <Link 
                  href={`/projects/${encodeURIComponent(p.id)}/documents`} 
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-700 transition flex flex-col items-center justify-center gap-0.5"
                >
                  <span>📂</span>
                  <span>Docs</span>
                </Link>
                <Link 
                  href={`/projects/${encodeURIComponent(p.id)}/closing-report`} 
                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold transition flex flex-col items-center justify-center gap-0.5"
                >
                  <span>🛡️</span>
                  <span>Audit</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-3">
          <FolderKanban className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Matching Projects</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No projects match the selected filter or search term &ldquo;{searchQuery}&rdquo;.
          </p>
        </div>
      )}

      {/* MODAL 1: CREATE PROJECT */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-blue-600" />
                Register New Operational Project
              </h3>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full">
                Executive Assignment
              </span>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Project Code / PID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BD-SKB-2026-REL-01 or PID 22567"
                  value={newProjectCode}
                  onChange={(e) => setNewProjectCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Project Title & Objective</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emergency Winter Blanket Distribution for Rohingya Families"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assign Program Officer / Lead</label>
                <select
                  value={newOfficer}
                  onChange={(e) => setNewOfficer(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                >
                  <option value="Md. Abu Huraira">Md. Abu Huraira (General Secretary & Mission Lead)</option>
                  <option value="Safwanur Rahman">Safwanur Rahman (Project Manager & Relief Lead)</option>
                  <option value="Mizbah Uddin">Mizbah Uddin (Program Officer & Operations)</option>
                  <option value="Daloyar Hassan">Daloyar Hassan (Senior Accounts Auditor)</option>
                  <option value="Muktadir Rahaman">Muktadir Rahaman (IT & Media Manager)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target District / Zone</label>
                  <input
                    type="text"
                    required
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Approved Grant Budget</label>
                  <input
                    type="text"
                    required
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all"
                >
                  Confirm & Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT PROJECT */}
      {editingProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-blue-600" />
                Edit Operational Project Details
              </h3>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full font-mono">
                {editingProject.code}
              </span>
            </div>

            <form onSubmit={handleSaveEditedProject} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Project Code / PID</label>
                <input
                  type="text"
                  required
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Project Title</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Program Officer / Lead</label>
                <select
                  value={editOfficer}
                  onChange={(e) => setEditOfficer(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                >
                  <option value="Md. Abu Huraira">Md. Abu Huraira (General Secretary & Mission Lead)</option>
                  <option value="Safwanur Rahman">Safwanur Rahman (Project Manager & Relief Lead)</option>
                  <option value="Mizbah Uddin">Mizbah Uddin (Program Officer & Operations)</option>
                  <option value="Daloyar Hassan">Daloyar Hassan (Senior Accounts Auditor)</option>
                  <option value="Muktadir Rahaman">Muktadir Rahaman (IT & Media Manager)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Location</label>
                  <input
                    type="text"
                    required
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Grant Budget</label>
                  <input
                    type="text"
                    required
                    value={editBudget}
                    onChange={(e) => setEditBudget(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Milestone Progress ({editProgressPct}%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editProgressPct}
                  onChange={(e) => setEditProgressPct(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all"
                >
                  Save Project Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
