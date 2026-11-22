'use client';

import { useState } from 'react';
import { Presentation } from 'lucide-react';
import type { CharterVersion } from '@/lib/charter';
import { todayInDhaka } from '@/lib/workStatement';
import type { DeckAudience, DeckPlan } from '@/lib/projectDeck';
import { getBudgetAction } from '@/server/actions/budget';
import { getBeneficiariesAction } from '@/server/actions/beneficiaries';
import { getCharterAction } from '@/server/actions/charter';
import { getLogframeAction } from '@/server/actions/logframe';
import { getProjectAreasAction } from '@/server/actions/projectAreas';

export interface DeckProject {
  id: string;
  code: string;
  title: string;
  stageLabel: string;
  location: string | null;
  donorName: string | null;
  startDate: string | null;
  endDate: string | null;
  beneficiaryTarget: number | null;
}

const inputCls = 'px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white';

/** Makes a first-draft PowerPoint of the project from what the portal already holds. Built in the browser. */
export function ProjectDeckPanel({ project }: { project: DeckProject }) {
  const [audience, setAudience] = useState<DeckAudience>('donor');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Pick<DeckPlan, 'skipped' | 'cautions'> & { slides: number } | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const [charter, areas, people, logframe, budget] = await Promise.all([
        getCharterAction(project.id),
        getProjectAreasAction(project.id),
        getBeneficiariesAction(project.id),
        getLogframeAction(project.id),
        getBudgetAction(project.id),
      ]);
      // the latest approved charter version, else the newest one
      let version: CharterVersion | undefined;
      if (charter.ok) version = charter.data.versions.find((v) => v.approvedAt) ?? charter.data.versions[0];
      const preparedOn = todayInDhaka();
      const { buildDeckPlan, deckFileName } = await import('@/lib/projectDeck');
      const plan = buildDeckPlan({
        audience,
        project: { code: project.code, title: project.title, stageLabel: project.stageLabel, location: project.location, donorName: project.donorName, startDate: project.startDate, endDate: project.endDate, beneficiaryTarget: project.beneficiaryTarget },
        charter: version ? { text: { background: version.background, objectives: version.objectives, scopeIn: version.scopeIn, scopeOut: version.scopeOut, deliverables: version.deliverables, risks: version.risks, team: version.team }, version: version.version, approved: !!version.approvedAt } : null,
        areas: areas.ok ? areas.data.areas : null,
        counts: people.ok ? people.data.counts : null,
        logframe: logframe.ok ? logframe.data : null,
        budget: budget.ok ? budget.data : null,
        preparedOn,
      });
      const { buildDeckPptx } = await import('@/lib/projectDeckPptx');
      const bytes = await buildDeckPptx(plan, { code: project.code, title: project.title });
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = deckFileName(project.code, audience, preparedOn);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setResult({ slides: plan.slides.length, skipped: plan.skipped, cautions: plan.cautions });
    } catch {
      setError('Could not make the presentation. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3" aria-label="Presentation">
      <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Presentation size={14} /> Presentation (first draft)</h2>
      <p className="text-xs text-slate-600">Makes a PowerPoint from what is already in the portal: the project facts, charter, areas, people reached, results and budget. Open it in PowerPoint and finish it. Show it to the Executive Director before it goes to a donor.</p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="deck-audience" className="block text-xs font-bold text-slate-600 mb-1">For</label>
          <select id="deck-audience" className={inputCls} value={audience} onChange={(e) => setAudience(e.target.value as DeckAudience)}>
            <option value="donor">Donor (no risks, team or administration cost)</option>
            <option value="internal">Inside SKB (all parts)</option>
          </select>
        </div>
        <button type="button" disabled={busy} onClick={() => void run()} className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-50">
          {busy ? 'Making the file…' : 'Make the PowerPoint'}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {result && (
        <div role="status" className="text-sm text-slate-700 space-y-1">
          <p className="text-emerald-700">The file is ready ({result.slides} slides) and was downloaded.</p>
          {result.cautions.length > 0 && (
            <ul className="list-disc pl-5 text-amber-800">
              {result.cautions.map((c) => <li key={c}>{c}</li>)}
            </ul>
          )}
          {result.skipped.length > 0 && (
            <>
              <p className="text-xs font-semibold text-slate-600">Left out because there was nothing to show:</p>
              <ul className="list-disc pl-5 text-xs text-slate-600">
                {result.skipped.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
