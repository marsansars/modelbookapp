import { useEffect, useState } from "react";
import { format } from "date-fns";
import { StatCard } from "@/components/StatCard";
import { DueDateBadge } from "@/components/DueDateBadge";
import { CurrencySelector } from "@/components/CurrencySelector";
import { EarningsChart } from "@/components/EarningsChart";
import { PaymentStatusChart } from "@/components/PaymentStatusChart";
import { getJobs, getExpenses, getDisplayCurrency, setDisplayCurrency, getAgencies } from "@/lib/store";
import { Job, Expense, Agency, CurrencyCode, calculateJobBreakdown, getDueDate, getDaysUntilDue } from "@/lib/types";
import { fetchExchangeRates, convertAmount, formatCurrency } from "@/lib/currency";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [displayCur, setDisplayCur] = useState<CurrencyCode>(getDisplayCurrency());
  const [rates, setRates] = useState<Record<string, number>>({});

  useEffect(() => {
    setJobs(getJobs());
    setExpenses(getExpenses());
    setAgencies(getAgencies());
    fetchExchangeRates().then(r => setRates(r.rates));
  }, []);

  const handleCurrencyChange = (c: CurrencyCode) => {
    setDisplayCur(c);
    setDisplayCurrency(c);
  };

  const conv = (amount: number, from: CurrencyCode) => convertAmount(amount, from, displayCur, rates);
  const fmt = (n: number) => formatCurrency(n, displayCur);

  const getAgencyName = (id?: string) => agencies.find(a => a.id === id)?.name;

  const totalEarnings = jobs.reduce((s, j) => s + conv(j.rate, j.currency), 0);
  const totalAgent = jobs.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).agentFee, j.currency), 0);
  const totalTax = jobs.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).taxAmount, j.currency), 0);
  const totalNet = jobs.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).netPay, j.currency), 0);
  const totalExpenses = expenses.reduce((s, e) => s + conv(e.amount, e.currency), 0);

  const pendingJobs = jobs
    .filter(j => j.status !== 'paid')
    .sort((a, b) => getDueDate(a.jobDate, a.netDays).getTime() - getDueDate(b.jobDate, b.netDays).getTime())
    .slice(0, 5);

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
        <StatCard label="Total Earnings" value={fmt(totalEarnings)} sublabel={`${jobs.length} jobs`} accent />
        <StatCard label="Agent Fees" value={fmt(totalAgent)} sublabel="Total commissions" />
        <StatCard label="Tax Reserve" value={fmt(totalTax)} sublabel="Set aside for taxes" />
        <StatCard label="Your Net" value={fmt(totalNet)} sublabel={`After ${fmt(totalExpenses)} expenses`} accent />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
          <EarningsChart jobs={jobs} displayCur={displayCur} rates={rates} />
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="glass-card p-6">
          <PaymentStatusChart jobs={jobs} displayCur={displayCur} rates={rates} />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Recent Expenses</h2>
          {expenses.length === 0 ? (
            <p className="text-muted-foreground text-sm">No expenses yet. Track your spending to stay organized.</p>
          ) : (
            <div className="space-y-3">
              {expenses.slice(-5).reverse().map(exp => (
                <div key={exp.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/50">
                  <div>
                    <p className="font-medium text-foreground">{exp.description || exp.category}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(exp.date), 'MMM d, yyyy')}</p>
                  </div>
                  <span className="text-sm font-medium text-destructive">-{fmt(conv(exp.amount, exp.currency))}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
