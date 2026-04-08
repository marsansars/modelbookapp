import { Job, Expense, Agency, CurrencyCode } from './types';

const JOBS_KEY = 'modelbook_jobs';
const EXPENSES_KEY = 'modelbook_expenses';
const AGENCIES_KEY = 'modelbook_agencies';
const DISPLAY_CURRENCY_KEY = 'modelbook_display_currency';

// Jobs
export function getJobs(): Job[] {
  const data = localStorage.getItem(JOBS_KEY);
  return data ? JSON.parse(data) : [];
}
export function saveJobs(jobs: Job[]) {
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
}
export function addJob(job: Job) {
  const jobs = getJobs();
  jobs.push(job);
  saveJobs(jobs);
}
export function updateJob(id: string, updates: Partial<Job>) {
  const jobs = getJobs().map(j => j.id === id ? { ...j, ...updates } : j);
  saveJobs(jobs);
}
export function deleteJob(id: string) {
  saveJobs(getJobs().filter(j => j.id !== id));
}

// Expenses
export function getExpenses(): Expense[] {
  const data = localStorage.getItem(EXPENSES_KEY);
  return data ? JSON.parse(data) : [];
}
export function saveExpenses(expenses: Expense[]) {
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}
export function addExpense(expense: Expense) {
  const expenses = getExpenses();
  expenses.push(expense);
  saveExpenses(expenses);
}
export function updateExpense(id: string, updates: Partial<Expense>) {
  const expenses = getExpenses().map(e => e.id === id ? { ...e, ...updates } : e);
  saveExpenses(expenses);
}
export function deleteExpense(id: string) {
  saveExpenses(getExpenses().filter(e => e.id !== id));
}

// Agencies
export function getAgencies(): Agency[] {
  const data = localStorage.getItem(AGENCIES_KEY);
  return data ? JSON.parse(data) : [];
}
export function saveAgencies(agencies: Agency[]) {
  localStorage.setItem(AGENCIES_KEY, JSON.stringify(agencies));
}
export function addAgency(agency: Agency) {
  const agencies = getAgencies();
  agencies.push(agency);
  saveAgencies(agencies);
}
export function updateAgency(id: string, updates: Partial<Agency>) {
  const agencies = getAgencies().map(a => a.id === id ? { ...a, ...updates } : a);
  saveAgencies(agencies);
}
export function deleteAgency(id: string) {
  saveAgencies(getAgencies().filter(a => a.id !== id));
}

// Display Currency
export function getDisplayCurrency(): CurrencyCode {
  return (localStorage.getItem(DISPLAY_CURRENCY_KEY) as CurrencyCode) || 'USD';
}
export function setDisplayCurrency(currency: CurrencyCode) {
  localStorage.setItem(DISPLAY_CURRENCY_KEY, currency);
}
