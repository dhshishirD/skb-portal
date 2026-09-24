'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, AlertCircle, Plus, User } from 'lucide-react';
import Link from 'next/link';

interface TaskItem {
  id: string;
  title: string;
  assigneeName: string;
  dueDate: string;
  status: 'todo' | 'doing' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

const MOCK_TASKS: TaskItem[] = [
  { id: '1', title: 'Procure 10,000 mangrove saplings from Teknaf nursery', assigneeName: 'Karim Field Officer', dueDate: '2026-10-15', status: 'doing', priority: 'high' },
  { id: '2', title: 'Conduct community WASH awareness meeting in Ward 4', assigneeName: 'Tariq Project Officer', dueDate: '2026-10-20', status: 'todo', priority: 'medium' },
  { id: '3', title: 'Submit Q3 coastal embankment repair financial claim', assigneeName: 'Fatema Finance Manager', dueDate: '2026-10-05', status: 'done', priority: 'urgent' },
];

export default function WorkPlanTasksPage({ params }: { params: { id: string } }) {
  const [tasks] = useState<TaskItem[]>(MOCK_TASKS);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:underline">Projects</Link> &rsaquo;
            <span className="font-semibold text-slate-800">P1-CLIMATE</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Work Plan & Activity Tasks</h1>
          <p className="text-xs text-slate-500">
            Track operational tasks tied directly to logframe activities and assignees.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-sm">
          <Plus className="w-4 h-4" /> Create Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tasks.map((task) => (
          <div key={task.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  task.priority === 'urgent'
                    ? 'bg-red-100 text-red-800'
                    : task.priority === 'high'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {task.priority}
              </span>
              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" /> {task.dueDate}
              </span>
            </div>

            <p className="text-xs font-semibold text-slate-800 leading-snug">{task.title}</p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="inline-flex items-center gap-1 text-slate-600">
                <User className="w-3.5 h-3.5 text-slate-400" /> {task.assigneeName}
              </span>
              <span className="font-bold text-slate-700 uppercase text-[10px]">{task.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
