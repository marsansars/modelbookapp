import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Download, Mail, Trash2, Settings, Building2, Pencil } from "lucide-react";
import { getInvoices, deleteInvoice, getSenderInfo, updateInvoice } from "@/lib/store";
import { Invoice, SenderInfo, parseLocalDate, CURRENCIES, calculateJobBreakdown } from "@/lib/types";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import { NewInvoiceDialog } from "@/components/NewInvoiceDialog";
import { EditInvoiceDialog } from "@/components/EditInvoiceDialog";
import { SenderInfoDialog } from "@/components/SenderInfoDialog";
import { toast } from "sonner";

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [sender, setSender] = useState<SenderInfo>({});
  const [newOpen, setNewOpen] = useState(false);
  const [senderOpen, setSenderOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const [i, s] = await Promise.all([getInvoices(), getSenderInfo()]);
    setInvoices(i);
    setSender(s);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const handleDownload = (inv: Invoice) => {
    if (!sender.legalName) {
      toast.warning("Add your billing info first so it appears on the invoice.");
      setSenderOpen(true);
      return;
    }
    downloadInvoicePdf(inv, sender);
  };

  const handleEmail = (inv: Invoice) => {
    if (!inv.billToEmail) {
      toast.error("No email saved on this invoice. Edit and add one.");
      return;
    }
    const subject = `Invoice ${inv.number} from ${sender.legalName || 'me'}`;
    const body = `Hi,\n\nPlease find invoice ${inv.number} for ${inv.snapshot.client} attached.\n\nTotal due by ${parseLocalDate(inv.dueDate).toLocaleDateString()}.\n\nThank you!\n${sender.legalName || ''}`;
    window.location.href = `mailto:${inv.billToEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    handleDownload(inv);
  };

  const handleDelete = async (inv: Invoice) => {
    if (!confirm(`Delete invoice ${inv.number}?`)) return;
    await deleteInvoice(inv.id);
    toast.success("Invoice deleted");
    reload();
  };

  const cycleStatus = async (inv: Invoice) => {
    const next = inv.status === 'draft' ? 'sent' : inv.status === 'sent' ? 'paid' : 'draft';
    await updateInvoice(inv.id, { status: next });
    reload();
  };

  const totals = (inv: Invoice) => {
    const sub = inv.snapshot.lineItems.length > 0
      ? inv.snapshot.lineItems.reduce((s, li) => s + (li.amount || 0), 0)
      : inv.snapshot.rate;
    const expensesTotal = (inv.snapshot.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
    const { netPay } = calculateJobBreakdown(sub, inv.snapshot.agentPercent);
    return { sub, total: (inv.type === 'detailed' ? netPay : sub) + expensesTotal };
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold text-gradient-gold flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" /> Invoices
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-body">
            Generate professional PDF invoices for any job.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setSenderOpen(true)}>
            <Settings className="h-4 w-4" /> Billing Info
          </Button>
          <Button className="gap-2" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" /> New Invoice
          </Button>
        </div>
      </div>

      {!sender.legalName && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Building2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 text-sm">
              <p className="text-foreground font-medium">Set up your billing info first</p>
              <p className="text-muted-foreground mt-0.5">Your name, address, and payment instructions appear on every invoice. Saved once, used forever.</p>
            </div>
            <Button size="sm" onClick={() => setSenderOpen(true)}>Set up</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-heading text-lg text-foreground">No invoices yet</p>
            <p className="text-sm text-muted-foreground mt-1">Generate your first invoice from any job.</p>
            <Button className="mt-4 gap-2" onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" /> New Invoice
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => {
            const { total } = totals(inv);
            const symbol = CURRENCIES[inv.snapshot.currency]?.symbol || '';
            return (
              <Card key={inv.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-heading text-lg text-foreground">{inv.number}</span>
                        <Badge
                          variant="outline"
                          onClick={() => cycleStatus(inv)}
                          className={`cursor-pointer capitalize ${
                            inv.status === 'paid' ? 'border-success/40 text-success bg-success/10' :
                            inv.status === 'sent' ? 'border-primary/40 text-primary bg-primary/10' :
                            'border-muted-foreground/30 text-muted-foreground'
                          }`}
                        >
                          {inv.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">{inv.type}</Badge>
                      </div>
                      <p className="text-sm text-foreground mt-1 truncate">
                        {inv.billToName} · {inv.snapshot.client}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Issued {parseLocalDate(inv.issueDate).toLocaleDateString()} · Due {parseLocalDate(inv.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-heading text-xl text-primary">
                        {symbol}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/50 flex-wrap">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleDownload(inv)}>
                      <Download className="h-3.5 w-3.5" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleEmail(inv)} disabled={!inv.billToEmail}>
                      <Mail className="h-3.5 w-3.5" /> Email
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1.5 ml-auto text-muted-foreground hover:text-destructive" onClick={() => handleDelete(inv)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <NewInvoiceDialog open={newOpen} onOpenChange={setNewOpen} onCreated={() => reload()} />
      <SenderInfoDialog open={senderOpen} onOpenChange={setSenderOpen} onSaved={(s) => setSender(s)} />
    </div>
  );
}
