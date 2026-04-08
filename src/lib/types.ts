export interface Job {
  id: string;
  client: string;
  description: string;
  jobDate: string;
  rate: number;
  agentPercent: number;
  taxPercent: number;
  status: 'pending' | 'invoiced' | 'paid' | 'overdue';
  notes?: string;
}

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  receipt?: string;
}

export type ExpenseCategory = 
  | 'meals'
  | 'transport'
  | 'hotel'
  | 'wardrobe'
  | 'beauty'
  | 'portfolio'
  | 'other';

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, { label: string; icon: string }> = {
  meals: { label: 'Meals & Dining', icon: '🍽️' },
  transport: { label: 'Transport & Taxis', icon: '🚕' },
  hotel: { label: 'Hotels & Lodging', icon: '🏨' },
  wardrobe: { label: 'Wardrobe & Styling', icon: '👗' },
  beauty: { label: 'Beauty & Grooming', icon: '💄' },
  portfolio: { label: 'Portfolio & Comp Cards', icon: '📸' },
  other: { label: 'Other', icon: '📋' },
};

export const NET_DAYS = 60;

export function getDueDate(jobDate: string): Date {
  const d = new Date(jobDate);
  d.setDate(d.getDate() + NET_DAYS);
  return d;
}

export function getDaysUntilDue(jobDate: string): number {
  const due = getDueDate(jobDate);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function calculateJobBreakdown(rate: number, agentPercent: number, taxPercent: number) {
  const agentFee = rate * (agentPercent / 100);
  const grossAfterAgent = rate - agentFee;
  const taxAmount = grossAfterAgent * (taxPercent / 100);
  const netPay = grossAfterAgent - taxAmount;
  return { agentFee, taxAmount, netPay, grossAfterAgent };
}
