import { CurrencyCode, CURRENCIES } from './types';

const RATES_KEY = 'modelbook_exchange_rates';
const RATES_TS_KEY = 'modelbook_exchange_rates_ts';
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours

interface RatesCache {
  base: string;
  rates: Record<string, number>;
}

// Fallback rates (approximate) used when API is unavailable
const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, JPY: 149.5, CHF: 0.88, AUD: 1.53,
  CAD: 1.36, SEK: 10.5, DKK: 6.88, NOK: 10.6, CNY: 7.24, KRW: 1320,
  BRL: 4.97, ZAR: 18.2, HKD: 7.82, SGD: 1.34, AED: 3.67, INR: 83.1,
  MXN: 17.1, THB: 35.5,
};

export async function fetchExchangeRates(): Promise<RatesCache> {
  const cached = localStorage.getItem(RATES_KEY);
  const ts = localStorage.getItem(RATES_TS_KEY);

  if (cached && ts && Date.now() - parseInt(ts) < CACHE_DURATION) {
    return JSON.parse(cached);
  }

  try {
    // Free, no-key API
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (!res.ok) throw new Error('Rate fetch failed');
    const data = await res.json();
    const cache: RatesCache = { base: 'USD', rates: data.rates };
    localStorage.setItem(RATES_KEY, JSON.stringify(cache));
    localStorage.setItem(RATES_TS_KEY, String(Date.now()));
    return cache;
  } catch {
    // Use fallback or cached
    if (cached) return JSON.parse(cached);
    return { base: 'USD', rates: FALLBACK_RATES };
  }
}

export function convertAmount(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  rates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) return amount;
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;
  return amount * (toRate / fromRate);
}

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const { symbol } = CURRENCIES[currency];
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = amount < 0 ? '-' : '';
  return `${sign}${symbol}${formatted}`;
}
