import { Job, Expense, Agency, CurrencyCode, calculateJobBreakdown, getDueDate, EXPENSE_CATEGORIES } from './types';
import { convertAmount, formatCurrency } from './currency';
import { getAgencies } from './store';

function escapeCSV(value: string | number | undefined): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(escapeCSV).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJobsCSV(jobs: Job[], displayCur: CurrencyCode, rates: Record<string, number>) {
  const agencies = getAgencies();
  const agencyMap = Object.fromEntries(agencies.map(a => [a.id, a.name]));

  const headers = [
    'Date', 'Client', 'Description', 'Agency', 'Status',
    'Original Currency', 'Rate (Original)', 'Agent %', 'Agent Fee (Original)',
    'Tax %', 'Tax Amount (Original)', 'Net Pay (Original)',
    'Display Currency', 'Rate (Converted)', 'Agent Fee (Converted)',
    'Tax (Converted)', 'Net Pay (Converted)',
    'Net Days', 'Due Date',
  ];

  const rows: string[][] = [headers];
  for (const j of jobs) {
    const bd = calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent);
    const due = getDueDate(j.jobDate, j.netDays);
    const conv = (n: number) => convertAmount(n, j.currency, displayCur, rates);
    rows.push([
      j.jobDate, j.client, j.description,
      j.agencyId ? (agencyMap[j.agencyId] || '') : '',
      j.status, j.currency,
      j.rate.toFixed(2), j.agentPercent.toString(), bd.agentFee.toFixed(2),
      j.taxPercent.toString(), bd.taxAmount.toFixed(2), bd.netPay.toFixed(2),
      displayCur, conv(j.rate).toFixed(2), conv(bd.agentFee).toFixed(2),
      conv(bd.taxAmount).toFixed(2), conv(bd.netPay).toFixed(2),
      j.netDays.toString(), due.toISOString().split('T')[0],
    ]);
  }

  downloadCSV(rows, `modelbook-jobs-${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportExpensesCSV(expenses: Expense[], jobs: Job[], displayCur: CurrencyCode, rates: Record<string, number>) {
  const headers = [
    'Date', 'Category', 'Description', 'Original Currency', 'Amount (Original)',
    'Display Currency', 'Amount (Converted)',
    'Linked Job Client', 'Reimbursable', 'Reimbursed',
  ];

  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j.client]));
  const rows: string[][] = [headers];
  for (const e of expenses) {
    const cat = EXPENSE_CATEGORIES[e.category];
    rows.push([
      e.date, cat?.label || e.category, e.description,
      e.currency, e.amount.toFixed(2),
      displayCur, convertAmount(e.amount, e.currency, displayCur, rates).toFixed(2),
      e.jobId ? (jobMap[e.jobId] || '') : '',
      e.reimbursable ? 'Yes' : 'No',
      e.reimbursed ? 'Yes' : 'No',
    ]);
  }

  downloadCSV(rows, `modelbook-expenses-${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportSummaryCSV(jobs: Job[], expenses: Expense[], displayCur: CurrencyCode, rates: Record<string, number>) {
  const conv = (n: number, from: CurrencyCode) => convertAmount(n, from, displayCur, rates);

  const totalGross = jobs.reduce((s, j) => s + conv(j.rate, j.currency), 0);
  const totalAgent = jobs.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).agentFee, j.currency), 0);
  const totalTax = jobs.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).taxAmount, j.currency), 0);
  const totalNet = jobs.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).netPay, j.currency), 0);
  const totalExp = expenses.reduce((s, e) => s + conv(e.amount, e.currency), 0);
  const paidNet = jobs.filter(j => j.status === 'paid').reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).netPay, j.currency), 0);
  const unpaidNet = jobs.filter(j => j.status !== 'paid').reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).netPay, j.currency), 0);
  const reimbursableTotal = expenses.filter(e => e.reimbursable).reduce((s, e) => s + conv(e.amount, e.currency), 0);
  const reimbursedTotal = expenses.filter(e => e.reimbursed).reduce((s, e) => s + conv(e.amount, e.currency), 0);

  const rows: string[][] = [
    ['ModelBook Financial Summary', ''],
    ['Export Date', new Date().toISOString().split('T')[0]],
    ['Display Currency', displayCur],
    ['', ''],
    ['INCOME', ''],
    ['Gross Earnings', totalGross.toFixed(2)],
    ['Agent Commissions', totalAgent.toFixed(2)],
    ['Tax Reserve', totalTax.toFixed(2)],
    ['Net After Agent & Tax', totalNet.toFixed(2)],
    ['', ''],
    ['EXPENSES', ''],
    ['Total Expenses', totalExp.toFixed(2)],
    ['Reimbursable Expenses', reimbursableTotal.toFixed(2)],
    ['Reimbursed Expenses', reimbursedTotal.toFixed(2)],
    ['', ''],
    ['BOTTOM LINE', ''],
    ['Net After Everything', (totalNet - totalExp).toFixed(2)],
    ['', ''],
    ['PAYMENT STATUS', ''],
    ['Received (Paid Jobs)', paidNet.toFixed(2)],
    ['Outstanding (Unpaid Jobs)', unpaidNet.toFixed(2)],
    ['', ''],
    ['Total Jobs', jobs.length.toString()],
    ['Total Expenses', expenses.length.toString()],
  ];

  downloadCSV(rows, `modelbook-summary-${new Date().toISOString().split('T')[0]}.csv`);
}
