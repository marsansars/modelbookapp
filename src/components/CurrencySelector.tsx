import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyCode, CURRENCIES } from "@/lib/types";
import { Globe } from "lucide-react";

interface Props {
  value: CurrencyCode;
  onChange: (v: CurrencyCode) => void;
}

export function CurrencySelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={v => onChange(v as CurrencyCode)}>
        <SelectTrigger className="w-32 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(CURRENCIES).map(([code, { label, symbol }]) => (
            <SelectItem key={code} value={code}>{symbol} {code}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
