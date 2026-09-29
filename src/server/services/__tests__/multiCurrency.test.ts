import { describe, it, expect } from 'vitest';
import { 
  convertCurrency, 
  getMultiCurrencyBreakdown, 
  formatCurrencyString, 
  calculateGrantPortfolioTotal 
} from '../multiCurrency';

describe('Multi-Currency Engine (BDT, USD, EUR, TRY)', () => {
  it('converts USD to BDT correctly', () => {
    const result = convertCurrency(100, 'USD', 'BDT');
    expect(result).toBe(12000); // 100 USD * 120 BDT
  });

  it('converts EUR to USD correctly', () => {
    const result = convertCurrency(130, 'EUR', 'USD');
    // 130 EUR = 16,900 BDT -> 16,900 / 120 = 140.83 USD
    expect(result).toBe(140.83);
  });

  it('converts BDT to TRY correctly', () => {
    const result = convertCurrency(350, 'BDT', 'TRY');
    // 350 BDT / 3.5 = 100 TRY
    expect(result).toBe(100);
  });

  it('generates multi-currency breakdown for a grant', () => {
    const breakdown = getMultiCurrencyBreakdown(1000, 'USD');
    expect(breakdown.originalAmount).toBe(1000);
    expect(breakdown.originalCurrency).toBe('USD');
    expect(breakdown.amountBDT).toBe(120000);
    expect(breakdown.amountUSD).toBe(1000);
    expect(breakdown.amountEUR).toBeCloseTo(923.08, 1);
    expect(breakdown.amountTRY).toBeCloseTo(34285.71, 1);
  });

  it('formats currency strings nicely with symbols', () => {
    expect(formatCurrencyString(50000, 'BDT')).toBe('৳50,000 BDT');
    expect(formatCurrencyString(1250, 'USD')).toBe('$1,250.00 USD');
    expect(formatCurrencyString(500, 'EUR')).toBe('€500.00 EUR');
    expect(formatCurrencyString(3000, 'TRY')).toBe('₺3,000.00 TRY');
  });

  it('calculates portfolio totals from mixed currency grants', () => {
    const grants = [
      { amount: 100000, currency: 'BDT' }, // 100,000 BDT
      { amount: 1000, currency: 'USD' },   // 120,000 BDT
      { amount: 1000, currency: 'EUR' },   // 130,000 BDT
    ];
    const totalBDT = calculateGrantPortfolioTotal(grants, 'BDT');
    expect(totalBDT).toBe(350000); // 100k + 120k + 130k
  });
});
