import { Job, Expense, Agency, CurrencyCode, ExpenseCategoryInfo, DEFAULT_EXPENSE_CATEGORIES, JobAttachment, LineItem } from './types';
import { supabase } from '@/integrations/supabase/client';

// Helper to get current user id
async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// ---- User Settings ----

export async function getDisplayName(): Promise<string | null> {
  const userId = await getUserId();
  const { data } = await supabase
    .from('user_settings')
    .select('display_name')
    .eq('user_id', userId)
    .maybeSingle();
  return (data as any)?.display_name || null;
}

export async function setDisplayName(name: string): Promise<void> {
  const userId = await getUserId();
  const { data: existing } = await supabase
    .from('user_settings')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase.from('user_settings').update({ display_name: name } as any).eq('user_id', userId);
  } else {
    await supabase.from('user_settings').insert({ user_id: userId, display_name: name } as any);
  }
}

export async function getDisplayCurrency(): Promise<CurrencyCode> {
  const userId = await getUserId();
  const { data } = await supabase
    .from('user_settings')
    .select('display_currency')
    .eq('user_id', userId)
    .maybeSingle();
  return (data?.display_currency as CurrencyCode) || 'USD';
}

export async function setDisplayCurrency(currency: CurrencyCode): Promise<void> {
  const userId = await getUserId();
  const { data: existing } = await supabase
    .from('user_settings')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase.from('user_settings').update({ display_currency: currency }).eq('user_id', userId);
  } else {
    await supabase.from('user_settings').insert({ user_id: userId, display_currency: currency });
  }
}

export async function getCustomCategories(): Promise<Record<string, ExpenseCategoryInfo>> {
  const userId = await getUserId();
  const { data } = await supabase
    .from('user_settings')
    .select('custom_categories')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data?.custom_categories) return {};
  return data.custom_categories as unknown as Record<string, ExpenseCategoryInfo>;
}

async function saveCustomCategories(cats: Record<string, ExpenseCategoryInfo>): Promise<void> {
  const userId = await getUserId();
  const { data: existing } = await supabase
    .from('user_settings')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase.from('user_settings').update({ custom_categories: cats as any }).eq('user_id', userId);
  } else {
    await supabase.from('user_settings').insert({ user_id: userId, custom_categories: cats as any });
  }
}

export async function getAllExpenseCategories(): Promise<Record<string, ExpenseCategoryInfo>> {
  const custom = await getCustomCategories();
  return { ...DEFAULT_EXPENSE_CATEGORIES, ...custom };
}

export async function addCustomCategory(key: string, info: ExpenseCategoryInfo): Promise<void> {
  const cats = await getCustomCategories();
  cats[key] = info;
  await saveCustomCategories(cats);
}

export async function deleteCustomCategory(key: string): Promise<void> {
  const cats = await getCustomCategories();
  delete cats[key];
  await saveCustomCategories(cats);
}

// ---- Jobs ----

function mapJobFromDb(row: any): Job {
  return {
    id: row.id,
    client: row.client,
    description: row.description,
    jobDate: row.job_date,
    rate: Number(row.rate),
    currency: row.currency as CurrencyCode,
    agentPercent: Number(row.agent_percent),
    taxPercent: Number(row.tax_percent),
    netDays: row.net_days,
    agencyId: row.agency_id || undefined,
    status: row.status as Job['status'],
    notes: row.notes || undefined,
    paidDate: row.paid_date || undefined,
    attachments: (row.attachments as unknown as JobAttachment[]) || [],
    lineItems: (row.line_items as unknown as LineItem[]) || [],
  };
}

export async function getJobs(): Promise<Job[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', userId)
    .order('job_date', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapJobFromDb);
}

export async function addJob(job: Omit<Job, 'id'>): Promise<void> {
  const userId = await getUserId();
  await supabase.from('jobs').insert({
    user_id: userId,
    client: job.client,
    description: job.description,
    job_date: job.jobDate,
    rate: job.rate,
    currency: job.currency,
    agent_percent: job.agentPercent,
    tax_percent: job.taxPercent,
    net_days: job.netDays,
    agency_id: job.agencyId || null,
    status: job.status,
    notes: job.notes || null,
    attachments: (job.attachments || []) as any,
  });
}

