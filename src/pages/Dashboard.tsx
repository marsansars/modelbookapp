import { useEffect, useState } from "react";
import { format } from "date-fns";
import { StatCard } from "@/components/StatCard";
import { DueDateBadge } from "@/components/DueDateBadge";
import { getJobs, getExpenses } from "@/lib/store";
import { Job, Expense, calculateJobBreakdown, getDueDate, getDaysUntilDue } from "@/lib/types";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    setJobs(getJobs());
    setExpenses(getExpenses());
  }, []);

  const totalEarnings = jobs.reduce((s, j) => s + j.rate, 0);
  const totalAgent = jobs.reduce((s, j) => s + calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).agentFee, 0);
  const totalTax = jobs.reduce((s, j) => s + calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).taxAmount, 0);
  const totalNet = jobs.reduce((s, j) => s + calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).netPay, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const pendingJobs = jobs
    .filter(j => j.status !== 'paid')
    .sort((a, b) => getDueDate(a.jobDate).getTime() - getDueDate(b.jobDate).getTime())
    .slice(0, 5);

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1 font-body">Your financial overview at a glance.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Earnings" value={fmt(totalEarnings)} sublabel={`${jobs.length} jobs`} accent />
        <StatCard label="Agent Fees" value={fmt(totalAgent)} sublabel="Total commissions" />
        <StatCard label="Tax Reserve" value={fmt(totalTax)} sublabel="Set aside for taxes" />
        <StatCard label="Your Net" value={fmt(totalNet)} sublabel={`After ${fmt(totalExpenses)} expenses`} accent />
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
                const daysLeft = getDaysUntilDue(job.jobDate);
                return (
                  <div key={job.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/50">
                    <div>
                      <p className="font-medium text-foreground">{job.client}</p>
                      <p className="text-xs text-muted-foreground">
                        Due {format(getDueDate(job.jobDate), 'MMM d, yyyy')}
                        {daysLeft <= 0 && ' — Follow up with accounting!'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground">{fmt(netPay)}</span>
                      <DueDateBadge jobDate={job.jobDate} status={job.status} />
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
                  <span className="text-sm font-medium text-destructive">-{fmt(exp.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
