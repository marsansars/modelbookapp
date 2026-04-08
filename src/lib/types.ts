export interface Agency {
  id: string;
  name: string;
  defaultAgentPercent: number;
  defaultCurrency: CurrencyCode;
  defaultNetDays: number;
}

export interface JobAttachment {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  addedAt: string;
}

export interface Job {
  id: string;
  client: string;
  description: string;
  jobDate: string;
  rate: number;
  currency: CurrencyCode;
  agentPercent: number;
  taxPercent: number;
  netDays: number;
  agencyId?: string;
  status: 'pending' | 'invoiced' | 'paid' | 'overdue';
  notes?: string;
  attachments?: JobAttachment[];
}

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: CurrencyCode;
  receipt?: string;
  jobId?: string;
  reimbursable?: boolean;
  reimbursed?: boolean;
}

export type ExpenseCategory = string;

export interface ExpenseCategoryInfo {
  label: string;
  icon: string;
}

export const DEFAULT_EXPENSE_CATEGORIES: Record<string, ExpenseCategoryInfo> = {
  meals: { label: 'Meals & Dining', icon: '🍽️' },
  transport: { label: 'Transport & Taxis', icon: '🚕' },
  flights: { label: 'Flights', icon: '✈️' },
  hotel: { label: 'Hotels & Lodging', icon: '🏨' },
  wardrobe: { label: 'Wardrobe & Styling', icon: '👗' },
  beauty: { label: 'Beauty & Grooming', icon: '💄' },
  portfolio: { label: 'Portfolio & Comp Cards', icon: '📸' },
  other: { label: 'Other', icon: '📋' },
};

// Back-compat alias
export const EXPENSE_CATEGORIES = DEFAULT_EXPENSE_CATEGORIES;

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CHF' | 'AUD' | 'CAD' | 'SEK' | 'DKK' | 'NOK' | 'CNY' | 'KRW' | 'BRL' | 'ZAR' | 'HKD' | 'SGD' | 'AED' | 'INR' | 'MXN' | 'THB';

export const CURRENCIES: Record<CurrencyCode, { label: string; symbol: string }> = {
  USD: { label: 'US Dollar', symbol: '$' },
  EUR: { label: 'Euro', symbol: '€' },
  GBP: { label: 'British Pound', symbol: '£' },
  JPY: { label: 'Japanese Yen', symbol: '¥' },
  CHF: { label: 'Swiss Franc', symbol: 'CHF' },
  AUD: { label: 'Australian Dollar', symbol: 'A$' },
  CAD: { label: 'Canadian Dollar', symbol: 'C$' },
  SEK: { label: 'Swedish Krona', symbol: 'kr' },
  DKK: { label: 'Danish Krone', symbol: 'kr' },
  NOK: { label: 'Norwegian Krone', symbol: 'kr' },
  CNY: { label: 'Chinese Yuan', symbol: '¥' },
  KRW: { label: 'South Korean Won', symbol: '₩' },
  BRL: { label: 'Brazilian Real', symbol: 'R$' },
  ZAR: { label: 'South African Rand', symbol: 'R' },
  HKD: { label: 'Hong Kong Dollar', symbol: 'HK$' },
  SGD: { label: 'Singapore Dollar', symbol: 'S$' },
  AED: { label: 'UAE Dirham', symbol: 'د.إ' },
  INR: { label: 'Indian Rupee', symbol: '₹' },
  MXN: { label: 'Mexican Peso', symbol: 'Mex$' },
  THB: { label: 'Thai Baht', symbol: '฿' },
};

export const DEFAULT_NET_DAYS = 60;

/** Parse a date string (YYYY-MM-DD) as a local date, avoiding timezone shifts. */
export function parseLocalDate(dateStr: string): Date {
  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  return new Date(dateStr);
}

export function getDueDate(jobDate: string, netDays: number = DEFAULT_NET_DAYS): Date {
  const d = parseLocalDate(jobDate);
  d.setDate(d.getDate() + netDays);
  return d;
}

export function getDaysUntilDue(jobDate: string, netDays: number = DEFAULT_NET_DAYS): number {
  const due = getDueDate(jobDate, netDays);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function calculateJobBreakdown(rate: number, agentPercent: number, taxPercent: number = 0) {
  const agentFee = rate * (agentPercent / 100);
  const grossAfterAgent = rate - agentFee;
  const taxAmount = 0;
  const netPay = grossAfterAgent;
  return { agentFee, taxAmount, netPay, grossAfterAgent };
}
