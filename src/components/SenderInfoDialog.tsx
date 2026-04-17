import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getSenderInfo, setSenderInfo } from "@/lib/store";
import { SenderInfo } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: (info: SenderInfo) => void;
}

export function SenderInfoDialog({ open, onOpenChange, onSaved }: Props) {
  const [info, setInfo] = useState<SenderInfo>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) getSenderInfo().then(setInfo);
  }, [open]);

  const save = async () => {
    setSaving(true);
    try {
      await setSenderInfo(info);
      toast.success("Billing info saved");
      onSaved?.(info);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const set = (k: keyof SenderInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setInfo(s => ({ ...s, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Your Billing Info</DialogTitle>
          <DialogDescription>This appears in the &quot;From&quot; block of every invoice you generate.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Legal Name</Label>
            <Input value={info.legalName || ''} onChange={set('legalName')} placeholder="e.g. Jane Doe / Doe Studio LLC" />
          </div>
          <div>
            <Label>Address</Label>
            <Textarea value={info.address || ''} onChange={set('address')} placeholder="Street, City, State, ZIP, Country" className="min-h-[60px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={info.email || ''} onChange={set('email')} placeholder="you@email.com" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={info.phone || ''} onChange={set('phone')} placeholder="+1 555 123 4567" />
            </div>
          </div>
          <div>
            <Label>Tax ID / VAT (optional)</Label>
            <Input value={info.taxId || ''} onChange={set('taxId')} placeholder="EIN, VAT, ABN, etc." />
          </div>
          <div>
            <Label>Payment Instructions</Label>
            <Textarea value={info.paymentInstructions || ''} onChange={set('paymentInstructions')} placeholder="Bank transfer details, PayPal, Wise, etc." className="min-h-[80px]" />
          </div>
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? 'Saving…' : 'Save Billing Info'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
