'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, AlertCircle, Plus, User, Edit2, Trash2, X, CheckSquare } from 'lucide-react';
import Link from 'next/link';

interface TaskItem {
  id: string;
  title: string;
  assigneeName: string;
  dueDate: string;
  status: 'todo' | 'doing' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

const DEFAULT_STARTER_TASKS: TaskItem[] = [
  { id: 'tsk-1', title: 'Compile Verified Beneficiary NID & Guardian Sign-Off Sheets (>€20 NID Rule)', assigneeName: 'Mizbah Uddin', dueDate: '2026-10-15', status: 'doing', priority: 'urgent' },
  { id: 'tsk-2', title: 'Verify Vendor Invoice Date Ranges against Project Implementation Dates', assigneeName: 'Daloyar Hassan', dueDate: '2026-10-20', status: 'todo', priority: 'high' },
  { id: 'tsk-3', title: 'Upload High-Res Distribution Photos with Logo Banners to Media Vault', assigneeName: 'Muktadir Rahaman', dueDate: '2026-10-25', status: 'todo', priority: 'medium' },
];

export default function WorkPlanTasksPage({ params }: { params: { id: string } }) {
  const projectId = params.id || 'PID-22567';
  const storageKey = `skb_tasks_${projectId}`;

  const [tasks, setTasks] = useState<TaskItem[]>(DEFAULT_STARTER_TASKS);
  const [toastMsg, setToastMsg] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [assigneeName, setAssigneeName] = useState('Mizbah Uddin');
  const [dueDate, setDueDate] = useState('2026-10-30');
  const [status, setStatus] = useState<TaskItem['status']>('todo');
  const [priority, setPriority] = useState<TaskItem['priority']>('high');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTasks(parsed);
          }
        } catch (e) {
          console.error('Failed to load tasks', e);
        }
      }
    }
  }, [storageKey]);

  const saveTasks = (newTasks: TaskItem[]) => {
    setTasks(newTasks);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(newTasks));
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const created: TaskItem = {
      id: `task_${Date.now()}`,
      title: title.trim(),
      assigneeName,
      dueDate,
      status,
      priority,
    };

    const updated = [created, ...tasks];
    saveTasks(updated);

    setShowAddModal(false);
    setTitle('');
    setToastMsg(`Workplan task "${created.title}" created & assigned to ${created.assigneeName}!`);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleOpenEdit = (t: TaskItem) => {
    setEditingTask(t);
    setTitle(t.title);
    setAssigneeName(t.assigneeName);
    setDueDate(t.dueDate);
    setStatus(t.status);
    setPriority(t.priority);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !title.trim()) return;

    const updated = tasks.map((t) => {
      if (t.id === editingTask.id) {
        return {
          ...t,
          title: title.trim(),
          assigneeName,
          dueDate,
          status,
          priority,
        };
      }
      return t;
    });

    saveTasks(updated);
    setEditingTask(null);
    setToastMsg(`Task "${title}" updated & saved!`);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleDeleteTask = (id: string, taskTitle: string) => {
    if (confirm(`Are you sure you want to remove task "${taskTitle}"?`)) {
      const updated = tasks.filter((t) => t.id !== id);
      saveTasks(updated);
      setToastMsg(`Task deleted successfully.`);
      setTimeout(() => setToastMsg(''), 3000);
    }
  };

  const toggleTaskDone = (id: string) => {
    const updated = tasks.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          status: (t.status === 'done' ? 'todo' : 'done') as TaskItem['status'],
        };
      }
      return t;
    });
    saveTasks(updated);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/projects" className="hover:underline text-blue-600 font-bold">Projects</Link> &rsaquo;
            <span className="font-semibold text-slate-800">{projectId}</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-amber-500" />
            Work Plan & Activity Tasks
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Assign, edit, track, and complete operational workplan tasks with live persistence.
          </p>
        </div>
        <button
          onClick={() => {
            setTitle('');
            setAssigneeName('Mizbah Uddin');
            setDueDate('2026-10-30');
            setStatus('todo');
            setPriority('high');
            setShowAddModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Create Workplan Task
        </button>
      </div>

      {toastMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {toastMsg}
        </div>
      )}

      {tasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 hover:border-blue-300 transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      task.priority === 'urgent'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : task.priority === 'high'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {task.priority}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(task)}
                      className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition"
                      title="Edit Task"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id, task.title)}
                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="Delete Task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-xs font-bold text-slate-900 leading-snug">{task.title}</h3>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-blue-600" /> <strong>{task.assigneeName}</strong>
                  </span>
                  <span className="flex items-center gap-1 font-mono text-slate-400">
                    <Clock className="w-3.5 h-3.5" /> {task.dueDate}
                  </span>
                </div>

                <button
                  onClick={() => toggleTaskDone(task.id)}
                  className={`w-full py-1.5 px-3 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition ${
                    task.status === 'done'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : task.status === 'doing'
                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 ${task.status === 'done' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>Status: {task.status.toUpperCase()}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-3">
          <Clock className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Work Plan Tasks Created</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click &ldquo;Create Workplan Task&rdquo; above to assign operational tasks and set completion deadlines.
          </p>
        </div>
      )}

      {/* MODAL: ADD / EDIT WORKPLAN TASK */}
      {(showAddModal || editingTask) && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-500" />
                {editingTask ? 'Edit Workplan Task' : 'Create Workplan Task'}
              </h3>
              <button 
                onClick={() => { setShowAddModal(false); setEditingTask(null); }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={editingTask ? handleSaveEdit : handleAddTask} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Task Title & Activity Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Audit NID Photocopy Legibility & Guardian Sign-Off Sheets"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assign Operational Officer</label>
                <select
                  value={assigneeName}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                >
                  <option value="Mizbah Uddin">Mizbah Uddin (Program Officer)</option>
                  <option value="Daloyar Hassan">Daloyar Hassan (Financial Auditor)</option>
                  <option value="Muktadir Rahaman">Muktadir Rahaman (IT & Media Manager)</option>
                  <option value="Md. Abu Huraira">Md. Abu Huraira (Executive Director)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  >
                    <option value="todo">To Do</option>
                    <option value="doing">In Progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingTask(null); }}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all"
                >
                  {editingTask ? 'Save Task Changes' : 'Confirm & Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
