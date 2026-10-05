'use client';

import { useState } from 'react';
import { Target, Plus, ChevronRight, Layers, BarChart2 } from 'lucide-react';
import Link from 'next/link';

interface LogframeNode {
  id: string;
  kind: 'goal' | 'outcome' | 'output' | 'activity';
  code: string;
  title: string;
  indicatorsCount: number;
}

const MOCK_NODES: LogframeNode[] = [];

export default function LogframeEditorPage({ params }: { params: { id: string } }) {
  const [nodes] = useState<LogframeNode[]>(MOCK_NODES);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:underline">Projects</Link> &rsaquo;
            <span className="font-semibold text-slate-800">{params.id || 'Project'}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Logical Framework Tree (Logframe)
          </h1>
          <p className="text-xs text-slate-500">
            Hierarchical tree editor: Goal &rarr; Outcome &rarr; Output &rarr; Activity &rarr; Indicators.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-sm">
          <Plus className="w-4 h-4" /> Add Goal Node
        </button>
      </div>

      {nodes.length > 0 ? (
        <div className="space-y-3">
          {nodes.map((node) => (
            <div
              key={node.id}
              className={`bg-white border rounded-2xl p-4 shadow-sm space-y-2 transition-all ${
                node.kind === 'goal'
                  ? 'border-blue-300 bg-blue-50/20'
                  : node.kind === 'outcome'
                  ? 'border-indigo-200 ml-4'
                  : node.kind === 'output'
                  ? 'border-purple-200 ml-8'
                  : 'border-slate-200 ml-12'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      node.kind === 'goal'
                        ? 'bg-blue-600 text-white'
                        : node.kind === 'outcome'
                        ? 'bg-indigo-600 text-white'
                        : node.kind === 'output'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-white'
                    }`}
                  >
                    {node.kind}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-900">{node.code}</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  <BarChart2 className="w-3 h-3 text-blue-600" /> {node.indicatorsCount} Indicators
                </span>
              </div>

              <p className="text-xs font-semibold text-slate-800">{node.title}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-3">
          <Target className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Logframe Tree Nodes Defined</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click &ldquo;Add Goal Node&rdquo; to build your logical framework hierarchy (Goal, Outcome, Output, Activity).
          </p>
        </div>
      )}
    </div>
  );
}
