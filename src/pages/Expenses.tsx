import { useEffect, useState } from "react";
import { format } from "date-fns";
import { getExpenses, getJobs, deleteExpense, updateExpense, getDisplayCurrency, setDisplayCurrency } from "@/lib/store";
import { Expense, Job, EXPENSE_CATEGORIES, CurrencyCode } from "@/lib/types";
import { fetchExchangeRates, convertAmount, formatCurrency } from "@/lib/currency";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { CurrencySelector } from "@/components/CurrencySelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [displayCur, setDisplayCur] = useState<CurrencyCode>(getDisplayCurrency());
  const [rates, setRates] = useState<Record<string, number>>({});

  const reload = () => {
    setExpenses(getExpenses());
    setJobs(getJobs());
  };
  useEffect(() => {
    reload();
    fetchExchangeRates().then(r => setRates(r.rates));
  }, []);

  const conv = (amount: number, from: CurrencyCode) => convertAmount(amount, from, displayCur, rates);
  const fmt = (n: number) => formatCurrency(n, displayCur);
  const total = expenses.reduce((s, e) => s + conv(e.amount, e.currency), 0);
  const getJobName = (id?: string) => {
    const j = jobs.find(j => j.id === id);
    return j ? `${j.client} — ${j.description}` : undefined;
  };

  const toggleReimbursed = (id: string, current: boolean) => {
    updateExpense(id, { reimbursed: !current });
    reload();
  };

  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + conv(e.amount, e.currency);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-heading font-semibold">Expenses</h1>
          <p className="text-muted-foreground mt-1">Track every dollar you spend on the job.</p>
        </div>
        <div className="flex items-center gap-2">
          <CurrencySelector value={displayCur} onChange={c => { setDisplayCur(c); setDisplayCurrency(c); }} />
          <AddExpenseDialog onAdded={reload} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(byCategory).map(([cat, amt]) => (
          <div key={cat} className="glass-card p-4 text-center">
            <p className="text-2xl">{EXPENSE_CATEGORIES[cat as keyof typeof EXPENSE_CATEGORIES]?.icon}</p>
            <p className="text-xs text-muted-foreground mt-1">{EXPENSE_CATEGORIES[cat as keyof typeof EXPENSE_CATEGORIES]?.label}</p>
            <p className="font-heading font-semibold text-foreground mt-1">{fmt(amt)}</p>
          </div>
        ))}
        {expenses.length > 0 && (
          <div className="glass-card p-4 text-center gold-glow">
            <p className="text-2xl">💰</p>
            <p className="text-xs text-muted-foreground mt-1">Total Expenses</p>
            <p className="font-heading font-semibold text-primary mt-1">{fmt(total)}</p>
          </div>
        )}
      </div>

      {expenses.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">No expenses tracked yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((exp, i) => {
            const showConverted = exp.currency !== displayCur;
            const jobName = getJobName(exp.jobId);
            return (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-card p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{EXPENSE_CATEGORIES[exp.category]?.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{exp.description || EXPENSE_CATEGORIES[exp.category]?.label}</p>
                      {exp.reimbursable && (
                        <Badge className={exp.reimbursed
                          ? "bg-success/20 text-success border-success/30 text-[10px] px-1.5 py-0"
                          : "bg-warning/20 text-warning border-warning/30 text-[10px] px-1.5 py-0"
                        }>
                          {exp.reimbursed ? 'Reimbursed' : 'Reimbursable'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(exp.date), 'MMM d, yyyy')}
                      {jobName && <span> · <span className="text-primary">{jobName}</span></span>}
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
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => { deleteExpense(exp.id); reload(); }}>
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
