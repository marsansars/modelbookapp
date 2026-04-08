import { useEffect, useState } from "react";
import { format } from "date-fns";
import { StatCard } from "@/components/StatCard";
import { DueDateBadge } from "@/components/DueDateBadge";
import { CurrencySelector } from "@/components/CurrencySelector";
import { EarningsChart } from "@/components/EarningsChart";

import { getJobs, getExpenses, getDisplayCurrency, setDisplayCurrency, getAgencies } from "@/lib/store";
import { Job, Expense, Agency, CurrencyCode, calculateJobBreakdown, getDueDate, getDaysUntilDue } from "@/lib/types";
import { fetchExchangeRates, convertAmount, formatCurrency } from "@/lib/currency";
import { motion } from "framer-motion";
import { Receipt, FileText, Building2 } from "lucide-react";

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [displayCur, setDisplayCur] = useState<CurrencyCode>('USD');
  const [rates, setRates] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      const [j, e, a, cur, r] = await Promise.all([
        getJobs(), getExpenses(), getAgencies(), getDisplayCurrency(),
        fetchExchangeRates(),
      ]);
      setJobs(j); setExpenses(e); setAgencies(a); setDisplayCur(cur);
      setRates(r.rates);
    };
    load();
  }, []);

  const handleCurrencyChange = (c: CurrencyCode) => {
    setDisplayCur(c);
    setDisplayCurrency(c);
  };

  const conv = (amount: number, from: CurrencyCode) => convertAmount(amount, from, displayCur, rates);
  const fmt = (n: number) => formatCurrency(n, displayCur);

  const getAgencyName = (id?: string) => agencies.find(a => a.id === id)?.name;

  const totalEarnings = jobs.reduce((s, j) => s + conv(j.rate, j.currency), 0);
  const totalAgentFees = jobs.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent).agentFee, j.currency), 0);
  const totalNet = jobs.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent).netPay, j.currency), 0);
  const totalRecommendedTax = jobs.reduce((s, j) => {
    const netAfterAgent = calculateJobBreakdown(j.rate, j.agentPercent).netPay;
    return s + conv(netAfterAgent * (j.taxPercent / 100), j.currency);
  }, 0);
  const totalExpenses = expenses.reduce((s, e) => s + conv(e.amount, e.currency), 0);

  // Current (not yet due) vs Overdue earnings
  const currentEarnings = jobs
    .filter(j => j.status !== 'paid' && getDaysUntilDue(j.jobDate, j.netDays) >= 0)
    .reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).netPay, j.currency), 0);
  const currentCount = jobs.filter(j => j.status !== 'paid' && getDaysUntilDue(j.jobDate, j.netDays) >= 0).length;

  const overdueEarnings = jobs
    .filter(j => j.status !== 'paid' && getDaysUntilDue(j.jobDate, j.netDays) < 0)
    .reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).netPay, j.currency), 0);
  const overdueCount = jobs.filter(j => j.status !== 'paid' && getDaysUntilDue(j.jobDate, j.netDays) < 0).length;

  const [showOverdue, setShowOverdue] = useState(false);

  const pendingJobs = jobs
    .filter(j => j.status !== 'paid')
    .sort((a, b) => getDueDate(a.jobDate, a.netDays).getTime() - getDueDate(b.jobDate, b.netDays).getTime())
    .slice(0, 5);

  // Expense breakdown
  const reimbursableExpenses = expenses.filter(e => e.reimbursable);
  const pendingReimbursement = reimbursableExpenses.filter(e => !e.reimbursed);
  const writeOffExpenses = expenses.filter(e => !e.reimbursable);

  const totalPendingReimbursement = pendingReimbursement.reduce((s, e) => s + conv(e.amount, e.currency), 0);
  const totalWriteOffs = writeOffExpenses.reduce((s, e) => s + conv(e.amount, e.currency), 0) + totalAgentFees;

  // Group pending reimbursements by agency
  const reimbursableByAgency = pendingReimbursement.reduce((acc, e) => {
    const job = jobs.find(j => j.id === e.jobId);
    const agencyName = job?.agencyId ? getAgencyName(job.agencyId) : undefined;
    const clientName = job ? job.client : undefined;
    const key = agencyName || clientName || 'Unlinked';
    if (!acc[key]) acc[key] = { total: 0, count: 0, expenses: [] };
    acc[key].total += conv(e.amount, e.currency);
    acc[key].count += 1;
    acc[key].expenses.push(e);
    return acc;
  }, {} as Record<string, { total: number; count: number; expenses: Expense[] }>);

  // Group write-offs by category (include agent fees)
  const writeOffsByCategory = writeOffExpenses.reduce((acc, e) => {
    const key = e.category;
    acc[key] = (acc[key] || 0) + conv(e.amount, e.currency);
    return acc;
  }, {} as Record<string, number>);
  if (totalAgentFees > 0) {
    writeOffsByCategory['Agency Commissions'] = (writeOffsByCategory['Agency Commissions'] || 0) + totalAgentFees;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1 font-body">Your financial overview at a glance.</p>
        </div>
        <CurrencySelector value={displayCur} onChange={handleCurrencyChange} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5 cursor-pointer select-none"
          onClick={() => setShowOverdue(!showOverdue)}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground font-body">{showOverdue ? 'Overdue' : 'Current Owed'}</p>
            <button className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              {showOverdue ? 'Show Current →' : 'Show Overdue →'}
            </button>
          </div>
          <p className={`text-2xl font-heading font-semibold mt-1 ${showOverdue ? 'text-destructive' : 'text-foreground'}`}>
            {fmt(showOverdue ? overdueEarnings : currentEarnings)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {showOverdue ? `${overdueCount} overdue job${overdueCount !== 1 ? 's' : ''}` : `${currentCount} pending job${currentCount !== 1 ? 's' : ''}`}
          </p>
        </motion.div>
        <StatCard label="Total Earnings" value={fmt(totalNet)} sublabel={`${jobs.length} jobs`} accent />
        <StatCard label="Estimated Tax Planning" value={fmt(totalRecommendedTax)} sublabel="Set aside from net earnings" />
        <StatCard label="Your Net" value={fmt(totalNet - totalRecommendedTax)} sublabel={`After ${fmt(totalExpenses)} expenses`} accent />
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
        <EarningsChart jobs={jobs} displayCur={displayCur} rates={rates} />
      </motion.div>

      {/* Upcoming Payments */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
        <h2 className="font-heading text-lg font-semibold mb-4">Upcoming Payments</h2>
        {pendingJobs.length === 0 ? (
          <p className="text-muted-foreground text-sm">No pending payments. Add a job to get started.</p>
        ) : (
          <div className="space-y-3">
            {pendingJobs.map(job => {
              const { netPay } = calculateJobBreakdown(job.rate, job.agentPercent, job.taxPercent);
              const daysLeft = getDaysUntilDue(job.jobDate, job.netDays);
              const agencyName = getAgencyName(job.agencyId);
              return (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/50">
                  <div>
                    <p className="font-medium text-foreground">{job.client}</p>
                    <p className="text-xs text-muted-foreground">
                      {agencyName && <span className="text-primary">{agencyName} · </span>}
                      Due {format(getDueDate(job.jobDate, job.netDays), 'MMM d, yyyy')} (Net {job.netDays})
                      {daysLeft <= 0 && ' — Follow up with accounting!'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">{fmt(conv(netPay, job.currency))}</span>
                    <DueDateBadge jobDate={job.jobDate} status={job.status} netDays={job.netDays} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Expense Breakdown Section */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <h2 className="font-heading text-lg font-semibold mb-4">Expense Breakdown</h2>

        {/* Summary row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center gap-3 p-3 rounded-md bg-warning/10 border border-warning/20">
            <Receipt className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Pending Reimbursement</p>
              <p className="font-heading font-semibold text-warning">{fmt(totalPendingReimbursement)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-md bg-primary/10 border border-primary/20">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Tax Write-offs</p>
              <p className="font-heading font-semibold text-primary">{fmt(totalWriteOffs)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Reimbursable by Agency */}
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4 text-warning" />
              Reimbursable by Agency / Client
            </h3>
            {Object.keys(reimbursableByAgency).length === 0 ? (
              <p className="text-xs text-muted-foreground p-3 rounded-md bg-secondary/30">No pending reimbursements.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(reimbursableByAgency)
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
            )}
          </div>

          {/* Tax Write-offs by Category */}
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-primary" />
              Tax Write-offs by Category
            </h3>
            {Object.keys(writeOffsByCategory).length === 0 ? (
              <p className="text-xs text-muted-foreground p-3 rounded-md bg-secondary/30">No write-off expenses yet.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(writeOffsByCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amount]) => (
                    <div key={cat} className="flex items-center justify-between p-3 rounded-md bg-secondary/30">
                      <p className="text-sm font-medium text-foreground capitalize">{cat}</p>
                      <span className="font-heading font-semibold text-primary">{fmt(amount)}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

    </div>
  );
}
