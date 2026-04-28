import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Copy, Check, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Job, Agency, parseLocalDate, getDaysUntilDue } from "@/lib/types";
import { getDisplayName } from "@/lib/store";
import { buildMailtoUrl } from "@/lib/email";
import { toast } from "@/hooks/use-toast";

interface FollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overdueJobs: Job[];
  agencies: Agency[];
}

export function FollowUpDialog({ open, onOpenChange, overdueJobs, agencies }: FollowUpDialogProps) {
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [yourName, setYourName] = useState("");
  const [copied, setCopied] = useState<"subject" | "body" | "all" | null>(null);

  useEffect(() => {
    if (open) {
      getDisplayName().then(name => { if (name) setYourName(name); });
      if (overdueJobs.length > 0 && !selectedJobId) {
        setSelectedJobId(overdueJobs[0].id);
      }
    }
  }, [open, overdueJobs]);

  const selectedJob = useMemo(
    () => overdueJobs.find(j => j.id === selectedJobId) || overdueJobs[0],
    [selectedJobId, overdueJobs]
  );

  const agencyName = useMemo(() => {
    if (!selectedJob?.agencyId) return "";
    return agencies.find(a => a.id === selectedJob.agencyId)?.name || "";
  }, [selectedJob, agencies]);

  // Auto-fill recipient from agency name when job changes
  useEffect(() => {
    if (agencyName && !recipientName) setRecipientName(agencyName);
  }, [agencyName]);

  const subject = "Quick Payment Check-In";

  const body = useMemo(() => {
    if (!selectedJob) return "";
    const jobDate = format(parseLocalDate(selectedJob.jobDate), "MMM d, yyyy");
    const jobLine = `${selectedJob.client}${selectedJob.description ? ` – ${selectedJob.description}` : ""} – ${jobDate}`;
    const daysOverdue = Math.abs(getDaysUntilDue(selectedJob.jobDate, selectedJob.netDays));

    return `Hi ${recipientName || "[Name]"},

Hope you're doing well! I just wanted to check in on the status of payment for the below job:

${jobLine}${daysOverdue > 0 ? ` (${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} past due)` : ""}

Please let me know if there are any updates or if anything is needed from my end.

Thank you so much!

Best,
${yourName || "[Your Name]"}`;
  }, [selectedJob, recipientName, yourName]);

  const copy = async (text: string, key: "subject" | "body" | "all") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const mailtoHref = buildMailtoUrl({ to: recipientEmail, subject, body });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Follow Up on Payment</DialogTitle>
          <DialogDescription>
            Generate a friendly check-in email to send to your agent or accounting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {overdueJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No overdue jobs to follow up on.</p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Job</Label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {overdueJobs.map(j => {
                      const days = Math.abs(getDaysUntilDue(j.jobDate, j.netDays));
                      return (
                        <SelectItem key={j.id} value={j.id}>
                          {j.client} — {format(parseLocalDate(j.jobDate), "MMM d")} ({days}d overdue)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient name</Label>
                  <Input
                    id="recipient"
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                    placeholder="e.g. Sarah"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yourname">Your name</Label>
                  <Input
                    id="yourname"
                    value={yourName}
                    onChange={e => setYourName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient-email">Recipient email</Label>
                <Input
                  id="recipient-email"
                  type="email"
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                  placeholder="accounting@agency.com"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Subject</Label>
                  <Button size="sm" variant="ghost" onClick={() => copy(subject, "subject")} className="h-7 text-xs">
                    {copied === "subject" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    Copy
                  </Button>
                </div>
                <Input value={subject} readOnly className="bg-secondary/40" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Email body</Label>
                  <Button size="sm" variant="ghost" onClick={() => copy(body, "body")} className="h-7 text-xs">
                    {copied === "body" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    Copy
                  </Button>
                </div>
                <Textarea value={body} readOnly rows={11} className="bg-secondary/40 font-body text-sm leading-relaxed" />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button onClick={() => copy(`Subject: ${subject}\n\n${body}`, "all")} variant="outline" className="flex-1">
                  {copied === "all" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  Copy All
                </Button>
                <Button asChild className="flex-1">
                  <a href={mailtoHref} target="_top" rel="noopener noreferrer">
                    <Mail className="h-4 w-4 mr-2" />
                    Open in Email
                  </a>
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
