import { useEffect, useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subYears } from "date-fns";
import { StatCard } from "@/components/StatCard";
import { DueDateBadge } from "@/components/DueDateBadge";
import { CurrencySelector } from "@/components/CurrencySelector";
import { EarningsChart } from "@/components/EarningsChart";
import { PaymentsReceivedChart } from "@/components/PaymentsReceivedChart";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";

import { getJobs, getExpenses, getDisplayCurrency, setDisplayCurrency, getAgencies } from "@/lib/store";
import { Job, Expense, Agency, CurrencyCode, calculateJobBreakdown, getDueDate, getDaysUntilDue, parseLocalDate } from "@/lib/types";
import { fetchExchangeRates, convertAmount, formatCurrency } from "@/lib/currency";
import { motion } from "framer-motion";
import { Receipt, FileText, Building2, Send, CalendarCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddJobDialog } from "@/components/AddJobDialog";
import { FollowUpDialog } from "@/components/FollowUpDialog";
import { RecordPaymentDialog } from "@/components/RecordPaymentDialog";
import { Button } from "@/components/ui/button";

type TimePeriod = 'month' | 'year' | 'last-year';

function getPeriodRange(period: TimePeriod): { start: Date; end: Date } {
  const now = new Date();
  switch (period) {
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now) };
    case 'last-year': {
      const lastYear = subYears(now, 1);
      return { start: startOfYear(lastYear), end: endOfYear(lastYear) };
    }
  }
}

const PERIOD_LABELS: Record<TimePeriod, string> = {
  month: 'This Month',
  year: 'This Year',
  'last-year': 'Last Year',
};

