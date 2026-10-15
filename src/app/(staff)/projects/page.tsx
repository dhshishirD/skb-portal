'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { 
  FolderKanban, 
  Plus, 
  UserCheck, 
  UserPlus,
  MapPin, 
  DollarSign, 
  Calendar, 
  ChevronRight, 
  Users, 
  Target, 
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Building2,
  Search,
  Sparkles,
  FileText,
  Filter,
  Check,
  Award,
  X,
  Lock,
  Edit2,
  Trash2
} from 'lucide-react';
import { BeneficiaryService } from '@/server/services/beneficiaryService';
import { 
  ProjectAssignmentService, 
  AssignableOfficer 
} from '@/server/services/projectAssignmentService';
import { DEFAULT_APPROVED_USERS } from '@/server/services/userApprovalService';

export interface ProjectItem {
  id: string;
  code: string;
  name: string;
  assignedOfficer: string;
  assignedOfficers?: string[];
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
    assignedOfficers: ['Md. Abu Huraira', 'Mizbah Uddin'],
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
    assignedOfficer: 'Emran Ahmed',
    assignedOfficers: ['Emran Ahmed'],
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
    assignedOfficer: 'Daloyar Hassan',
    assignedOfficers: ['Daloyar Hassan', 'Emran Ahmed'],
    location: "Cox's Bazar, Ukhiya & Teknaf (Camp 11 / 12)",
    budget: '€21,415 EUR (BDT 2,934,010)',
    status: 'Form-3 Proposal Approved',
    progressPct: 20,
    beneficiariesCount: 3200,
    stage: 'Charter Baseline & Inception',
    isProposal: true,
  },
  {
    id: 'BD-SKB-2026-UOL-WTR',
    code: 'BD-SKB-2026-UOL-WTR',
    name: 'Clean Drinking Water Deep Tube-Well & Hygiene Station Program',
    assignedOfficer: 'Mizbah Uddin',
    assignedOfficers: ['Mizbah Uddin'],
    location: 'Satkhira & Bagerhat Coastal Belt',
    budget: '€15,000 EUR (BDT 2,055,000)',
    status: 'Under Construction & Testing',
    progressPct: 40,
    beneficiariesCount: 4500,
    stage: 'Active Implementation',
    isProposal: false,
  },
  {
    id: 'BD-SKB-2026-MVM-REF',
    code: 'BD-SKB-2026-MVM-REF',
    name: 'Rohingya Refugee Emergency Food Rations & Medical Solidarity Clinic',
    assignedOfficer: 'Emran Ahmed',
    assignedOfficers: ['Emran Ahmed'],
    location: "Cox's Bazar, Ukhia Refugee Camp 4 & Camp 9",
    budget: '$40,000 USD (BDT 4,800,000)',
    status: 'Active Distribution',
    progressPct: 60,
    beneficiariesCount: 6000,
    stage: 'Active Implementation',
    isProposal: false,
  },
  {
    id: 'BD-SKB-2026-QWC-WLF',
    code: 'BD-SKB-2026-QWC-WLF',
    name: 'Widow Sustenance & Women Livelihood Empowerment Initiative',
    assignedOfficer: 'Daloyar Hassan',
    assignedOfficers: ['Daloyar Hassan'],
    location: 'Rangpur & Kurigram Rural Unions',
    budget: '$22,000 USD (BDT 2,640,000)',
    status: 'Beneficiary Asset Handover',
    progressPct: 85,
    beneficiariesCount: 850,
    stage: 'Active Implementation',
    isProposal: false,
  },
  {
    id: 'PID 22222',
    code: 'PID 22222',
    name: 'Boat Distribution Project',
    assignedOfficer: 'Muktadir Rahaman',
    assignedOfficers: ['Muktadir Rahaman', 'Mizbah Uddin'],
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
  const [userRole, setUserRole] = useState<string>('Program Officer');
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  
  // Executive Officer Assignment Modal
  const [assigningProject, setAssigningProject] = useState<ProjectItem | null>(null);
  const [selectedOfficerNames, setSelectedOfficerNames] = useState<string[]>([]);
  const [availableOfficers, setAvailableOfficers] = useState<AssignableOfficer[]>([]);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'MY_ASSIGNED' | 'ALL'>('MY_ASSIGNED');
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'PROPOSALS' | 'ACTIVE' | 'AUDIT'>('ALL');

  // New Project Form State (Executive Director)
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCode, setNewProjectCode] = useState('');
  const [newOfficerList, setNewOfficerList] = useState<string[]>(['Emran Ahmed']);
  const [newLocation, setNewLocation] = useState("Cox's Bazar, Ukhiya");
  const [newBudget, setNewBudget] = useState('€15,000 EUR');

  // Edit Project Form State
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editProgressPct, setEditProgressPct] = useState(15);

  useEffect(() => {
    setAvailableOfficers(ProjectAssignmentService.getAssignableOfficers());

    const resolveAuth = async () => {
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
        setUserName(matchedUser.fullName);
        setUserEmail(matchedUser.email);
        setUserRole(matchedUser.designation || matchedUser.requestedRole || 'Program Officer');
        
        const isExec = matchedUser.fullName.toLowerCase().includes('huraira') || 
                       matchedUser.email.toLowerCase() === 'kindnessforbeauty@gmail.com' ||
                       matchedUser.fullName.toLowerCase().includes('orakatul');
        setScopeFilter(isExec ? 'ALL' : 'MY_ASSIGNED');
      } else {
        const fallback = DEFAULT_APPROVED_USERS[2]; // Daloyar Hassan (Program Officer / HR)
        setUserName(fallback.fullName);
        setUserEmail(fallback.email);
        setUserRole(fallback.designation || fallback.requestedRole || 'Program Officer');
        setScopeFilter('MY_ASSIGNED');
      }
    };

    resolveAuth();

    // Load projects with assignments synced from ProjectAssignmentService
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('skb_portal_projects_v4');
      let baseList: ProjectItem[] = [...INITIAL_PROJECTS];
      
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const existingIds = new Set(INITIAL_PROJECTS.map(p => p.id).concat(INITIAL_PROJECTS.map(p => p.code)));
            const customProjects = parsed.filter(p => !existingIds.has(p.id) && !existingIds.has(p.code));
            baseList = [...INITIAL_PROJECTS, ...customProjects];
          }
        } catch (e) {
          console.error('Failed to load saved projects', e);
        }
      }

      // Sync assignments
      const synced = baseList.map(p => {
        const officers = ProjectAssignmentService.getAssignedOfficers(p.code || p.id, p.assignedOfficer);
        return {
          ...p,
          assignedOfficers: officers,
          assignedOfficer: officers[0] || p.assignedOfficer
        };
      });

      setProjects(synced);
      localStorage.setItem('skb_portal_projects_v4', JSON.stringify(synced));
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

    const handleAssignmentsChanged = () => {
      setProjects((prev) => prev.map((p) => {
        const officers = ProjectAssignmentService.getAssignedOfficers(p.code || p.id, p.assignedOfficer);
        return {
          ...p,
          assignedOfficers: officers,
          assignedOfficer: officers[0] || p.assignedOfficer
        };
      }));
    };
    window.addEventListener('skb_assignments_changed', handleAssignmentsChanged);
    return () => {
      window.removeEventListener('skb_assignments_changed', handleAssignmentsChanged);
    };
  }, []);

  // Executive Director Authority
  const isExecutiveDirector = 
    userName.toLowerCase().includes('huraira') ||
    userEmail.toLowerCase() === 'kindnessforbeauty@gmail.com' ||
    userRole.toLowerCase().includes('executive director');

  const isChairman = 
    userName.toLowerCase().includes('orakatul') ||
    userRole.toLowerCase().includes('chairman');

  const canManageProjects = isExecutiveDirector || isChairman;
  const isProgramOfficer = !canManageProjects;

  // Officer Assignment Modal Handlers
  const handleOpenAssignModal = (project: ProjectItem) => {
    if (!canManageProjects) {
      alert('Only the Executive Director (Md. Abu Huraira) has authority to assign officers to projects.');
      return;
    }
    setAssigningProject(project);
    const current = ProjectAssignmentService.getAssignedOfficers(project.code || project.id, project.assignedOfficer);
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
      alert('Please assign at least one officer to this project.');
      return;
    }

    ProjectAssignmentService.setAssignedOfficers(assigningProject.code || assigningProject.id, selectedOfficerNames);

    const updatedProjects = projects.map(p => {
      if (p.id === assigningProject.id || p.code === assigningProject.code) {
        return {
          ...p,
          assignedOfficers: selectedOfficerNames,
          assignedOfficer: selectedOfficerNames[0] || p.assignedOfficer
        };
      }
      return p;
    });

    setProjects(updatedProjects);
    if (typeof window !== 'undefined') {
      localStorage.setItem('skb_portal_projects_v4', JSON.stringify(updatedProjects));
    }

    setStatusMsg(`Officers assigned to "${assigningProject.name}": ${selectedOfficerNames.join(', ')}`);
    setAssigningProject(null);
    setTimeout(() => setStatusMsg(''), 4500);
  };

  // Create Project Handler (Executive Director)
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageProjects) {
      alert('Permission Denied: Only the Executive Director can create new projects.');
      return;
    }
    if (!newProjectName.trim()) return;

    const newId = `P-SKB-${Date.now()}`;
    const newCode = newProjectCode.trim() || `P-SKB-0${projects.length + 1}`;
    const assignedOfficers = newOfficerList.length > 0 ? newOfficerList : ['Md. Abu Huraira'];

    const created: ProjectItem = {
      id: newId,
      code: newCode,
      name: newProjectName.trim(),
      assignedOfficer: assignedOfficers[0],
      assignedOfficers: assignedOfficers,
      location: newLocation,
      budget: newBudget,
      status: 'Active',
      progressPct: 15,
      beneficiariesCount: 0,
      stage: 'Charter Baseline & Inception',
      isProposal: false,
    };

    ProjectAssignmentService.setAssignedOfficers(newCode, assignedOfficers);

    const updatedProjects = [created, ...projects];
    setProjects(updatedProjects);
    if (typeof window !== 'undefined') {
      localStorage.setItem('skb_portal_projects_v4', JSON.stringify(updatedProjects));
    }

    setShowCreateModal(false);
    setStatusMsg(`Project "${newProjectName}" (${created.code}) registered and assigned to ${assignedOfficers.join(', ')}!`);
    setNewProjectName('');
    setNewProjectCode('');
    setTimeout(() => setStatusMsg(''), 4500);
  };

  const handleDeleteProject = (projectId: string, projectName: string) => {
    if (!canManageProjects) {
      alert('Permission Denied: Only the Executive Director can remove projects.');
      return;
    }
    if (confirm(`Are you sure you want to remove project "${projectName}"?`)) {
      const updatedProjects = projects.filter(p => p.id !== projectId);
      setProjects(updatedProjects);
      if (typeof window !== 'undefined') {
        localStorage.setItem('skb_portal_projects_v4', JSON.stringify(updatedProjects));
      }
      setStatusMsg(`Project "${projectName}" deleted from directory.`);
      setTimeout(() => setStatusMsg(''), 3500);
    }
  };

  const handleOpenEditModal = (p: ProjectItem) => {
    if (!canManageProjects) {
      alert('Only the Executive Director can edit project parameters.');
      return;
    }
    setEditingProject(p);
    setEditName(p.name);
    setEditCode(p.code);
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
          location: editLocation.trim(),
          budget: editBudget.trim(),
          progressPct: Number(editProgressPct) || p.progressPct,
        };
      }
      return p;
    });

    setProjects(updatedProjects);
    if (typeof window !== 'undefined') {
      localStorage.setItem('skb_portal_projects_v4', JSON.stringify(updatedProjects));
    }

    setEditingProject(null);
    setStatusMsg(`Project "${editName}" updated successfully & saved to live directory!`);
    setTimeout(() => setStatusMsg(''), 3500);
  };

  // Filter projects by Scope (Assigned vs All), Tab, and Search Query
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // 1. Operational Scope Filter
      if (scopeFilter === 'MY_ASSIGNED') {
        const isAssigned = ProjectAssignmentService.isUserAssigned(
          p.code || p.id,
          userName,
          userEmail,
          p.assignedOfficer
        );
        if (!isAssigned) return false;
      }

      // 2. Search Query Filter
      const assignedText = (p.assignedOfficers || [p.assignedOfficer]).join(' ');
      const matchesSearch = 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assignedText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.location.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 3. Status Tab Filter
      if (selectedTab === 'PROPOSALS') return p.isProposal === true;
      if (selectedTab === 'ACTIVE') return p.stage.toLowerCase().includes('execution') || p.stage.toLowerCase().includes('inception') || p.stage.toLowerCase().includes('charter') || p.stage.toLowerCase().includes('proposal');
      if (selectedTab === 'AUDIT') return p.stage.toLowerCase().includes('audit') || p.stage.toLowerCase().includes('close');

      return true;
    });
  }, [projects, scopeFilter, userName, userEmail, searchQuery, selectedTab]);

  const myAssignedCount = useMemo(() => {
    return projects.filter(p => 
      ProjectAssignmentService.isUserAssigned(p.code || p.id, userName, userEmail, p.assignedOfficer)
    ).length;
  }, [projects, userName, userEmail]);

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <Building2 className="w-3.5 h-3.5" /> SKB Operations &amp; Projects Directory
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {isProgramOfficer ? `${userName} — Assigned Projects Portfolio` : 'Projects & Operational Charters Directory'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isProgramOfficer
              ? `You only see and execute the projects assigned directly to you by the Executive Director.`
              : `Executive directorate master portfolio. Assign one or more operational officers to each charter.`}
          </p>
        </div>

        {/* Executive Director Only: Create & Assign Project */}
        {canManageProjects ? (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4.5 py-2.5 rounded-xl shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create &amp; Assign Project</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Assigned Scope Active ({myAssignedCount} Projects)</span>
            </span>
          </div>
        )}
      </div>

      {/* Program Officer Operational Scope Notice */}
      {isProgramOfficer && (
        <div className="bg-blue-50/80 border border-blue-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-black">
              🎯
            </div>
            <div>
              <p className="font-extrabold text-blue-950">
                Focused Desk Environment Active
              </p>
              <p className="text-blue-800 text-[11px]">
                Showing strictly the {myAssignedCount} project{myAssignedCount === 1 ? '' : 's'} assigned to your desk. Project assignment is governed exclusively by Executive Director Md. Abu Huraira.
              </p>
            </div>
          </div>

          {/* Scope Toggle for Officer (Default: MY_ASSIGNED) */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-blue-200 shrink-0">
            <button
              onClick={() => setScopeFilter('MY_ASSIGNED')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                scopeFilter === 'MY_ASSIGNED'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Assigned ({myAssignedCount})
            </button>
            <button
              onClick={() => setScopeFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                scopeFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All SKB ({projects.length})
            </button>
          </div>
        </div>
      )}

      {/* Executive Director Scope Toggle */}
      {canManageProjects && (
        <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-slate-800">Executive Directorate Portfolio Oversight</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setScopeFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
                scopeFilter === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Projects ({projects.length})
            </button>
            <button
              onClick={() => setScopeFilter('MY_ASSIGNED')}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
                scopeFilter === 'MY_ASSIGNED'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              My Supervised ({myAssignedCount})
            </button>
          </div>
        </div>
      )}

      {/* 2. Top Executive KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>{isProgramOfficer ? 'My Active Projects' : 'Total Projects'}</span>
            <FolderKanban className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-1">
            {isProgramOfficer ? myAssignedCount : projects.length}
          </p>
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
            <span>All Stages</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedTab === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {filteredProjects.length}
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
            <span>Audit &amp; Closed</span>
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
          {filteredProjects.map((p) => {
            const assignedList = p.assignedOfficers && p.assignedOfficers.length > 0
              ? p.assignedOfficers
              : [p.assignedOfficer];

            return (
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

                    {/* Executive Director Controls (Assign / Edit / Delete) */}
                    {canManageProjects && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleOpenAssignModal(p)}
                          className="text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200 transition flex items-center gap-1 cursor-pointer"
                          title="Assign or reassign operational officers"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>Assign</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md border border-slate-200 transition"
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
                    )}
                  </div>

                  {/* Multi-Officer Assigned Badges */}
                  <div className="space-y-2 text-xs text-slate-600 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-semibold text-slate-500">Assigned Officers:</span>
                        {assignedList.map((officerName) => {
                          const isMe = userName && officerName.toLowerCase().includes(userName.toLowerCase());
                          return (
                            <span 
                              key={officerName} 
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                isMe 
                                  ? 'bg-blue-600 text-white border-blue-700 shadow-2xs' 
                                  : 'bg-white text-slate-800 border-slate-200'
                              }`}
                            >
                              {officerName} {isMe ? '(You)' : ''}
                            </span>
                          );
                        })}
                      </div>

                      {canManageProjects && (
                        <button
                          type="button"
                          onClick={() => handleOpenAssignModal(p)}
                          className="text-[10px] text-blue-600 hover:underline font-bold"
                        >
                          + Change
                        </button>
                      )}
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
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-3">
          <FolderKanban className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">
            {scopeFilter === 'MY_ASSIGNED' ? 'No Projects Assigned to You in This Category' : 'No Matching Projects'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {scopeFilter === 'MY_ASSIGNED'
              ? `You currently have ${myAssignedCount} projects assigned to your desk. Switch to 'All SKB' to inspect other projects, or contact Executive Director Md. Abu Huraira.`
              : `No projects match the selected filter or search term "${searchQuery}".`}
          </p>
        </div>
      )}

      {/* MODAL: ASSIGN OFFICERS (EXECUTIVE DIRECTOR ONLY) */}
      {assigningProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">Executive Director Assignment Desk</span>
                <h3 className="text-base font-extrabold text-slate-900">Assign Project Officers</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{assigningProject.code}</p>
              </div>
              <button 
                onClick={() => setAssigningProject(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl text-xs space-y-1">
              <p className="font-bold text-blue-900 truncate">{assigningProject.name}</p>
              <p className="text-blue-800 text-[11px]">
                Only assigned officers will be able to view and manage this project in their focused operational workspace.
              </p>
            </div>

            <form onSubmit={handleSaveAssignments} className="space-y-4">
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <span className="text-xs font-bold text-slate-700 block">Select Personnel for this Charter:</span>
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

      {/* MODAL 1: CREATE PROJECT (EXECUTIVE DIRECTOR ONLY) */}
      {showCreateModal && canManageProjects && (
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
                <label className="block font-bold text-slate-700 mb-1">Full Project Title &amp; Objective</label>
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
                <label className="block font-bold text-slate-700 mb-1">Assign Responsible Officer(s)</label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto bg-slate-50 p-2 rounded-xl border border-slate-200">
                  {availableOfficers.map((officer) => {
                    const isChecked = newOfficerList.includes(officer.name);
                    return (
                      <label key={officer.id} className="flex items-center gap-2 text-xs cursor-pointer p-1 rounded hover:bg-white">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setNewOfficerList(newOfficerList.filter(n => n !== officer.name));
                            } else {
                              setNewOfficerList([...newOfficerList, officer.name]);
                            }
                          }}
                          className="w-3.5 h-3.5 text-blue-600 rounded"
                        />
                        <span className="font-semibold text-slate-800">{officer.name}</span>
                        <span className="text-[10px] text-slate-400">({officer.role})</span>
                      </label>
                    );
                  })}
                </div>
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
                  Confirm &amp; Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT PROJECT (EXECUTIVE DIRECTOR ONLY) */}
      {editingProject && canManageProjects && (
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
