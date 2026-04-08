import { useEffect, useState } from "react";
import { format } from "date-fns";
import { getExpenses, getJobs, deleteExpense, updateExpense, getDisplayCurrency, setDisplayCurrency, getAllExpenseCategories, getAgencies } from "@/lib/store";
import { Expense, Job, Agency, CurrencyCode, ExpenseCategoryInfo } from "@/lib/types";
import { fetchExchangeRates, convertAmount, formatCurrency } from "@/lib/currency";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { CurrencySelector } from "@/components/CurrencySelector";
import { EditExpenseDialog } from "@/components/EditExpenseDialog";
import { ManageCategoriesDialog } from "@/components/ManageCategoriesDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, CheckCircle2, Receipt, FileText, Building2 } from "lucide-react";
import { motion } from "framer-motion";

type FilterMode = 'all' | 'reimbursable' | 'write-off';

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [displayCur, setDisplayCur] = useState<CurrencyCode>('USD');
  const [rates, setRates] = useState<Record<string, number>>({});
  const [cats, setCats] = useState<Record<string, ExpenseCategoryInfo>>({});
  const [filter, setFilter] = useState<FilterMode>('all');

  const reload = async () => {
    const [e, j, a, c] = await Promise.all([getExpenses(), getJobs(), getAgencies(), getAllExpenseCategories()]);
    setExpenses(e); setJobs(j); setAgencies(a); setCats(c);
  };

  useEffect(() => {
    const load = async () => {
      const [e, j, a, cur, r, c] = await Promise.all([
        getExpenses(), getJobs(), getAgencies(), getDisplayCurrency(),
        fetchExchangeRates(), getAllExpenseCategories(),
      ]);
      setExpenses(e); setJobs(j); setAgencies(a); setDisplayCur(cur); setRates(r.rates); setCats(c);
    };
    load();
  }, []);

  const conv = (amount: number, from: CurrencyCode) => convertAmount(amount, from, displayCur, rates);
  const fmt = (n: number) => formatCurrency(n, displayCur);
  const total = expenses.reduce((s, e) => s + conv(e.amount, e.currency), 0);

  const getJobName = (id?: string) => {
    const j = jobs.find(j => j.id === id);
    return j ? `${j.client} — ${j.description}` : undefined;
  };

  const getJobAgencyName = (jobId?: string) => {
    const j = jobs.find(j => j.id === jobId);
    if (!j?.agencyId) return undefined;
    return agencies.find(a => a.id === j.agencyId)?.name;
  };

  const toggleReimbursed = async (id: string, current: boolean) => {
    await updateExpense(id, { reimbursed: !current });
    await reload();
  };

  const handleDelete = async (id: string) => {
    await deleteExpense(id);
    await reload();
  };

  // Summary calculations
  const reimbursableExpenses = expenses.filter(e => e.reimbursable);
  const pendingReimbursement = reimbursableExpenses.filter(e => !e.reimbursed);
  const reimbursedExpenses = reimbursableExpenses.filter(e => e.reimbursed);
  const writeOffExpenses = expenses.filter(e => !e.reimbursable);

  const totalReimbursable = pendingReimbursement.reduce((s, e) => s + conv(e.amount, e.currency), 0);
  const totalReimbursed = reimbursedExpenses.reduce((s, e) => s + conv(e.amount, e.currency), 0);
  const totalWriteOffs = writeOffExpenses.reduce((s, e) => s + conv(e.amount, e.currency), 0);

  // Group reimbursable by agency/client
  const reimbursableBySource = pendingReimbursement.reduce((acc, e) => {
    const agencyName = getJobAgencyName(e.jobId);
    const jobName = getJobName(e.jobId);
    const key = agencyName || jobName || 'Unlinked';
    if (!acc[key]) acc[key] = { total: 0, count: 0 };
    acc[key].total += conv(e.amount, e.currency);
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  // Filter expenses
  const filteredExpenses = expenses.filter(e => {
    if (filter === 'reimbursable') return e.reimbursable;
    if (filter === 'write-off') return !e.reimbursable;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-heading font-semibold">Expenses</h1>
          <p className="text-muted-foreground mt-1">Track every dollar you spend on the job.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ManageCategoriesDialog onUpdated={reload} />
          <CurrencySelector value={displayCur} onChange={c => { setDisplayCur(c); setDisplayCurrency(c); }} />
          <AddExpenseDialog onAdded={reload} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card p-4 text-center">
          <Receipt className="h-6 w-6 text-warning mx-auto" />
          <p className="text-xs text-muted-foreground mt-2">Pending Reimbursement</p>
          <p className="font-heading font-semibold text-warning mt-1">{fmt(totalReimbursable)}</p>
          <p className="text-[10px] text-muted-foreground">{pendingReimbursement.length} expense{pendingReimbursement.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <CheckCircle2 className="h-6 w-6 text-success mx-auto" />
          <p className="text-xs text-muted-foreground mt-2">Reimbursed</p>
          <p className="font-heading font-semibold text-success mt-1">{fmt(totalReimbursed)}</p>
          <p className="text-[10px] text-muted-foreground">{reimbursedExpenses.length} expense{reimbursedExpenses.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <FileText className="h-6 w-6 text-primary mx-auto" />
          <p className="text-xs text-muted-foreground mt-2">Tax Write-offs</p>
          <p className="font-heading font-semibold text-primary mt-1">{fmt(totalWriteOffs)}</p>
          <p className="text-[10px] text-muted-foreground">{writeOffExpenses.length} expense{writeOffExpenses.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="glass-card p-4 text-center gold-glow">
          <p className="text-2xl">💰</p>
          <p className="text-xs text-muted-foreground mt-1">Total Expenses</p>
          <p className="font-heading font-semibold text-foreground mt-1">{fmt(total)}</p>
        </div>
      </div>

      {/* Reimbursable by Agency/Client breakdown */}
      {Object.keys(reimbursableBySource).length > 0 && (
        <div className="glass-card p-5">
          <h2 className="font-heading text-sm font-semibold mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Pending Reimbursements by Source
          </h2>
          <div className="space-y-2">
            {Object.entries(reimbursableBySource)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([source, data]) => (
                <div key={source} className="flex items-center justify-between p-3 rounded-md bg-secondary/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">{source}</p>
                    <p className="text-xs text-muted-foreground">{data.count} expense{data.count !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="font-heading font-semibold text-warning">{fmt(data.total)}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Show:</span>
        <Select value={filter} onValueChange={v => setFilter(v as FilterMode)}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Expenses</SelectItem>
            <SelectItem value="reimbursable">Reimbursable Only</SelectItem>
            <SelectItem value="write-off">Tax Write-offs Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredExpenses.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">
            {filter === 'all' ? 'No expenses tracked yet.' : `No ${filter === 'reimbursable' ? 'reimbursable' : 'tax write-off'} expenses.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((exp, i) => {
            const showConverted = exp.currency !== displayCur;
            const jobName = getJobName(exp.jobId);
            const agencyName = getJobAgencyName(exp.jobId);
            return (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-card p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{cats[exp.category]?.icon || '📋'}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{exp.description || cats[exp.category]?.label || exp.category}</p>
                      {exp.reimbursable ? (
                        <Badge className={exp.reimbursed
                          ? "bg-success/20 text-success border-success/30 text-[10px] px-1.5 py-0"
                          : "bg-warning/20 text-warning border-warning/30 text-[10px] px-1.5 py-0"
                        }>
                          {exp.reimbursed ? 'Reimbursed' : 'Reimbursable'}
                        </Badge>
                      ) : (
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] px-1.5 py-0">
                          Write-off
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(exp.date), 'MMM d, yyyy')}
                      {agencyName && <span> · <span className="text-primary">{agencyName}</span></span>}
                      {jobName && <span> · {jobName}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="font-medium text-foreground">{formatCurrency(exp.amount, exp.currency)}</span>
                    {showConverted && <p className="text-xs text-muted-foreground">≈ {fmt(conv(exp.amount, exp.currency))}</p>}
                  </div>
                  {exp.reimbursable && (
                    <button
                      onClick={() => toggleReimbursed(exp.id, !!exp.reimbursed)}
                      className={`p-1 rounded transition-colors ${exp.reimbursed ? 'text-success hover:text-success/70' : 'text-muted-foreground hover:text-warning'}`}
                      title={exp.reimbursed ? 'Mark as not reimbursed' : 'Mark as reimbursed'}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  )}
                  <EditExpenseDialog expense={exp} onUpdated={reload} />
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(exp.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
