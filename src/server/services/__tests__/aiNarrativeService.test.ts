import { describe, it, expect } from 'vitest';
import {
  buildNarrativePrompt,
  generateDonorNarrative,
  ProjectNarrativeContext,
} from '../aiNarrativeService';

describe('AI Narrative Service', () => {
  const sampleContext: ProjectNarrativeContext = {
    projectCode: 'PROJ-WASH-2026',
    projectTitle: 'Clean Water & Hygiene for Cox’s Bazar',
    donorName: 'UNICEF Bangladesh',
    reportingPeriod: 'Q1 2026 (Jan - Mar)',
    totalBudgetBDT: 5000000,
    spentBudgetBDT: 2500000,
    indicators: [
      { title: 'Tube-wells Installed', target: 20, achieved: 18, unit: 'wells' },
      { title: 'Hygiene Kits Distributed', target: 1000, achieved: 1050, unit: 'kits' },
    ],
    fieldReportHighlights: ['Completed community hygiene awareness workshop in Teknaf'],
    challengesEncountered: ['Heavy rainfall delayed tube-well drilling by 4 days'],
  };

  it('should construct structured prompt correctly', () => {
    const prompt = buildNarrativePrompt(sampleContext);
    expect(prompt).toContain('PROJ-WASH-2026');
    expect(prompt).toContain('UNICEF Bangladesh');
    expect(prompt).toContain('50.0% burn rate');
    expect(prompt).toContain('Tube-wells Installed: 18 / 20 wells');
  });

  it('should generate donor narrative draft with markdown layout', async () => {
    const narrative = await generateDonorNarrative(sampleContext);

    expect(narrative.executiveSummary).toContain('PROJ-WASH-2026');
    expect(narrative.executiveSummary).toContain('50.0%');
    expect(narrative.keyAchievements.length).toBeGreaterThan(0);
    expect(narrative.challengesAndMitigations.length).toBeGreaterThan(0);
    expect(narrative.financialOverview).toContain('50.0%');
    expect(narrative.fullMarkdown).toContain('# Donor Progress Report');
    expect(narrative.modelUsed).toBe('heuristic-llm-fallback');
  });

  it('should use gemini model designation when API key is supplied', async () => {
    const narrative = await generateDonorNarrative(sampleContext, 'mock_gemini_key');
    expect(narrative.modelUsed).toBe('gemini-1.5-pro');
  });
});
