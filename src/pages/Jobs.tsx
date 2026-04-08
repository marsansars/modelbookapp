import { useEffect, useState } from "react";
import { format } from "date-fns";
import { getJobs, updateJob, deleteJob, getAgencies, getExpenses, updateExpense, getDisplayCurrency, setDisplayCurrency, getAllExpenseCategories } from "@/lib/store";
import { Job, Agency, Expense, CurrencyCode, CURRENCIES, calculateJobBreakdown, getDueDate, getDaysUntilDue, ExpenseCategoryInfo, parseLocalDate } from "@/lib/types";
import { fetchExchangeRates, convertAmount, formatCurrency } from "@/lib/currency";
import { AddJobDialog } from "@/components/AddJobDialog";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";

import { CurrencySelector } from "@/components/CurrencySelector";
import { DueDateBadge } from "@/components/DueDateBadge";
import { JobAttachments } from "@/components/JobAttachments";
import { EditJobDialog } from "@/components/EditJobDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, ChevronDown, ChevronUp, Receipt, CheckCircle2, CalendarCheck, ArrowUpDown, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [displayCur, setDisplayCur] = useState<CurrencyCode>('USD');
  const [rates, setRates] = useState<Record<string, number>>({});
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [cats, setCats] = useState<Record<string, ExpenseCategoryInfo>>({});
  const [paymentDialog, setPaymentDialog] = useState<{ jobId: string; date: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  const reload = async () => {
    const [j, a, e, c] = await Promise.all([getJobs(), getAgencies(), getExpenses(), getAllExpenseCategories()]);
    setJobs(j); setAgencies(a); setExpenses(e); setCats(c);
  };

  useEffect(() => {
    const load = async () => {
      const [j, a, e, cur, r, c] = await Promise.all([
        getJobs(), getAgencies(), getExpenses(), getDisplayCurrency(),
        fetchExchangeRates(), getAllExpenseCategories(),
      ]);
      setJobs(j); setAgencies(a); setExpenses(e); setDisplayCur(cur);
      setRates(r.rates); setCats(c);
    };
    load();
  }, []);

  const conv = (amount: number, from: CurrencyCode) => convertAmount(amount, from, displayCur, rates);
  const fmt = (n: number) => formatCurrency(n, displayCur);
  const fmtOrig = (n: number, cur: CurrencyCode) => formatCurrency(n, cur);
  const getAgencyName = (id?: string) => agencies.find(a => a.id === id)?.name;
  const getJobExpenses = (jobId: string) => expenses.filter(e => e.jobId === jobId);

  const handleRecordPayment = async () => {
    if (!paymentDialog) return;
    await updateJob(paymentDialog.jobId, { status: 'paid', paidDate: paymentDialog.date });
    setPaymentDialog(null);
    await reload();
  };

  const handleUnmarkPaid = async (jobId: string) => {
    await updateJob(jobId, { status: 'pending', paidDate: '' });
    await reload();
  };

  const handleDeleteJob = async (jobId: string) => {
    await deleteJob(jobId);
    await reload();
  };

  const toggleReimbursed = async (expenseId: string, current: boolean) => {
    await updateExpense(expenseId, { reimbursed: !current });
    await reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-heading font-semibold">Jobs & Bookings</h1>
          <p className="text-muted-foreground mt-1">Track every job, see what you're owed.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CurrencySelector value={displayCur} onChange={c => { setDisplayCur(c); setDisplayCurrency(c); }} />
          <AddJobDialog onAdded={reload} />
        </div>
      </div>

      {/* Filters & Sort */}
      {jobs.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Unpaid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="amount-desc">Highest Rate</SelectItem>
                <SelectItem value="amount-asc">Lowest Rate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">No jobs yet. Add your first booking to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs
            .filter(job => {
              if (statusFilter === 'all') return true;
              if (statusFilter === 'paid') return job.status === 'paid';
              if (statusFilter === 'pending') return job.status !== 'paid';
              if (statusFilter === 'overdue') {
                const { getDaysUntilDue } = require('@/lib/types');
                return job.status !== 'paid' && getDaysUntilDue(job.jobDate, job.netDays) < 0;
              }
              return true;
            })
            .sort((a, b) => {
              switch (sortBy) {
                case 'date-asc': return parseLocalDate(a.jobDate).getTime() - parseLocalDate(b.jobDate).getTime();
                case 'amount-desc': return b.rate - a.rate;
                case 'amount-asc': return a.rate - b.rate;
                default: return parseLocalDate(b.jobDate).getTime() - parseLocalDate(a.jobDate).getTime();
              }
            })
            .map((job, i) => {
            const { agentFee, netPay } = calculateJobBreakdown(job.rate, job.agentPercent);
            const agencyName = getAgencyName(job.agencyId);
            const showConverted = job.currency !== displayCur;
            const jobExpenses = getJobExpenses(job.id);
            const reimbursableExpenses = jobExpenses.filter(e => e.reimbursable);
            const reimbursedCount = reimbursableExpenses.filter(e => e.reimbursed).length;
            const isExpanded = expandedJob === job.id;

            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-heading font-semibold text-lg text-foreground truncate">{job.client}</h3>
                      <DueDateBadge jobDate={job.jobDate} status={job.status} netDays={job.netDays} />
                      {reimbursableExpenses.length > 0 && (
                        <Badge className={reimbursedCount === reimbursableExpenses.length
                          ? "bg-success/20 text-success border-success/30"
                          : "bg-warning/20 text-warning border-warning/30"
                        }>
                          {reimbursedCount}/{reimbursableExpenses.length} reimbursed
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{job.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {agencyName && <span className="text-primary">{agencyName} · </span>}
                      Job: {format(parseLocalDate(job.jobDate), 'MMM d, yyyy')} · Due: {format(getDueDate(job.jobDate, job.netDays), 'MMM d, yyyy')} (Net {job.netDays})
                      {job.paidDate && <span className="text-success"> · Paid: {format(parseLocalDate(job.paidDate), 'MMM d, yyyy')}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {job.status === 'paid' ? (
                      <Button variant="outline" size="sm" className="h-8 text-xs text-success border-success/30 gap-1" onClick={() => handleUnmarkPaid(job.id)}>
                        <CalendarCheck className="h-3.5 w-3.5" /> Paid
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setPaymentDialog({ jobId: job.id, date: format(new Date(), 'yyyy-MM-dd') })}>
                        <CalendarCheck className="h-3.5 w-3.5" /> Record Payment
                      </Button>
                    )}
                    <EditJobDialog job={job} onUpdated={reload} />
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDeleteJob(job.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Line items breakdown */}
                {job.lineItems && job.lineItems.length > 1 && (
                  <div className="pt-3 border-t border-border/50 space-y-1">
                    <p className="text-muted-foreground text-xs mb-1.5">Rate Breakdown</p>
                    {job.lineItems.map((li, idx) => (
                      <div key={li.id || idx} className="flex items-center justify-between text-sm px-2 py-1 rounded bg-secondary/20">
                        <span className="text-muted-foreground">{li.description || `Line ${idx + 1}`}</span>
                        <span className="font-medium text-foreground">{fmtOrig(li.amount, job.currency)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 border-t border-border/50">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Total Rate ({CURRENCIES[job.currency].symbol})</p>
                    <p className="font-medium text-foreground">{fmtOrig(job.rate, job.currency)}</p>
                    {showConverted && <p className="text-xs text-muted-foreground">≈ {fmt(conv(job.rate, job.currency))}</p>}
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Agent ({job.agentPercent}%)</p>
                    <p className="font-medium text-foreground">-{fmtOrig(agentFee, job.currency)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Your Net</p>
                    <p className="font-heading font-semibold text-primary">{fmtOrig(netPay, job.currency)}</p>
                    {showConverted && <p className="text-xs text-muted-foreground">≈ {fmt(conv(netPay, job.currency))}</p>}
                  </div>
                </div>

                {/* Notes - collapsible */}
                {job.notes && (
                  <details className="pt-3 border-t border-border/50 group">
                    <summary className="text-muted-foreground text-xs cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-1">
                      <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                      Notes
                    </summary>
                    <p className="text-sm text-foreground whitespace-pre-wrap mt-1.5">{job.notes}</p>
                  </details>
                )}

                <button
                  onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full pt-1"
                >
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  <span>
                    Expenses ({jobExpenses.length}) & Attachments ({(job.attachments || []).length})
                  </span>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-4 pt-2 border-t border-border/50"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            Linked Expenses
                          </h4>
                          <AddExpenseDialog onAdded={reload} defaultJobId={job.id} />
                        </div>
                        {jobExpenses.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No expenses linked to this job yet.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {jobExpenses.map(exp => (
                              <div key={exp.id} className="flex items-center justify-between p-2.5 rounded-md bg-secondary/30 text-sm">
                                <div className="flex items-center gap-2.5">
                                  <span>{cats[exp.category]?.icon || '📋'}</span>
                                  <div>
                                    <p className="text-foreground">{exp.description || cats[exp.category]?.label || exp.category}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(parseLocalDate(exp.date), 'MMM d, yyyy')}
                                      {exp.reimbursable && (
                                        <span className={exp.reimbursed ? ' text-success' : ' text-warning'}> · {exp.reimbursed ? 'Reimbursed ✓' : 'Awaiting reimbursement'}</span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{formatCurrency(exp.amount, exp.currency)}</span>
                                  {exp.reimbursable && (
                                    <button
                                      onClick={() => toggleReimbursed(exp.id, !!exp.reimbursed)}
                                      className={`p-1 rounded transition-colors ${exp.reimbursed ? 'text-success hover:text-success/70' : 'text-muted-foreground hover:text-warning'}`}
                                      title={exp.reimbursed ? 'Mark as not reimbursed' : 'Mark as reimbursed'}
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-2">Attachments</h4>
                        <JobAttachments job={job} onChanged={reload} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={!!paymentDialog} onOpenChange={open => !open && setPaymentDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="paid-date">Payment Date</Label>
              <Input
                id="paid-date"
                type="date"
                value={paymentDialog?.date || ''}
                onChange={e => setPaymentDialog(prev => prev ? { ...prev, date: e.target.value } : null)}
              />
            </div>
            <Button className="w-full" onClick={handleRecordPayment}>Confirm Payment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
