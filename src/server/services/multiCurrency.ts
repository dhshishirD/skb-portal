export type SupportedCurrency = 'BDT' | 'USD' | 'EUR' | 'TRY';

export interface ExchangeRateMap {
  [key: string]: number; // Rate relative to BDT (1 BDT = X Target Currency)
}

/**
 * Standard Exchange Rates baseline (Base: BDT)
 * 1 USD = ~120 BDT
 * 1 EUR = ~130 BDT
 * 1 TRY = ~3.5 BDT
 */
export const DEFAULT_EXCHANGE_RATES_TO_BDT: Record<SupportedCurrency, number> = {
  BDT: 1,
  USD: 120.0,
  EUR: 130.0,
  TRY: 3.5,
};

export interface MultiCurrencyBreakdown {
  originalAmount: number;
  originalCurrency: SupportedCurrency;
  amountBDT: number;
  amountUSD: number;
  amountEUR: number;
  amountTRY: number;
}

/**
 * Convert any amount between BDT, USD, EUR, and TRY
 */
export function convertCurrency(
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency,
  ratesToBDT = DEFAULT_EXCHANGE_RATES_TO_BDT
): number {
  if (isNaN(amount) || amount < 0) return 0;
  if (fromCurrency === toCurrency) return Number(amount.toFixed(2));

  // Convert to BDT first
  const bdtValue = amount * (ratesToBDT[fromCurrency] || 1);
  // Convert from BDT to target currency
  const targetValue = bdtValue / (ratesToBDT[toCurrency] || 1);

  return Number(targetValue.toFixed(2));
}

/**
 * Get full multi-currency breakdown for a grant or budget allocation
 */
export function getMultiCurrencyBreakdown(
  amount: number,
  currency: SupportedCurrency,
  ratesToBDT = DEFAULT_EXCHANGE_RATES_TO_BDT
): MultiCurrencyBreakdown {
  return {
    originalAmount: amount,
    originalCurrency: currency,
    amountBDT: convertCurrency(amount, currency, 'BDT', ratesToBDT),
    amountUSD: convertCurrency(amount, currency, 'USD', ratesToBDT),
    amountEUR: convertCurrency(amount, currency, 'EUR', ratesToBDT),
    amountTRY: convertCurrency(amount, currency, 'TRY', ratesToBDT),
  };
}

/**
 * Format currency with proper symbol & localized number strings
 */
export function formatCurrencyString(amount: number, currency: SupportedCurrency): string {
  const symbols: Record<SupportedCurrency, string> = {
    BDT: '৳',
    USD: '$',
    EUR: '€',
    TRY: '₺',
  };

  const symbol = symbols[currency] || currency;
  const formattedNumber = amount.toLocaleString('en-US', {
    minimumFractionDigits: currency === 'BDT' ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return `${symbol}${formattedNumber} ${currency}`;
}

/**
 * Calculate total portfolio grant funding converted to target currency (default BDT)
 */
export function calculateGrantPortfolioTotal(
  grants: Array<{ amount: number; currency: string }>,
  targetCurrency: SupportedCurrency = 'BDT',
  ratesToBDT = DEFAULT_EXCHANGE_RATES_TO_BDT
): number {
  return grants.reduce((sum, grant) => {
    const validCurrency = (['BDT', 'USD', 'EUR', 'TRY'].includes(grant.currency.toUpperCase())
      ? grant.currency.toUpperCase()
      : 'BDT') as SupportedCurrency;

    const converted = convertCurrency(grant.amount, validCurrency, targetCurrency, ratesToBDT);
    return sum + converted;
  }, 0);
}
