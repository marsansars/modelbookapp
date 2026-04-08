import { useEffect, useState } from "react";
import { format } from "date-fns";
import { getAgencies, getJobs, getDisplayCurrency, updateAgency } from "@/lib/store";
import { Agency, Job, CurrencyCode, CURRENCIES, calculateJobBreakdown, getDueDate, parseLocalDate, DEFAULT_NET_DAYS } from "@/lib/types";
import { fetchExchangeRates, convertAmount, formatCurrency } from "@/lib/currency";
import { ManageAgenciesDialog } from "@/components/ManageAgenciesDialog";
import { CurrencySelector } from "@/components/CurrencySelector";
import { setDisplayCurrency } from "@/lib/store";
import { DueDateBadge } from "@/components/DueDateBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Building2, Pencil, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Agencies() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [displayCur, setDisplayCur] = useState<CurrencyCode>("USD");
  const [rates, setRates] = useState<Record<string, number>>({});
  const [expandedAgency, setExpandedAgency] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', defaultAgentPercent: '', defaultCurrency: 'USD' as CurrencyCode, defaultNetDays: '' });

  const reload = async () => {
    const [a, j] = await Promise.all([getAgencies(), getJobs()]);
    setAgencies(a);
    setJobs(j);
  };

  useEffect(() => {
    const load = async () => {
      const [a, j, cur, r] = await Promise.all([
        getAgencies(),
        getJobs(),
        getDisplayCurrency(),
        fetchExchangeRates(),
      ]);
      setAgencies(a);
      setJobs(j);
      setDisplayCur(cur);
      setRates(r.rates);
    };
    load();
  }, []);

  const conv = (amount: number, from: CurrencyCode) =>
    convertAmount(amount, from, displayCur, rates);
  const fmt = (n: number) => formatCurrency(n, displayCur);
  const fmtOrig = (n: number, cur: CurrencyCode) => formatCurrency(n, cur);

  const getAgencyJobs = (agencyId: string) =>
    jobs.filter((j) => j.agencyId === agencyId);

  const getAgencyOwedBreakdown = (agencyId: string) => {
    const agencyJobs = getAgencyJobs(agencyId);
    const unpaidJobs = agencyJobs.filter((j) => j.status !== "paid");
    const paidJobs = agencyJobs.filter((j) => j.status === "paid");

    const totalOwed = unpaidJobs.reduce((sum, j) => {
      const { netPay } = calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent);
      return sum + conv(netPay, j.currency);
    }, 0);

    const totalEarned = paidJobs.reduce((sum, j) => {
      const { netPay } = calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent);
      return sum + conv(netPay, j.currency);
    }, 0);

    const totalGross = agencyJobs.reduce(
      (sum, j) => sum + conv(j.rate, j.currency),
      0
    );

    return { totalOwed, totalEarned, totalGross, unpaidJobs, paidJobs, allJobs: agencyJobs };
  };

  // Jobs not linked to any agency
  const unlinkedJobs = jobs.filter((j) => !j.agencyId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-heading font-semibold">Agencies</h1>
          <p className="text-muted-foreground mt-1">
            Manage your agencies and see what each one owes you.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CurrencySelector
            value={displayCur}
            onChange={(c) => {
              setDisplayCur(c);
              setDisplayCurrency(c);
            }}
          />
          <ManageAgenciesDialog onChanged={reload} />
        </div>
      </div>

      {agencies.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">
            No agencies yet. Add your first agency to start tracking.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {agencies.map((agency, i) => {
            const breakdown = getAgencyOwedBreakdown(agency.id);
            const isExpanded = expandedAgency === agency.id;

            return (
              <motion.div
                key={agency.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5 space-y-4"
              >
                {/* Agency Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <Building2 className="h-5 w-5 text-primary shrink-0" />
                      <h3 className="font-heading font-semibold text-lg text-foreground truncate">
                        {agency.name}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {breakdown.allJobs.length} job{breakdown.allJobs.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground ml-8">
                      Default: {agency.defaultAgentPercent}% commission ·{" "}
                      {CURRENCIES[agency.defaultCurrency].symbol}{" "}
                      {agency.defaultCurrency} · Net {agency.defaultNetDays}
                    </p>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border/50">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Total Gross</p>
                    <p className="font-medium text-foreground">{fmt(breakdown.totalGross)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Owed to You</p>
                    <p className="font-heading font-semibold text-warning">
                      {fmt(breakdown.totalOwed)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Paid</p>
                    <p className="font-heading font-semibold text-success">
                      {fmt(breakdown.totalEarned)}
                    </p>
                  </div>
                </div>

                {/* Expand Jobs */}
                <button
                  onClick={() => setExpandedAgency(isExpanded ? null : agency.id)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full pt-1"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  <span>
                    View jobs ({breakdown.allJobs.length})
                  </span>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-2 pt-2 border-t border-border/50"
                    >
                      {breakdown.allJobs.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">
                          No jobs linked to this agency yet.
                        </p>
                      ) : (
                        breakdown.allJobs
                          .sort(
                            (a, b) =>
                              parseLocalDate(b.jobDate).getTime() -
                              parseLocalDate(a.jobDate).getTime()
                          )
                          .map((job) => {
                            const { agentFee, netPay } = calculateJobBreakdown(
                              job.rate,
                              job.agentPercent,
                              job.taxPercent
                            );
                            const showConverted = job.currency !== displayCur;

                            return (
                              <div
                                key={job.id}
                                className="flex items-center justify-between p-3 rounded-md bg-secondary/30 text-sm"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-foreground font-medium truncate">
                                      {job.client}
                                    </p>
                                    <DueDateBadge
                                      jobDate={job.jobDate}
                                      status={job.status}
                                      netDays={job.netDays}
                                    />
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {format(parseLocalDate(job.jobDate), "MMM d, yyyy")} ·{" "}
                                    {job.description}
                                  </p>
                                </div>
                                <div className="text-right shrink-0 ml-3">
                                  <p className="font-medium text-foreground">
                                    {fmtOrig(netPay, job.currency)}
                                  </p>
                                  {showConverted && (
                                    <p className="text-xs text-muted-foreground">
                                      ≈ {fmt(conv(netPay, job.currency))}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground">
                                    Agent: -{fmtOrig(agentFee, job.currency)}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Unlinked jobs summary */}
      {unlinkedJobs.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-heading font-medium text-foreground">Direct Bookings</h3>
            <Badge variant="outline" className="text-xs">
              {unlinkedJobs.length} job{unlinkedJobs.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {unlinkedJobs.length} job{unlinkedJobs.length !== 1 ? "s" : ""} not linked to any
            agency — total net:{" "}
            <span className="text-foreground font-medium">
              {fmt(
                unlinkedJobs.reduce((sum, j) => {
                  const { netPay } = calculateJobBreakdown(j.rate, j.agentPercent, j.taxPercent);
                  return sum + conv(netPay, j.currency);
                }, 0)
              )}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
