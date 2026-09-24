export interface CompiledDonorReport {
  grantCode: string;
  grantTitle: string;
  donorName: string;
  period: string;
  totalGrantAmount: number;
  spentAmount: number;
  burnRatePercent: number;
  indicatorsSummary: Array<{ name: string; target: number; achieved: number; unit: string }>;
  format: 'pdf' | 'word' | 'excel';
}

export function compileDonorReportPayload(input: {
  grantCode: string;
  grantTitle: string;
  donorName: string;
  period: string;
  totalGrantAmount: number;
  spentAmount: number;
  indicators: Array<{ name: string; target: number; achieved: number; unit: string }>;
  format?: 'pdf' | 'word' | 'excel';
}): CompiledDonorReport {
  const burnRatePercent = Number(((input.spentAmount / input.totalGrantAmount) * 100).toFixed(2));

  return {
    grantCode: input.grantCode,
    grantTitle: input.grantTitle,
    donorName: input.donorName,
    period: input.period,
    totalGrantAmount: input.totalGrantAmount,
    spentAmount: input.spentAmount,
    burnRatePercent,
    indicatorsSummary: input.indicators,
    format: input.format || 'pdf',
  };
}
