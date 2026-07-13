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
import { openMailtoDraft, isEmailPreviewBlocked } from "@/lib/email";
import { toast } from "@/hooks/use-toast";

interface FollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overdueJobs: Job[];
  agencies: Agency[];
}

const UNASSIGNED_KEY = "__unassigned__";

export function FollowUpDialog({ open, onOpenChange, overdueJobs, agencies }: FollowUpDialogProps) {
  const [selectedGroupKey, setSelectedGroupKey] = useState<string>("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [yourName, setYourName] = useState("");
  const [copied, setCopied] = useState<"subject" | "body" | "all" | null>(null);

  // Group overdue jobs by agencyId (or "unassigned")
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; agency?: Agency; jobs: Job[] }>();
    for (const j of overdueJobs) {
      const key = j.agencyId || UNASSIGNED_KEY;
      if (!map.has(key)) {
        const agency = j.agencyId ? agencies.find(a => a.id === j.agencyId) : undefined;
        map.set(key, {
          key,
          label: agency?.name || "No agency",
          agency,
          jobs: [],
        });
      }
      map.get(key)!.jobs.push(j);
    }
    return Array.from(map.values()).sort((a, b) => b.jobs.length - a.jobs.length);
  }, [overdueJobs, agencies]);

  useEffect(() => {
    if (open) {
      getDisplayName().then(name => { if (name) setYourName(name); });
      if (groups.length > 0 && !groups.find(g => g.key === selectedGroupKey)) {
        setSelectedGroupKey(groups[0].key);
      }
    }
  }, [open, groups]);

  const selectedGroup = useMemo(
    () => groups.find(g => g.key === selectedGroupKey) || groups[0],
    [selectedGroupKey, groups]
  );

  // Auto-fill recipient from agency name when group changes
  useEffect(() => {
    if (selectedGroup?.agency?.name) {
      setRecipientName(selectedGroup.agency.name);
    } else if (selectedGroup && !selectedGroup.agency) {
      setRecipientName("");
    }
  }, [selectedGroup?.key]);

  const jobCount = selectedGroup?.jobs.length || 0;
  const subject = jobCount > 1 ? "Quick Payment Check-In – Multiple Jobs" : "Quick Payment Check-In";

  const body = useMemo(() => {
    if (!selectedGroup) return "";
    const sortedJobs = [...selectedGroup.jobs].sort((a, b) => a.jobDate.localeCompare(b.jobDate));
    const lines = sortedJobs.map(j => {
      const jobDate = format(parseLocalDate(j.jobDate), "MMM d, yyyy");
      const desc = j.description ? ` – ${j.description}` : "";
      return `• ${j.client}${desc} – ${jobDate}`;
    }).join("\n");

    const intro = sortedJobs.length > 1
      ? `Hope you're doing well! I just wanted to check in on the status of payment for the below jobs:`
      : `Hope you're doing well! I just wanted to check in on the status of payment for the below job:`;

    return `Hi ${recipientName || "[Name]"},

${intro}

${lines}

Please let me know if there are any updates or if anything is needed from my end.

Thank you so much!

Best,
${yourName || "[Your Name]"}`;
  }, [selectedGroup, recipientName, yourName]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Follow Up on Payment</DialogTitle>
          <DialogDescription>
            One check-in email per agency, covering all their overdue jobs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No overdue jobs to follow up on.</p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Agency</Label>
                <Select value={selectedGroupKey} onValueChange={setSelectedGroupKey}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map(g => (
                      <SelectItem key={g.key} value={g.key}>
                        {g.label} — {g.jobs.length} overdue job{g.jobs.length !== 1 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedGroup && selectedGroup.jobs.length > 1 && (
                  <p className="text-[11px] text-muted-foreground">
                    All {selectedGroup.jobs.length} overdue jobs for this agency will be listed in one email.
                  </p>
                )}
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
                <Textarea value={body} readOnly rows={Math.min(16, 8 + jobCount)} className="bg-secondary/40 font-body text-sm leading-relaxed" />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button onClick={() => copy(`Subject: ${subject}\n\n${body}`, "all")} variant="outline" className="flex-1">
                  {copied === "all" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  Copy All
                </Button>
                <Button
                  onClick={() => {
                    const result = openMailtoDraft({ to: recipientEmail, subject, body });
                    if (result === "blocked_in_preview") {
                      toast({
                        title: "Email apps are blocked in preview",
                        description: "We copied the draft to your clipboard. Open the published app to launch your mail client directly.",
                      });
                    } else if (result === "clipboard_fallback") {
                      toast({ title: "Couldn't open mail app", description: "Draft copied to your clipboard." });
                    } else if (result === "failed") {
                      toast({ title: "Couldn't open mail app", description: "Try Copy All and paste it into a new email.", variant: "destructive" });
                    }
                  }}
                  className="flex-1"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Open in Email
                </Button>
              </div>
              {isEmailPreviewBlocked() && (
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Heads up: mail apps can't open from the Lovable preview. Use Copy All here, or open your published app to launch your mail client directly.
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
