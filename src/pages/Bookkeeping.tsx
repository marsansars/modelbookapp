import { useEffect, useState } from "react";
import { getJobs, getExpenses, getDisplayCurrency, setDisplayCurrency, getAllExpenseCategories } from "@/lib/store";
import { Job, Expense, CurrencyCode, calculateJobBreakdown, ExpenseCategoryInfo } from "@/lib/types";
import { fetchExchangeRates, convertAmount, formatCurrency } from "@/lib/currency";
import { exportJobsCSV, exportExpensesCSV, exportSummaryCSV } from "@/lib/csv-export";
import { StatCard } from "@/components/StatCard";
import { CurrencySelector } from "@/components/CurrencySelector";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { motion } from "framer-motion";

export default function Bookkeeping() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [displayCur, setDisplayCur] = useState<CurrencyCode>('USD');
  const [rates, setRates] = useState<Record<string, number>>({});
  const [cats, setCats] = useState<Record<string, ExpenseCategoryInfo>>({});

  useEffect(() => {
    const load = async () => {
      const [j, e, cur, r, c] = await Promise.all([
        getJobs(), getExpenses(), getDisplayCurrency(),
        fetchExchangeRates(), getAllExpenseCategories(),
      ]);
      setJobs(j); setExpenses(e); setDisplayCur(cur); setRates(r.rates); setCats(c);
    };
    load();
  }, []);

  const conv = (amount: number, from: CurrencyCode) => convertAmount(amount, from, displayCur, rates);
  const fmt = (n: number) => formatCurrency(n, displayCur);

  const totalGross = jobs.reduce((s, j) => s + conv(j.rate, j.currency), 0);
  const totalAgent = jobs.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent).agentFee, j.currency), 0);
  const totalNet = jobs.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent).netPay, j.currency), 0);
  const totalRecommendedTax = jobs.reduce((s, j) => {
    const netAfterAgent = calculateJobBreakdown(j.rate, j.agentPercent).netPay;
    return s + conv(netAfterAgent * (j.taxPercent / 100), j.currency);
  }, 0);
  const reimbursedTotal = expenses.filter(e => e.reimbursable && e.reimbursed).reduce((s, e) => s + conv(e.amount, e.currency), 0);
  const pendingReimbursement = expenses.filter(e => e.reimbursable && !e.reimbursed).reduce((s, e) => s + conv(e.amount, e.currency), 0);
  const outOfPocketExpenses = expenses.filter(e => !e.reimbursable).reduce((s, e) => s + conv(e.amount, e.currency), 0);
  const netExpenses = outOfPocketExpenses + pendingReimbursement;
  const paidJobs = jobs.filter(j => j.status === 'paid');
  const unpaidJobs = jobs.filter(j => j.status !== 'paid');
  const paidTotal = paidJobs.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).netPay, j.currency), 0);
  const unpaidTotal = unpaidJobs.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).netPay, j.currency), 0);

  const expByCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + conv(e.amount, e.currency);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-heading font-semibold">Bookkeeping</h1>
          <p className="text-muted-foreground mt-1">Your complete financial picture.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CurrencySelector value={displayCur} onChange={c => { setDisplayCur(c); setDisplayCurrency(c); }} />
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => exportSummaryCSV(jobs, expenses, displayCur, rates)}>
              <Download className="h-3.5 w-3.5" /> Summary
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => exportJobsCSV(jobs, displayCur, rates)}>
              <Download className="h-3.5 w-3.5" /> Jobs
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => exportExpensesCSV(expenses, jobs, displayCur, rates)}>
              <Download className="h-3.5 w-3.5" /> Expenses
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Gross Earnings" value={fmt(totalGross)} />
        <StatCard label="Agent Commissions" value={fmt(totalAgent)} />
        <StatCard label="Recommended Tax Savings" value={fmt(totalRecommendedTax)} />
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
              <span className="text-muted-foreground">− Recommended Tax Savings</span>
              <span className="font-medium">-{fmt(totalRecommendedTax)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">− Expenses</span>
              <span className="font-medium">-{fmt(totalExpenses)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-heading font-semibold text-foreground">Net After Everything</span>
              <span className="font-heading font-semibold text-primary">{fmt(totalNet - totalRecommendedTax - totalExpenses)}</span>
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
                    <span>{cats[cat]?.icon || '📋'} {cats[cat]?.label || cat}</span>
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
