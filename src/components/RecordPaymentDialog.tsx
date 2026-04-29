import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Sparkles, CalendarCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateJob } from "@/lib/store";
import { Job, Agency, CurrencyCode, calculateJobBreakdown, getDaysUntilDue } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selected job. If omitted, user picks from `unpaidJobs`. */
  jobId?: string;
  unpaidJobs: Job[];
  agencies: Agency[];
  onRecorded?: () => void | Promise<void>;
}

function fireConfetti() {
  const gold = ["#d4a84b", "#e6c373", "#f5e1a4", "#b8862e"];
  const end = Date.now() + 800;
  const burst = () => {
    confetti({
      particleCount: 60,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.7 },
      colors: gold,
      scalar: 1.1,
    });
    confetti({
      particleCount: 60,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.7 },
      colors: gold,
      scalar: 1.1,
    });
    if (Date.now() < end) requestAnimationFrame(burst);
  };
  burst();
  // Centered finale
  setTimeout(() => {
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { y: 0.5 },
      colors: gold,
      startVelocity: 35,
      scalar: 1.3,
    });
  }, 250);
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  jobId,
  unpaidJobs,
  agencies,
  onRecorded,
}: RecordPaymentDialogProps) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [submitting, setSubmitting] = useState(false);
  const [celebrate, setCelebrate] = useState<{ amount: number; currency: CurrencyCode; client: string } | null>(null);

  // Sort unpaid jobs: overdue first, then by closest due date.
  const sortedJobs = useMemo(() => {
    return [...unpaidJobs].sort((a, b) => {
      const aDays = getDaysUntilDue(a.jobDate, a.netDays);
      const bDays = getDaysUntilDue(b.jobDate, b.netDays);
      return aDays - bDays;
    });
  }, [unpaidJobs]);

  useEffect(() => {
    if (open) {
      setSelectedId(jobId ?? sortedJobs[0]?.id ?? "");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setCelebrate(null);
    }
  }, [open, jobId, sortedJobs]);

  const selectedJob = sortedJobs.find((j) => j.id === selectedId) ?? unpaidJobs.find((j) => j.id === selectedId);
  const breakdown = selectedJob ? calculateJobBreakdown(selectedJob.rate, selectedJob.agentPercent) : null;
  const agencyName = selectedJob?.agencyId ? agencies.find((a) => a.id === selectedJob.agencyId)?.name : undefined;

  const handleConfirm = async () => {
    if (!selectedJob || !date) return;
    setSubmitting(true);
    try {
      await updateJob(selectedJob.id, { status: "paid", paidDate: date });
      // Show celebration overlay
      setCelebrate({
        amount: breakdown?.netPay ?? 0,
        currency: selectedJob.currency,
        client: selectedJob.client,
      });
      fireConfetti();
      toast.success("Cha-ching! Payment recorded 💸", {
        description: `${formatCurrency(breakdown?.netPay ?? 0, selectedJob.currency)} from ${selectedJob.client}`,
      });
      // Refresh parent data immediately so amounts update behind the overlay
      await onRecorded?.();
      // Auto-close after celebration
      setTimeout(() => {
        setCelebrate(null);
        onOpenChange(false);
      }, 1900);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && !celebrate && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <AnimatePresence mode="wait">
          {celebrate ? (
            <motion.div
              key="celebrate"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
              className="py-8 text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.05 }}
                className="mx-auto h-20 w-20 rounded-full flex items-center justify-center mb-4"
                style={{
                  background: "linear-gradient(135deg, hsl(42 78% 55%), hsl(42 78% 40%))",
                  boxShadow: "0 0 60px hsl(42 78% 55% / 0.6)",
                }}
              >
                <CheckCircle2 className="h-10 w-10 text-primary-foreground" strokeWidth={2.5} />
              </motion.div>
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="text-xs uppercase tracking-widest text-primary/80 font-body font-medium"
              >
                Payment Received
              </motion.p>
              <motion.p
                initial={{ y: 10, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="text-4xl font-heading font-semibold text-gradient-gold mt-2"
              >
                {formatCurrency(celebrate.amount, celebrate.currency)}
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-muted-foreground mt-2 font-body"
              >
                from <span className="text-foreground font-medium">{celebrate.client}</span>
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-center gap-1.5 mt-4 text-xs text-primary/70"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Moved from Owed to Earned</span>
                <Sparkles className="h-3.5 w-3.5" />
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DialogHeader>
                <DialogTitle className="font-heading flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-primary" />
                  Record Payment
                </DialogTitle>
                <DialogDescription className="font-body">
                  Mark a job as paid and capture the date money hit your account.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {!jobId && (
                  <div>
                    <Label htmlFor="payment-job">Job</Label>
                    {sortedJobs.length === 0 ? (
                      <p className="text-sm text-muted-foreground mt-2 p-3 rounded-md bg-secondary/50">
                        No outstanding jobs to mark as paid.
                      </p>
                    ) : (
                      <Select value={selectedId} onValueChange={setSelectedId}>
                        <SelectTrigger id="payment-job" className="mt-1.5">
                          <SelectValue placeholder="Choose a job…" />
                        </SelectTrigger>
                        <SelectContent>
                          {sortedJobs.map((j) => {
                            const days = getDaysUntilDue(j.jobDate, j.netDays);
                            const overdue = days < 0;
                            const agency = j.agencyId ? agencies.find((a) => a.id === j.agencyId)?.name : undefined;
                            return (
                              <SelectItem key={j.id} value={j.id}>
                                <span className="flex items-center gap-2">
                                  <span className="font-medium">{j.client}</span>
                                  {agency && <span className="text-muted-foreground text-xs">· {agency}</span>}
                                  {overdue && (
                                    <span className="text-destructive text-xs font-medium">
                                      · {Math.abs(days)}d overdue
                                    </span>
                                  )}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {selectedJob && breakdown && (
                  <div
                    className="rounded-lg p-4 border border-primary/30"
                    style={{
                      background: "linear-gradient(135deg, hsl(42 78% 55% / 0.10), hsl(42 78% 55% / 0.02))",
                    }}
                  >
                    <p className="text-xs uppercase tracking-widest text-primary/80 font-body font-medium">
                      You're about to receive
                    </p>
                    <p className="text-3xl font-heading font-semibold text-gradient-gold mt-1">
                      {formatCurrency(breakdown.netPay, selectedJob.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {agencyName && <span className="text-primary">{agencyName} · </span>}
                      Net after {selectedJob.agentPercent}% agent fee
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="payment-date">Payment Date</Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Any invoice linked to this job will also be marked as paid.
                  </p>
                </div>

                <Button
                  className="w-full h-11 text-base font-medium gold-glow"
                  onClick={handleConfirm}
                  disabled={!selectedJob || !date || submitting}
                >
                  {submitting ? "Recording…" : "I Got Paid 💸"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
