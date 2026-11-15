'use client';

import { useState } from 'react';
import { MATRIX_LABELS, compactRows, formatNumber, formatPercent, indicatorProgress, matrixRows, type LogframeData, type LogframeKind } from '@/lib/logframe';

const BAND: Record<LogframeKind, string> = {
  goal: 'bg-purple-800 text-white',
  outcome: 'bg-indigo-600 text-white',
  output: 'bg-cyan-600 text-white',
  activity: 'bg-green-600 text-white',
};
const cell = 'p-3 align-top text-sm text-slate-800 whitespace-pre-line break-words';
const mobileLabel = 'block text-[10px] font-bold uppercase tracking-wide text-slate-500 lg:hidden';

/**
 * The classic four-column logframe: narrative summary, indicators, means of verification, assumptions.
 * Read only; it is built from the same items as the list. Below the lg width each row becomes a card.
 */
export function LogframeMatrix({ data, projectTitle }: { data: LogframeData; projectTitle?: string }) {
  const [layout, setLayout] = useState<'compact' | 'detailed'>('compact');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rows = matrixRows(data.nodes, data.indicators);
  const compact = compactRows(data.nodes, data.indicators);
  if (rows.length === 0) return <p className="text-sm text-slate-500">No logframe yet. Add the goal in the list view first.</p>;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="inline-flex rounded-xl border border-slate-300 p-0.5">
          {(['compact', 'detailed'] as const).map((l) => (
            <button key={l} type="button" aria-pressed={layout === l} onClick={() => setLayout(l)} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${layout === l ? 'bg-slate-900 text-white' : 'text-slate-700'}`}>
              {l === 'compact' ? 'Compact (donor style)' : 'Item by item'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                const { buildLogframeDocx } = await import('@/lib/logframeDocx');
                const blob = await buildLogframeDocx(projectTitle ?? 'Project', compact);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'logframe.docx';
                a.click();
                URL.revokeObjectURL(url);
              } catch {
                setError('Could not make the Word file. Please try again.');
              } finally {
                setBusy(false);
              }
            }}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50"
          >
            {busy ? 'Preparing…' : 'Download as Word'}
          </button>
          <button type="button" onClick={() => window.print()} className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 text-slate-700">
            Print
          </button>
        </div>
      </div>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      {layout === 'compact' ? (
        <table className="block lg:table w-full border-separate border-spacing-y-2 lg:border-spacing-2 print:table">
          <thead className="hidden lg:table-header-group print:table-header-group">
            <tr>
              <th className="w-28" />
              <th className="text-left text-xs font-bold text-white bg-rose-400 p-2.5">Narrative summary</th>
              <th className="text-left text-xs font-bold text-white bg-orange-400 p-2.5">Indicators</th>
              <th className="text-left text-xs font-bold text-white bg-amber-400 p-2.5">Means of verification</th>
              <th className="text-left text-xs font-bold text-white bg-lime-500 p-2.5">Assumptions</th>
            </tr>
          </thead>
          <tbody className="block lg:table-row-group print:table-row-group">
            {compact.map((r) => (
              <tr key={r.kind} className="block lg:table-row rounded-xl border border-slate-200 lg:border-0 overflow-hidden mb-3 lg:mb-0 break-inside-avoid">
                <th scope="row" className={`block lg:table-cell p-3 text-left text-xs font-bold lg:w-28 ${BAND[r.kind]}`}>{r.label}</th>
                {([['Narrative summary', r.narrative, 'bg-rose-50'], ['Indicators', r.indicators, 'bg-orange-50'], ['Means of verification', r.verification, 'bg-amber-50'], ['Assumptions', r.assumptions, 'bg-lime-50']] as const).map(([name, items, bg]) => (
                  <td key={name} className={`block lg:table-cell ${bg} ${cell}`}>
                    <span className={mobileLabel}>{name}</span>
                    {items.length === 0 ? <span className="text-slate-400">—</span> : items.map((t, i) => <span key={i} className="block mb-1.5">{t}</span>)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
      <table className="block lg:table w-full border-separate border-spacing-y-2 lg:border-spacing-2 print:table">
        <thead className="hidden lg:table-header-group print:table-header-group">
          <tr>
            <th className="w-28" />
            <th className="text-left text-xs font-bold text-white bg-rose-400 p-2.5">Narrative summary</th>
            <th className="text-left text-xs font-bold text-white bg-orange-400 p-2.5">Indicators</th>
            <th className="text-left text-xs font-bold text-white bg-amber-400 p-2.5">Means of verification</th>
            <th className="text-left text-xs font-bold text-white bg-lime-500 p-2.5">Assumptions</th>
          </tr>
        </thead>
        <tbody className="block lg:table-row-group print:table-row-group">
          {rows.map(({ node, indicators }) => (
            <tr key={node.id} className="block lg:table-row rounded-xl border border-slate-200 lg:border-0 overflow-hidden mb-3 lg:mb-0 break-inside-avoid">
              <th scope="row" className={`block lg:table-cell p-3 text-left text-xs font-bold lg:w-28 ${BAND[node.kind]}`}>
                {MATRIX_LABELS[node.kind]}
                <span className="block font-mono text-[11px] font-normal opacity-80">{node.code}</span>
              </th>
              <td className={`block lg:table-cell bg-rose-50 ${cell}`}>
                <span className={mobileLabel}>Narrative summary</span>
                <b>{node.title}</b>
                {node.description ? `\n${node.description}` : ''}
              </td>
              <td className={`block lg:table-cell bg-orange-50 ${cell}`}>
                <span className={mobileLabel}>Indicators</span>
                {indicators.length === 0 && <span className="text-slate-400">—</span>}
                {indicators.map((i) => {
                  const p = indicatorProgress(i);
                  return (
                    <span key={i.id} className="block mb-1.5">
                      • {i.name}
                      <span className="block text-xs text-slate-600">
                        Target {i.target.toLocaleString('en-US')} {i.unit}
                        {p.percentBp !== null ? ` · now ${formatNumber(p.achievedHundredths)} (${formatPercent(p.percentBp)})` : ''}
                      </span>
                    </span>
                  );
                })}
              </td>
              <td className={`block lg:table-cell bg-amber-50 ${cell}`}>
                <span className={mobileLabel}>Means of verification</span>
                {indicators.filter((i) => i.meansOfVerification).length === 0 && <span className="text-slate-400">—</span>}
                {indicators
                  .filter((i) => i.meansOfVerification)
                  .map((i) => (
                    <span key={i.id} className="block mb-1">
                      • {i.meansOfVerification}
                    </span>
                  ))}
              </td>
              <td className={`block lg:table-cell bg-lime-50 ${cell}`}>
                <span className={mobileLabel}>Assumptions</span>
                {node.assumptions ?? <span className="text-slate-400">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </div>
  );
}