export async function updateJob(id: string, updates: Partial<Job>): Promise<void> {
  const dbUpdates: any = {};
  if (updates.client !== undefined) dbUpdates.client = updates.client;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.jobDate !== undefined) dbUpdates.job_date = updates.jobDate;
  if (updates.rate !== undefined) dbUpdates.rate = updates.rate;
  if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
  if (updates.agentPercent !== undefined) dbUpdates.agent_percent = updates.agentPercent;
  if (updates.taxPercent !== undefined) dbUpdates.tax_percent = updates.taxPercent;
  if (updates.netDays !== undefined) dbUpdates.net_days = updates.netDays;
  if (updates.agencyId !== undefined) dbUpdates.agency_id = updates.agencyId || null;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.paidDate !== undefined) dbUpdates.paid_date = updates.paidDate || null;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.attachments !== undefined) dbUpdates.attachments = updates.attachments;

  await supabase.from('jobs').update(dbUpdates as any).eq('id', id);
}

export async function deleteJob(id: string): Promise<void> {
  await supabase.from('jobs').delete().eq('id', id);
}

// ---- Expenses ----

function mapExpenseFromDb(row: any): Expense {
  return {
    id: row.id,
    date: row.date,
    category: row.category,
    description: row.description,
    amount: Number(row.amount),
    currency: row.currency as CurrencyCode,
    receipt: row.receipt || undefined,
    jobId: row.job_id || undefined,
    reimbursable: row.reimbursable || false,
    reimbursed: row.reimbursed || false,
  };
}

export async function getExpenses(): Promise<Expense[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapExpenseFromDb);
}

export async function addExpense(expense: Omit<Expense, 'id'>): Promise<void> {
  const userId = await getUserId();
  await supabase.from('expenses').insert({
    user_id: userId,
    date: expense.date,
    category: expense.category,
    description: expense.description,
    amount: expense.amount,
    currency: expense.currency,
    receipt: expense.receipt || null,
    job_id: expense.jobId || null,
    reimbursable: expense.reimbursable || false,
    reimbursed: expense.reimbursed || false,
  });
}

export async function updateExpense(id: string, updates: Partial<Expense>): Promise<void> {
  const dbUpdates: Record<string, any> = {};
  if (updates.date !== undefined) dbUpdates.date = updates.date;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
  if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
  if (updates.receipt !== undefined) dbUpdates.receipt = updates.receipt;
  if (updates.jobId !== undefined) dbUpdates.job_id = updates.jobId || null;
  if (updates.reimbursable !== undefined) dbUpdates.reimbursable = updates.reimbursable;
  if (updates.reimbursed !== undefined) dbUpdates.reimbursed = updates.reimbursed;

  await supabase.from('expenses').update(dbUpdates as any).eq('id', id);
}

export async function deleteExpense(id: string): Promise<void> {
  await supabase.from('expenses').delete().eq('id', id);
}

// ---- Agencies ----

function mapAgencyFromDb(row: any): Agency {
  return {
    id: row.id,
    name: row.name,
    defaultAgentPercent: Number(row.default_agent_percent),
    defaultCurrency: row.default_currency as CurrencyCode,
    defaultNetDays: row.default_net_days,
  };
}

export async function getAgencies(): Promise<Agency[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('agencies')
    .select('*')
    .eq('user_id', userId)
    .order('name');
  if (error) throw error;
  return (data || []).map(mapAgencyFromDb);
}

export async function addAgency(agency: Omit<Agency, 'id'>): Promise<void> {
  const userId = await getUserId();
  await supabase.from('agencies').insert({
    user_id: userId,
    name: agency.name,
    default_agent_percent: agency.defaultAgentPercent,
    default_currency: agency.defaultCurrency,
    default_net_days: agency.defaultNetDays,
  });
}

export async function updateAgency(id: string, updates: Partial<Agency>): Promise<void> {
  const dbUpdates: Record<string, any> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.defaultAgentPercent !== undefined) dbUpdates.default_agent_percent = updates.defaultAgentPercent;
  if (updates.defaultCurrency !== undefined) dbUpdates.default_currency = updates.defaultCurrency;
  if (updates.defaultNetDays !== undefined) dbUpdates.default_net_days = updates.defaultNetDays;

  await supabase.from('agencies').update(dbUpdates as any).eq('id', id);
}

export async function deleteAgency(id: string): Promise<void> {
  await supabase.from('agencies').delete().eq('id', id);
}
