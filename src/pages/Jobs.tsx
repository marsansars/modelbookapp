import { useEffect, useState } from "react";
import { format } from "date-fns";
import { getJobs, updateJob, deleteJob, getAgencies, getDisplayCurrency, setDisplayCurrency } from "@/lib/store";
import { Job, Agency, CurrencyCode, CURRENCIES, calculateJobBreakdown, getDueDate } from "@/lib/types";
import { fetchExchangeRates, convertAmount, formatCurrency } from "@/lib/currency";
import { AddJobDialog } from "@/components/AddJobDialog";
import { ManageAgenciesDialog } from "@/components/ManageAgenciesDialog";
import { CurrencySelector } from "@/components/CurrencySelector";
import { DueDateBadge } from "@/components/DueDateBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [displayCur, setDisplayCur] = useState<CurrencyCode>(getDisplayCurrency());
  const [rates, setRates] = useState<Record<string, number>>({});

  const reload = () => {
    setJobs(getJobs());
    setAgencies(getAgencies());
  };
  useEffect(() => {
    reload();
    fetchExchangeRates().then(r => setRates(r.rates));
  }, []);

  const conv = (amount: number, from: CurrencyCode) => convertAmount(amount, from, displayCur, rates);
  const fmt = (n: number) => formatCurrency(n, displayCur);
  const fmtOrig = (n: number, cur: CurrencyCode) => formatCurrency(n, cur);
  const getAgencyName = (id?: string) => agencies.find(a => a.id === id)?.name;

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
            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-heading font-semibold text-lg text-foreground truncate">{job.client}</h3>
                      <DueDateBadge jobDate={job.jobDate} status={job.status} netDays={job.netDays} />
                    </div>
                    <p className="text-sm text-muted-foreground">{job.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {agencyName && <span className="text-primary">{agencyName} · </span>}
                      Job: {format(new Date(job.jobDate), 'MMM d, yyyy')} · Due: {format(getDueDate(job.jobDate, job.netDays), 'MMM d, yyyy')} (Net {job.netDays})
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Rate ({CURRENCIES[job.currency].symbol})</p>
                      <p className="font-medium text-foreground">{fmtOrig(job.rate, job.currency)}</p>
                      {showConverted && <p className="text-xs text-muted-foreground">≈ {fmt(conv(job.rate, job.currency))}</p>}
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Agent ({job.agentPercent}%)</p>
                      <p className="font-medium text-foreground">-{fmtOrig(agentFee, job.currency)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Tax ({job.taxPercent}%)</p>
                      <p className="font-medium text-foreground">-{fmtOrig(taxAmount, job.currency)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Your Net</p>
                      <p className="font-heading font-semibold text-primary">{fmtOrig(netPay, job.currency)}</p>
                      {showConverted && <p className="text-xs text-muted-foreground">≈ {fmt(conv(netPay, job.currency))}</p>}
                    </div>

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

                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => { deleteJob(job.id); reload(); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