export default function Dashboard() {
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [displayCur, setDisplayCur] = useState<CurrencyCode>('USD');
  const [rates, setRates] = useState<Record<string, number>>({});
  const [period, setPeriod] = useState<TimePeriod>('year');
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [chartApi, setChartApi] = useState<CarouselApi | null>(null);
  const [chartIndex, setChartIndex] = useState(0);

  useEffect(() => {
    if (!chartApi) return;
    setChartIndex(chartApi.selectedScrollSnap());
    chartApi.on("select", () => setChartIndex(chartApi.selectedScrollSnap()));
  }, [chartApi]);

  const load = async () => {
    const [j, e, a, cur, r] = await Promise.all([
      getJobs(), getExpenses(), getAgencies(), getDisplayCurrency(),
      fetchExchangeRates(),
    ]);
    setAllJobs(j); setAllExpenses(e); setAgencies(a); setDisplayCur(cur);
    setRates(r.rates);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCurrencyChange = (c: CurrencyCode) => {
    setDisplayCur(c);
    setDisplayCurrency(c);
  };

  const { start, end } = useMemo(() => getPeriodRange(period), [period]);

  const jobs = useMemo(() => allJobs.filter(j => {
    const d = parseLocalDate(j.jobDate);
    return d >= start && d <= end;
  }), [allJobs, start, end]);

  const expenses = useMemo(() => allExpenses.filter(e => {
    const d = parseLocalDate(e.date);
    return d >= start && d <= end;
  }), [allExpenses, start, end]);

  const conv = (amount: number, from: CurrencyCode) => convertAmount(amount, from, displayCur, rates);
  const fmt = (n: number) => formatCurrency(n, displayCur);

  const getAgencyName = (id?: string) => agencies.find(a => a.id === id)?.name;

  const totalAgentFees = jobs.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent).agentFee, j.currency), 0);
  const totalNet = jobs.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent).netPay, j.currency), 0);
  const totalRecommendedTax = jobs.reduce((s, j) => {
    const netAfterAgent = calculateJobBreakdown(j.rate, j.agentPercent).netPay;
    return s + conv(netAfterAgent * (j.taxPercent / 100), j.currency);
  }, 0);
  const totalExpenses = expenses.reduce((s, e) => s + conv(e.amount, e.currency), 0);

  const paidJobs = allJobs.filter(j => {
    if (j.status !== 'paid' || !j.paidDate) return false;
    const d = parseLocalDate(j.paidDate);
    return d >= start && d <= end;
  });
  const paidJobsCount = paidJobs.length;
  const paymentsReceived = paidJobs.reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent).netPay, j.currency), 0);

  // Current (not yet due) vs Overdue earnings
  const currentEarnings = jobs
    .filter(j => j.status !== 'paid' && getDaysUntilDue(j.jobDate, j.netDays) >= 0)
    .reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).netPay, j.currency), 0);
  const currentCount = jobs.filter(j => j.status !== 'paid' && getDaysUntilDue(j.jobDate, j.netDays) >= 0).length;

  const overdueJobs = jobs.filter(j => j.status !== 'paid' && getDaysUntilDue(j.jobDate, j.netDays) < 0);
  const overdueEarnings = overdueJobs
    .reduce((s, j) => s + conv(calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent).netPay, j.currency), 0);
  const overdueCount = overdueJobs.length;

  

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
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-heading font-semibold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1 font-body">Your financial overview at a glance.</p>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIOD_LABELS) as TimePeriod[]).map((key) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {PERIOD_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div data-tour="dash-currency"><CurrencySelector value={displayCur} onChange={handleCurrencyChange} /></div>
          <Button
            variant="outline"
            onClick={() => setRecordPaymentOpen(true)}
            disabled={allJobs.filter(j => j.status !== 'paid').length === 0}
            className="gap-1.5 border-primary/40 hover:border-primary hover:bg-primary/5"
          >
            <CalendarCheck className="h-4 w-4 text-primary" />
            Record Payment
          </Button>
          <AddJobDialog onAdded={load} />
        </div>
      </div>

      {/* Hero: Current Owed + Overdue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-xl p-6 border border-primary/30"
          style={{
            background: 'linear-gradient(135deg, hsl(42 78% 55% / 0.18), hsl(42 78% 55% / 0.04))',
            boxShadow: '0 0 40px -10px hsl(42 78% 55% / 0.25)',
          }}
        >
          <div className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-30" style={{ background: 'hsl(42 78% 55%)' }} />
          <div className="relative">
            <p className="text-xs uppercase tracking-widest text-primary/80 font-body font-medium">Current Owed</p>
            <p className="font-heading font-semibold text-gradient-gold mt-2 leading-tight pb-1 whitespace-nowrap" style={{ fontSize: 'clamp(1.75rem, 6vw, 3rem)' }}>{fmt(currentEarnings)}</p>
            <p className="text-sm text-muted-foreground mt-3">{currentCount} pending job{currentCount !== 1 ? 's' : ''} · on track</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-xl p-6 border border-destructive/40"
          style={{
            background: 'linear-gradient(135deg, hsl(0 65% 55% / 0.18), hsl(0 65% 55% / 0.04))',
            boxShadow: '0 0 40px -10px hsl(0 65% 55% / 0.3)',
          }}
        >
          <div className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-30" style={{ background: 'hsl(0 65% 55%)' }} />
          <div className="relative">
            <p className="text-xs uppercase tracking-widest text-destructive font-body font-medium">Overdue</p>
            <p className="font-heading font-semibold text-destructive mt-2 leading-tight pb-1 whitespace-nowrap" style={{ fontSize: 'clamp(1.75rem, 6vw, 3rem)' }}>{fmt(overdueEarnings)}</p>
            <p className="text-sm text-muted-foreground mt-3">{overdueCount} overdue job{overdueCount !== 1 ? 's' : ''}</p>
            {overdueCount > 0 && (
              <Button
                size="sm"
                onClick={() => setFollowUpOpen(true)}
                data-tour="dash-chase"
                className="mt-4 bg-destructive/90 hover:bg-destructive text-destructive-foreground"
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Chase Payment
              </Button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Payments Received" value={fmt(paymentsReceived)} sublabel={`${paidJobsCount} paid job${paidJobsCount !== 1 ? 's' : ''}`} accent />
        <StatCard label="Estimated Tax Planning" value={fmt(totalRecommendedTax)} sublabel="Set aside from net earnings" />
        <StatCard label="Total Earnings" value={fmt(totalNet)} sublabel={`${jobs.length} jobs`} accent />
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
        <Carousel
          setApi={setChartApi}
          opts={{ loop: false, align: "start" }}
          className="relative"
        >
          <CarouselContent>
            <CarouselItem>
              <EarningsChart jobs={jobs} displayCur={displayCur} rates={rates} />
            </CarouselItem>
            <CarouselItem>
              <PaymentsReceivedChart jobs={allJobs} displayCur={displayCur} rates={rates} />
            </CarouselItem>
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex -left-2 h-8 w-8" />
          <CarouselNext className="hidden sm:flex -right-2 h-8 w-8" />
        </Carousel>

        {/* Page indicator */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {["Earnings", "Payments Received"].map((label, i) => (
            <button
              key={label}
              onClick={() => chartApi?.scrollTo(i)}
              aria-label={`Show ${label}`}
              className={`h-1.5 rounded-full transition-all ${
                chartIndex === i
                  ? "w-8 bg-primary"
                  : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
              }`}
            />
          ))}
        </div>
        <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground/60 mt-2 sm:hidden">
          Swipe to switch views
        </p>
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
                <div key={job.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-md bg-secondary/50">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{job.client}</p>
                    <p className="text-xs text-muted-foreground">
                      {agencyName && <span className="text-primary">{agencyName} · </span>}
                      Due {format(getDueDate(job.jobDate, job.netDays), 'MMM d, yyyy')} (Net {job.netDays})
                      {daysLeft <= 0 && ' — Follow up with accounting!'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
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

      <FollowUpDialog
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
        overdueJobs={overdueJobs}
        agencies={agencies}
      />

      <RecordPaymentDialog
        open={recordPaymentOpen}
        onOpenChange={setRecordPaymentOpen}
        unpaidJobs={allJobs.filter(j => j.status !== 'paid')}
        agencies={agencies}
        onRecorded={load}
      />
    </div>
  );
}
