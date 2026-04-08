import { Job, Expense } from './types';

const JOBS_KEY = 'modelbook_jobs';
const EXPENSES_KEY = 'modelbook_expenses';

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

export function deleteExpense(id: string) {
  saveExpenses(getExpenses().filter(e => e.id !== id));
}
