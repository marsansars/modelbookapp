import { useEffect, useState } from "react";
import { format } from "date-fns";
import { getJobs, updateJob, deleteJob, getAgencies, getExpenses, updateExpense, getDisplayCurrency, setDisplayCurrency } from "@/lib/store";
import { Job, Agency, Expense, CurrencyCode, CURRENCIES, EXPENSE_CATEGORIES, calculateJobBreakdown, getDueDate } from "@/lib/types";
import { fetchExchangeRates, convertAmount, formatCurrency } from "@/lib/currency";
import { AddJobDialog } from "@/components/AddJobDialog";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { ManageAgenciesDialog } from "@/components/ManageAgenciesDialog";
import { CurrencySelector } from "@/components/CurrencySelector";
import { DueDateBadge } from "@/components/DueDateBadge";
import { JobAttachments } from "@/components/JobAttachments";
import { EditJobDialog } from "@/components/EditJobDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, ChevronDown, ChevronUp, Receipt, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [displayCur, setDisplayCur] = useState<CurrencyCode>(getDisplayCurrency());
  const [rates, setRates] = useState<Record<string, number>>({});
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const reload = () => {
    setJobs(getJobs());
    setAgencies(getAgencies());
    setExpenses(getExpenses());
  };
  useEffect(() => {
    reload();
    fetchExchangeRates().then(r => setRates(r.rates));
  }, []);

  const conv = (amount: number, from: CurrencyCode) => convertAmount(amount, from, displayCur, rates);
  const fmt = (n: number) => formatCurrency(n, displayCur);
  const fmtOrig = (n: number, cur: CurrencyCode) => formatCurrency(n, cur);
  const getAgencyName = (id?: string) => agencies.find(a => a.id === id)?.name;

  const getJobExpenses = (jobId: string) => expenses.filter(e => e.jobId === jobId);

  const toggleReimbursed = (expenseId: string, current: boolean) => {
    updateExpense(expenseId, { reimbursed: !current });
    reload();
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
          <ManageAgenciesDialog onChanged={reload} />
          <AddJobDialog onAdded={reload} />
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">No jobs yet. Add your first booking to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.sort((a, b) => new Date(b.jobDate).getTime() - new Date(a.jobDate).getTime()).map((job, i) => {
            const { agentFee, taxAmount, netPay } = calculateJobBreakdown(job.rate, job.agentPercent, job.taxPercent);
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
                {/* Top row: client info + status/delete */}
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
                      Job: {format(new Date(job.jobDate), 'MMM d, yyyy')} · Due: {format(getDueDate(job.jobDate, job.netDays), 'MMM d, yyyy')} (Net {job.netDays})
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Select value={job.status} onValueChange={v => { updateJob(job.id, { status: v as Job['status'] }); reload(); }}>
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="invoiced">Invoiced</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                    <EditJobDialog job={job} onUpdated={reload} />
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => { deleteJob(job.id); reload(); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Financial breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-border/50">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Rate ({CURRENCIES[job.currency].symbol})</p>
                    <p className="font-medium text-foreground">{fmtOrig(job.rate, job.currency)}</p>
                    {showConverted && <p className="text-xs text-muted-foreground">≈ {fmt(conv(job.rate, job.currency))}</p>}
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Agent ({job.agentPercent}%)</p>
                    <p className="font-medium text-foreground">-{fmtOrig(agentFee, job.currency)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Tax ({job.taxPercent}%)</p>
                    <p className="font-medium text-foreground">-{fmtOrig(taxAmount, job.currency)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Your Net</p>
                    <p className="font-heading font-semibold text-primary">{fmtOrig(netPay, job.currency)}</p>
                    {showConverted && <p className="text-xs text-muted-foreground">≈ {fmt(conv(netPay, job.currency))}</p>}
                  </div>
                </div>

                {/* Expand toggle */}
                <button
                  onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full pt-1"
                >
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  <span>
                    Expenses ({jobExpenses.length}) & Attachments ({(job.attachments || []).length})
                  </span>
                </button>

                {/* Expanded section */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-4 pt-2 border-t border-border/50"
                    >
                      {/* Job Expenses */}
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
                                  <span>{EXPENSE_CATEGORIES[exp.category]?.icon}</span>
                                  <div>
                                    <p className="text-foreground">{exp.description || EXPENSE_CATEGORIES[exp.category]?.label}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(exp.date), 'MMM d, yyyy')}
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

                      {/* Attachments */}
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-2">Call Sheets & Statements</h4>
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
    </div>
  );
}
