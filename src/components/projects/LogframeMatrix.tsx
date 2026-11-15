import { MATRIX_LABELS, formatNumber, formatPercent, indicatorProgress, matrixRows, type LogframeData, type LogframeKind } from '@/lib/logframe';

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
export function LogframeMatrix({ data }: { data: LogframeData }) {
  const rows = matrixRows(data.nodes, data.indicators);
  if (rows.length === 0) return <p className="text-sm text-slate-500">No logframe yet. Add the goal in the list view first.</p>;

  return (
    <div className="space-y-2">
      <div className="flex justify-end print:hidden">
        <button type="button" onClick={() => window.print()} className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 text-slate-700">
          Print this table
        </button>
      </div>
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
    </div>
  );
}
