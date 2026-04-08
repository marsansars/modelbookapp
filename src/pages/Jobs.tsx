import { useEffect, useState } from "react";
import { format } from "date-fns";
import { getJobs, updateJob, deleteJob } from "@/lib/store";
import { Job, calculateJobBreakdown, getDueDate } from "@/lib/types";
import { AddJobDialog } from "@/components/AddJobDialog";
import { DueDateBadge } from "@/components/DueDateBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const reload = () => setJobs(getJobs());
  useEffect(reload, []);

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold">Jobs & Bookings</h1>
          <p className="text-muted-foreground mt-1">Track every job, see what you're owed.</p>
        </div>
        <AddJobDialog onAdded={reload} />
      </div>

      {jobs.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">No jobs yet. Add your first booking to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.sort((a, b) => new Date(b.jobDate).getTime() - new Date(a.jobDate).getTime()).map((job, i) => {
            const { agentFee, taxAmount, netPay } = calculateJobBreakdown(job.rate, job.agentPercent, job.taxPercent);
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
                      <DueDateBadge jobDate={job.jobDate} status={job.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">{job.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Job: {format(new Date(job.jobDate), 'MMM d, yyyy')} · Due: {format(getDueDate(job.jobDate), 'MMM d, yyyy')}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Rate</p>
                      <p className="font-medium text-foreground">{fmt(job.rate)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Agent ({job.agentPercent}%)</p>
                      <p className="font-medium text-foreground">-{fmt(agentFee)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Tax ({job.taxPercent}%)</p>
                      <p className="font-medium text-foreground">-{fmt(taxAmount)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Your Net</p>
                      <p className="font-heading font-semibold text-primary">{fmt(netPay)}</p>
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
