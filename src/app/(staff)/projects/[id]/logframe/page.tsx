'use client';

import { useState, useEffect } from 'react';
import { Target, Plus, ChevronRight, Layers, BarChart2, CheckCircle2, Edit2, Trash2, X } from 'lucide-react';
import Link from 'next/link';

interface LogframeNode {
  id: string;
  kind: 'goal' | 'outcome' | 'output' | 'activity';
  code: string;
  title: string;
  indicatorsCount: number;
}

const DEFAULT_STARTER_NODES: LogframeNode[] = [
  { id: 'lf-1', kind: 'goal', code: 'GOAL-01', title: 'Enhance Sustainable Livelihoods & Water Security in Disaster-Prone Districts', indicatorsCount: 4 },
  { id: 'lf-2', kind: 'outcome', code: 'OUT-1.1', title: '120 Host Community Households Gain Sustainable Income-Generating Assets', indicatorsCount: 3 },
  { id: 'lf-3', kind: 'output', code: 'OUT-1.1.1', title: 'Distribution of 20 Dairy Cows, 60 Goats & 40 Sewing Machines with Training', indicatorsCount: 2 },
  { id: 'lf-4', kind: 'activity', code: 'ACT-1.1.1.1', title: 'Beneficiary NID Verification, Guardian Sign-off & Distribution Event', indicatorsCount: 1 },
];

export default function LogframeEditorPage({ params }: { params: { id: string } }) {
  const projectId = params.id || 'PID-22567';
  const storageKey = `skb_logframe_${projectId}`;

  const [nodes, setNodes] = useState<LogframeNode[]>(DEFAULT_STARTER_NODES);
  const [toastMsg, setToastMsg] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNode, setEditingNode] = useState<LogframeNode | null>(null);

  // Form State
  const [nodeKind, setNodeKind] = useState<LogframeNode['kind']>('goal');
  const [nodeCode, setNodeCode] = useState('');
  const [nodeTitle, setNodeTitle] = useState('');
  const [nodeIndicators, setNodeIndicators] = useState(2);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setNodes(parsed);
          }
        } catch (e) {
          console.error('Failed to load logframe nodes', e);
        }
      }
    }
  }, [storageKey]);

  const saveNodes = (newNodes: LogframeNode[]) => {
    setNodes(newNodes);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(newNodes));
    }
  };

  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeTitle.trim()) return;

    const created: LogframeNode = {
      id: `lf_${Date.now()}`,
      kind: nodeKind,
      code: nodeCode.trim() || `${nodeKind.toUpperCase()}-${nodes.length + 1}`,
      title: nodeTitle.trim(),
      indicatorsCount: Number(nodeIndicators) || 1,
    };

    const updated = [...nodes, created];
    saveNodes(updated);

    setShowAddModal(false);
    setNodeTitle('');
    setNodeCode('');
    setToastMsg(`Added new ${nodeKind.toUpperCase()} node "${created.code}"! Saved to logframe.`);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleOpenEdit = (node: LogframeNode) => {
    setEditingNode(node);
    setNodeKind(node.kind);
    setNodeCode(node.code);
    setNodeTitle(node.title);
    setNodeIndicators(node.indicatorsCount);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNode || !nodeTitle.trim()) return;

    const updated = nodes.map((n) => {
      if (n.id === editingNode.id) {
        return {
          ...n,
          kind: nodeKind,
          code: nodeCode.trim() || n.code,
          title: nodeTitle.trim(),
          indicatorsCount: Number(nodeIndicators) || 1,
        };
      }
      return n;
    });

    saveNodes(updated);
    setEditingNode(null);
    setToastMsg(`Logframe node "${nodeCode}" updated & saved!`);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleDeleteNode = (id: string, code: string) => {
    if (confirm(`Are you sure you want to delete logframe node "${code}"?`)) {
      const updated = nodes.filter((n) => n.id !== id);
      saveNodes(updated);
      setToastMsg(`Node "${code}" deleted.`);
      setTimeout(() => setToastMsg(''), 3000);
    }
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
            <Target className="w-5 h-5 text-blue-600" />
            Logical Framework Tree (Logframe)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Hierarchical M&E Tree: Goal &rarr; Outcome &rarr; Output &rarr; Activity &rarr; Indicators.
          </p>
        </div>
        <button 
          onClick={() => {
            setNodeKind('goal');
            setNodeCode('');
            setNodeTitle('');
            setNodeIndicators(2);
            setShowAddModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Add Logframe Node
        </button>
      </div>

      {toastMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {toastMsg}
        </div>
      )}

      {nodes.length > 0 ? (
        <div className="space-y-3">
          {nodes.map((node) => (
            <div
              key={node.id}
              className={`bg-white border rounded-2xl p-4 shadow-sm space-y-3 transition-all ${
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
                  <span className="font-mono text-xs font-extrabold text-slate-900">{node.code}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md font-semibold">
                    <BarChart2 className="w-3 h-3 text-blue-600" /> {node.indicatorsCount} Indicators
                  </span>
                  <button
                    onClick={() => handleOpenEdit(node)}
                    className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition"
                    title="Edit Node"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteNode(node.id, node.code)}
                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                    title="Delete Node"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs font-bold text-slate-800 leading-snug">{node.title}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-3">
          <Target className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Logframe Tree Nodes Defined</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click &ldquo;Add Logframe Node&rdquo; to build your logical framework hierarchy (Goal, Outcome, Output, Activity).
          </p>
        </div>
      )}

      {/* MODAL: ADD / EDIT LOGFRAME NODE */}
      {(showAddModal || editingNode) && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                {editingNode ? 'Edit Logframe Node' : 'Add New Logframe Node'}
              </h3>
              <button 
                onClick={() => { setShowAddModal(false); setEditingNode(null); }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={editingNode ? handleSaveEdit : handleAddNode} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hierarchy Kind</label>
                  <select
                    value={nodeKind}
                    onChange={(e) => setNodeKind(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  >
                    <option value="goal">Goal (Top Level)</option>
                    <option value="outcome">Outcome</option>
                    <option value="output">Output</option>
                    <option value="activity">Activity</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Node Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GOAL-01 or OUT-1.1"
                    value={nodeCode}
                    onChange={(e) => setNodeCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Node Statement & Objective Title</label>
                <textarea
                  rows={3}
                  required
                  placeholder="State the objective, outcome statement, or specific activity..."
                  value={nodeTitle}
                  onChange={(e) => setNodeTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">M&E Indicators Count</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={nodeIndicators}
                  onChange={(e) => setNodeIndicators(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingNode(null); }}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all"
                >
                  {editingNode ? 'Save Node Changes' : 'Confirm & Add Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
