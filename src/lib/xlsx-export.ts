import * as XLSX from 'xlsx';
import { Job, Expense, Agency, CurrencyCode, calculateJobBreakdown, getDueDate, EXPENSE_CATEGORIES } from './types';
import { convertAmount } from './currency';

function downloadXLSX(workbook: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(workbook, filename, { bookType: 'xlsx', type: 'binary' });
}

/** Auto-size columns based on the longest cell in each column. */
function autoFitColumns(rows: (string | number)[][]) {
  if (rows.length === 0) return [];
  const cols = rows[0].length;
  const widths: { wch: number }[] = [];
  for (let c = 0; c < cols; c++) {
    let max = 10;
    for (const r of rows) {
      const v = r[c];
      const len = v == null ? 0 : String(v).length;
      if (len > max) max = len;
    }
    widths.push({ wch: Math.min(max + 2, 50) });
  }
  return widths;
}

export function exportJobsXLSX(
  jobs: Job[],
  displayCur: CurrencyCode,
  rates: Record<string, number>,
  agencies?: Agency[]
) {
  const agencyMap = agencies ? Object.fromEntries(agencies.map(a => [a.id, a.name])) : {};

  const headers = [
    'Date', 'Client', 'Description', 'Agency', 'Status',
    'Original Currency', 'Rate (Original)', 'Agent %', 'Agent Fee (Original)',
    'Tax %', 'Tax Amount (Original)', 'Net Pay (Original)',
    'Display Currency', 'Rate (Converted)', 'Agent Fee (Converted)',
    'Tax (Converted)', 'Net Pay (Converted)',
    'Net Days', 'Due Date',
  ];

  const rows: (string | number)[][] = [headers];
  for (const j of jobs) {
    const bd = calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent);
    const due = getDueDate(j.jobDate, j.netDays);
    const conv = (n: number) => Number(convertAmount(n, j.currency, displayCur, rates).toFixed(2));
    rows.push([
      j.jobDate, j.client, j.description,
      j.agencyId ? (agencyMap[j.agencyId] || '') : '',
      j.status, j.currency,
      Number(j.rate.toFixed(2)), j.agentPercent, Number(bd.agentFee.toFixed(2)),
      j.taxPercent, Number(bd.taxAmount.toFixed(2)), Number(bd.netPay.toFixed(2)),
      displayCur, conv(j.rate), conv(bd.agentFee),
      conv(bd.taxAmount), conv(bd.netPay),
      j.netDays, due.toISOString().split('T')[0],
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = autoFitColumns(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Jobs');
  downloadXLSX(wb, `modelbook-jobs-${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportExpensesXLSX(
  expenses: Expense[],
  jobs: Job[],
  displayCur: CurrencyCode,
  rates: Record<string, number>
) {
  const headers = [
    'Date', 'Category', 'Description', 'Original Currency', 'Amount (Original)',
    'Display Currency', 'Amount (Converted)',
    'Linked Job Client', 'Reimbursable', 'Reimbursed',
  ];

  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j.client]));
  const rows: (string | number)[][] = [headers];
  for (const e of expenses) {
    const cat = EXPENSE_CATEGORIES[e.category];
    rows.push([
      e.date, cat?.label || e.category, e.description,
      e.currency, Number(e.amount.toFixed(2)),
      displayCur, Number(convertAmount(e.amount, e.currency, displayCur, rates).toFixed(2)),
      e.jobId ? (jobMap[e.jobId] || '') : '',
      e.reimbursable ? 'Yes' : 'No',
      e.reimbursed ? 'Yes' : 'No',
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = autoFitColumns(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
  downloadXLSX(wb, `modelbook-expenses-${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportSummaryXLSX(
  jobs: Job[],
  expenses: Expense[],
  displayCur: CurrencyCode,
  rates: Record<string, number>
) {
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

  const r = (n: number) => Number(n.toFixed(2));

  const rows: (string | number)[][] = [
    ['ModelBook Financial Summary', ''],
    ['Export Date', new Date().toISOString().split('T')[0]],
    ['Display Currency', displayCur],
    ['', ''],
    ['INCOME', ''],
    ['Gross Earnings', r(totalGross)],
    ['Agent Commissions', r(totalAgent)],
    ['Tax Reserve', r(totalTax)],
    ['Net After Agent & Tax', r(totalNet)],
    ['', ''],
    ['EXPENSES', ''],
    ['Total Expenses', r(totalExp)],
    ['Reimbursable Expenses', r(reimbursableTotal)],
    ['Reimbursed Expenses', r(reimbursedTotal)],
    ['', ''],
    ['BOTTOM LINE', ''],
    ['Net After Everything', r(totalNet - totalExp)],
    ['', ''],
    ['PAYMENT STATUS', ''],
    ['Received (Paid Jobs)', r(paidNet)],
    ['Outstanding (Unpaid Jobs)', r(unpaidNet)],
    ['', ''],
    ['Total Jobs', jobs.length],
    ['Total Expense Lines', expenses.length],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 28 }, { wch: 18 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Summary');
  downloadXLSX(wb, `modelbook-summary-${new Date().toISOString().split('T')[0]}.xlsx`);
}
