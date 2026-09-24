'use client';

import { useState } from 'react';
import { CheckSquare, Square, ArrowRight, ShieldCheck, History, Info } from 'lucide-react';
import Link from 'next/link';

interface StageGate {
  id: string;
  stage: string;
  label: string;
  done: boolean;
}

const STAGES = [
  { key: 'concept', label: 'Concept Note' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'approved', label: 'Approved' },
  { key: 'implementation', label: 'Implementation' },
  { key: 'monitoring_evaluation', label: 'M&E Review' },
  { key: 'closed', label: 'Closed' },
];

export default function KanbanBoardPage({ params }: { params: { id: string } }) {
  const [currentStage, setCurrentStage] = useState('implementation');
  const [gates, setGates] = useState<StageGate[]>([
    { id: '1', stage: 'concept', label: 'Concept note document attached', done: true },
    { id: '2', stage: 'concept', label: 'Donor/Grant identified', done: true },
    { id: '3', stage: 'proposal', label: 'Logframe complete', done: true },
    { id: '4', stage: 'proposal', label: 'Budget lines sum to grant amount', done: true },
    { id: '5', stage: 'approved', label: 'Team assigned & grant agreement uploaded', done: true },
    { id: '6', stage: 'implementation', label: 'Baseline indicator values captured', done: false },
  ]);

  const toggleGate = (id: string) => {
    setGates((prev) =>
      prev.map((g) => (g.id === id ? { ...g, done: !g.done } : g))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:underline">Projects</Link> &rsaquo;
            <span className="font-semibold text-slate-800">P1-CLIMATE</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Project Stage Kanban & Gates</h1>
          <p className="text-xs text-slate-500">
            Stage gates block invalid transitions until required prerequisites are completed.
          </p>
        </div>
      </div>

      {/* Kanban Stages Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        {STAGES.map((s, idx) => {
          const isCurrent = s.key === currentStage;
          const isPassed = STAGES.findIndex((x) => x.key === currentStage) > idx;

          return (
            <div
              key={s.key}
              className={`p-3 rounded-xl border text-center transition-all ${
                isCurrent
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md font-bold'
                  : isPassed
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider opacity-75">Stage {idx + 1}</div>
              <div className="text-xs mt-0.5">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Stage Gates Checklist Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Stage Prerequisites Checklist ({STAGES.find((s) => s.key === currentStage)?.label})
          </h2>
        </div>

        <div className="space-y-2">
          {gates
            .filter((g) => g.stage === currentStage)
            .map((gate) => (
              <button
                key={gate.id}
                onClick={() => toggleGate(gate.id)}
                className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                  gate.done
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <span className="text-xs font-medium">{gate.label}</span>
                {gate.done ? (
                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-400" />
                )}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
