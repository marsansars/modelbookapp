import { useEffect, useState } from "react";
import { getJobs, getExpenses, getDisplayCurrency, setDisplayCurrency, getAllExpenseCategories } from "@/lib/store";
import { Job, Expense, CurrencyCode, calculateJobBreakdown, ExpenseCategoryInfo, parseLocalDate } from "@/lib/types";
import { fetchExchangeRates, convertAmount, formatCurrency } from "@/lib/currency";
import { exportJobsCSV, exportExpensesCSV, exportSummaryCSV } from "@/lib/csv-export";
import { exportJobsXLSX, exportExpensesXLSX, exportSummaryXLSX } from "@/lib/xlsx-export";
import { StatCard } from "@/components/StatCard";
import { TaxDisclaimerInfo } from "@/components/TaxDisclaimerInfo";
import { CurrencySelector } from "@/components/CurrencySelector";
import { QuarterlyTaxPayments } from "@/components/QuarterlyTaxPayments";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";

export default function Bookkeeping() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [displayCur, setDisplayCur] = useState<CurrencyCode>('USD');
  const [rates, setRates] = useState<Record<string, number>>({});
  const [cats, setCats] = useState<Record<string, ExpenseCategoryInfo>>({});
  const [taxPaidThisYear, setTaxPaidThisYear] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

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

  // Scroll to quarterly taxes section if hash is present
  useEffect(() => {
    if (location.hash === '#quarterly-taxes') {
      setTimeout(() => {
        document.getElementById('quarterly-taxes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [location.hash]);

  const conv = (amount: number, from: CurrencyCode) => convertAmount(amount, from, displayCur, rates);
  const fmt = (n: number) => formatCurrency(n, displayCur);

  const totalGross = jobs.reduce((s, j) => s + conv(j.rate, j.currency), 0);
  const totalAgent = jobs.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent).agentFee, j.currency), 0);
  const totalNet = jobs.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent).netPay, j.currency), 0);
  const totalRecommendedTax = jobs.reduce((s, j) => {
    const netAfterAgent = calculateJobBreakdown(j.rate, j.agentPercent).netPay;
    return s + conv(netAfterAgent * (j.taxPercent / 100), j.currency);
  }, 0);
  const currentYear = new Date().getFullYear();
  const recommendedTaxThisYear = jobs.reduce((s, j) => {
    const y = parseLocalDate(j.jobDate).getFullYear();
    if (y !== currentYear) return s;
    const netAfterAgent = calculateJobBreakdown(j.rate, j.agentPercent).netPay;
    return s + conv(netAfterAgent * (j.taxPercent / 100), j.currency);
  }, 0);
  const remainingTaxPlanning = Math.max(0, totalRecommendedTax - taxPaidThisYear);
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" /> Summary <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportSummaryCSV(jobs, expenses, displayCur, rates)}>
                  <FileText className="h-4 w-4 mr-2" /> CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportSummaryXLSX(jobs, expenses, displayCur, rates)}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (.xlsx)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" /> Jobs <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportJobsCSV(jobs, displayCur, rates)}>
                  <FileText className="h-4 w-4 mr-2" /> CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportJobsXLSX(jobs, displayCur, rates)}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (.xlsx)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" /> Expenses <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportExpensesCSV(expenses, jobs, displayCur, rates)}>
                  <FileText className="h-4 w-4 mr-2" /> CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportExpensesXLSX(expenses, jobs, displayCur, rates)}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (.xlsx)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Gross Earnings" value={fmt(totalGross)} />
        <StatCard label="Agent Commissions" value={fmt(totalAgent)} />
        <StatCard
          label="Estimated Tax Planning"
          value={fmt(remainingTaxPlanning)}
          sublabel={taxPaidThisYear > 0 ? `${fmt(taxPaidThisYear)} paid this year` : `${fmt(totalRecommendedTax)} recommended`}
        />
        <StatCard label="Net Expenses" value={fmt(netExpenses)} sublabel={reimbursedTotal > 0 ? `${fmt(reimbursedTotal)} reimbursed` : undefined} />
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
              <span className="text-muted-foreground">− Estimated Tax Planning</span>
              <span className="font-medium">-{fmt(remainingTaxPlanning)}</span>
            </div>
            {taxPaidThisYear > 0 && (
              <div className="flex justify-between py-2 border-b border-border text-xs">
                <span className="text-muted-foreground pl-3">↳ Already paid this year</span>
                <span className="text-success">{fmt(taxPaidThisYear)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">− Out-of-Pocket Expenses</span>
              <span className="font-medium">-{fmt(outOfPocketExpenses)}</span>
            </div>
            {pendingReimbursement > 0 && (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">− Pending Reimbursement</span>
                <span className="font-medium text-warning">-{fmt(pendingReimbursement)}</span>
              </div>
            )}
            {reimbursedTotal > 0 && (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Reimbursed (wash)</span>
                <span className="font-medium text-success">{fmt(reimbursedTotal)}</span>
              </div>
            )}
            <div className="flex justify-between py-2">
              <span className="font-heading font-semibold text-foreground">Net After Everything</span>
              <span className="font-heading font-semibold text-primary">{fmt(totalNet - remainingTaxPlanning - netExpenses)}</span>
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

      <QuarterlyTaxPayments
        recommendedTaxThisYear={recommendedTaxThisYear}
        displayCur={displayCur}
        rates={rates}
        onChange={setTaxPaidThisYear}
      />
    </div>
  );
}
