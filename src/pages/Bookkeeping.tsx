import { useEffect, useState } from "react";
import { getJobs, getExpenses } from "@/lib/store";
import { Job, Expense, calculateJobBreakdown, EXPENSE_CATEGORIES } from "@/lib/types";
import { StatCard } from "@/components/StatCard";
import { motion } from "framer-motion";

export default function Bookkeeping() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    setJobs(getJobs());
    setExpenses(getExpenses());
  }, []);

  const totalGross = jobs.reduce((s, j) => s + j.rate, 0);
  const totalAgent = jobs.reduce((s, j) => s + calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).agentFee, 0);
  const totalTax = jobs.reduce((s, j) => s + calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).taxAmount, 0);
  const totalNet = jobs.reduce((s, j) => s + calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).netPay, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const paidJobs = jobs.filter(j => j.status === 'paid');
  const unpaidJobs = jobs.filter(j => j.status !== 'paid');
  const paidTotal = paidJobs.reduce((s, j) => s + calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).netPay, 0);
  const unpaidTotal = unpaidJobs.reduce((s, j) => s + calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).netPay, 0);

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const expByCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-semibold">Bookkeeping</h1>
        <p className="text-muted-foreground mt-1">Your complete financial picture.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Gross Earnings" value={fmt(totalGross)} />
        <StatCard label="Agent Commissions" value={fmt(totalAgent)} />
        <StatCard label="Tax Reserve" value={fmt(totalTax)} />
        <StatCard label="Total Expenses" value={fmt(totalExpenses)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Income Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Gross Earnings</span>
              <span className="font-medium">{fmt(totalGross)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">− Agent Fees</span>
              <span className="font-medium">-{fmt(totalAgent)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">− Tax Reserve</span>
              <span className="font-medium">-{fmt(totalTax)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">− Expenses</span>
              <span className="font-medium">-{fmt(totalExpenses)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-heading font-semibold text-foreground">Net After Everything</span>
              <span className="font-heading font-semibold text-primary">{fmt(totalNet - totalExpenses)}</span>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Payment Status</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-md bg-success/10">
              <div>
                <p className="font-medium text-success">Received</p>
                <p className="text-xs text-muted-foreground">{paidJobs.length} jobs paid</p>
              </div>
              <span className="font-heading font-semibold text-success">{fmt(paidTotal)}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-md bg-warning/10">
              <div>
                <p className="font-medium text-warning">Outstanding</p>
                <p className="text-xs text-muted-foreground">{unpaidJobs.length} jobs pending</p>
              </div>
              <span className="font-heading font-semibold text-warning">{fmt(unpaidTotal)}</span>
            </div>
          </div>

          {Object.keys(expByCategory).length > 0 && (
            <>
              <h3 className="font-heading text-sm font-semibold mt-6 mb-3 text-muted-foreground">Expenses by Category</h3>
              <div className="space-y-2">
                {Object.entries(expByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                  <div key={cat} className="flex justify-between items-center text-sm">
                    <span>{EXPENSE_CATEGORIES[cat as keyof typeof EXPENSE_CATEGORIES]?.icon} {EXPENSE_CATEGORIES[cat as keyof typeof EXPENSE_CATEGORIES]?.label}</span>
                    <span className="font-medium">{fmt(amt)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
