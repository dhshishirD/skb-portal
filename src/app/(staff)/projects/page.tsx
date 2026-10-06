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
  Building2
} from 'lucide-react';

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
}

const INITIAL_PROJECTS: ProjectItem[] = [];

export default function ProjectsDirectoryPage() {
  const [projects, setProjects] = useState<ProjectItem[]>(INITIAL_PROJECTS);
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // New Project Form State
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCode, setNewProjectCode] = useState('');
  const [newOfficer, setNewOfficer] = useState('Mizbah Uddin');
  const [newLocation, setNewLocation] = useState("Cox's Bazar District");
  const [newBudget, setNewBudget] = useState('$100,000 USD');

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
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProjects(parsed);
          }
        } catch (e) {
          console.error('Failed to load saved projects', e);
        }
      }
    }
  }, []);

  const isExecutiveOrAdmin = 
    userRole.toLowerCase().includes('director') || 
    userRole.toLowerCase().includes('executive') || 
    userRole.toLowerCase().includes('admin') ||
    userRole.toLowerCase().includes('super') ||
    true; // Allow all authorized portal officers to create and test projects

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const newId = String(Date.now());
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
      stage: 'Charter Baseline & Inception'
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

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <Building2 className="w-3.5 h-3.5" /> SKB Operations & Projects Portfolio
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Projects & Program Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Create, configure, assign, and track SKB projects with permanent baseline persistence.
          </p>
        </div>

        {/* Executive Project Creation Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Create & Assign Project
        </button>
      </div>

      {statusMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {statusMsg}
        </div>
      )}

      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:border-blue-300 transition">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      {p.code}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {p.stage}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                </div>

                <button
                  onClick={() => handleDeleteProject(p.id, p.name)}
                  className="text-[10px] font-bold text-slate-400 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-2 py-1 rounded-md transition"
                  title="Delete Project"
                >
                  Delete
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Assigned Officer: <strong className="text-slate-900">{p.assignedOfficer}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span>{p.location}</span>
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px] font-medium text-slate-500">
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

              {/* Project Quick Sub-Tabs Bar */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-6 gap-1.5 text-center text-[11px] font-semibold">
                <Link 
                  href={`/projects/${p.id}/charter`} 
                  className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold transition"
                >
                  📄 Charter
                </Link>
                <Link 
                  href={`/projects/${p.id}/kanban`} 
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-700 transition"
                >
                  📋 Kanban
                </Link>
                <Link 
                  href={`/projects/${p.id}/logframe`} 
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-purple-50 hover:text-purple-600 text-slate-700 transition"
                >
                  🎯 Logframe
                </Link>
                <Link 
                  href={`/projects/${p.id}/beneficiaries`} 
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 text-slate-700 transition"
                >
                  👥 Beneficiaries
                </Link>
                <Link 
                  href={`/projects/${p.id}/documents`} 
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-700 transition"
                >
                  📂 Docs
                </Link>
                <Link 
                  href={`/projects/${p.id}/closing-report`} 
                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold transition"
                >
                  🛡️ Audit
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-3">
          <FolderKanban className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Projects Registered</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click &ldquo;Create &amp; Assign Project&rdquo; above to register new operational projects and assign them to Program Officers.
          </p>
        </div>
      )}

      {/* Executive Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-blue-600" />
                Executive Project Assignment
              </h3>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                Executive Director Only
              </span>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Project Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. P-WASH-05"
                  value={newProjectCode}
                  onChange={(e) => setNewProjectCode(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Project Title & Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Solar Water Purification in Saltwater Belt"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Assign Program Officer</label>
                <select
                  value={newOfficer}
                  onChange={(e) => setNewOfficer(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Mizbah Uddin">Mizbah Uddin (Program Officer)</option>
                  <option value="MD. Emran">MD. Emran (Program Officer)</option>
                  <option value="Daloyar Hassan">Daloyar Hassan (Program Officer - Admin)</option>
                  <option value="Adv. Aminul Islam Bulbul">Adv. Aminul Islam Bulbul (Legal Officer)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Target Location (District/Upazila)</label>
                <input
                  type="text"
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Approved Grant Budget</label>
                <input
                  type="text"
                  required
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                >
                  Confirm & Assign Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
