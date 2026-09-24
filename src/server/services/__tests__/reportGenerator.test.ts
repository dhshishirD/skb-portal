import { describe, it, expect } from 'vitest';
import { compileDonorReportPayload } from '../reportGenerator';

describe('Phase 4 Donor Report Generator Service', () => {
  it('should compile donor report payload with burn rate and indicator summaries', () => {
    const report = compileDonorReportPayload({
      grantCode: 'G1-USAID',
      grantTitle: 'Coastal Climate Resilience Grant',
      donorName: 'USAID Bangladesh',
      period: '2026-Q3',
      totalGrantAmount: 500000,
      spentAmount: 150000,
      indicators: [
        { name: 'Mangrove Saplings Planted', target: 10000, achieved: 8500, unit: 'saplings' },
        { name: 'Embankment Repair Length', target: 15, achieved: 12, unit: 'km' },
      ],
      format: 'pdf',
    });

    expect(report.grantCode).toBe('G1-USAID');
    expect(report.burnRatePercent).toBe(30.0);
    expect(report.indicatorsSummary.length).toBe(2);
    expect(report.format).toBe('pdf');
  });
});
