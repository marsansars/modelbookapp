import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TaxDisclaimerInfoProps {
  className?: string;
  /** Stop click propagation so it doesn't trigger parent onClick (e.g., StatCard navigate). */
  stopPropagation?: boolean;
}

export function TaxDisclaimerInfo({ className, stopPropagation }: TaxDisclaimerInfoProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Tax disclaimer"
          onClick={(e) => { if (stopPropagation) e.stopPropagation(); }}
          className={`inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground/70 hover:text-primary transition-colors ${className ?? ''}`}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="w-72 text-xs space-y-2"
        onClick={(e) => { if (stopPropagation) e.stopPropagation(); }}
      >
        <p className="font-heading font-semibold text-sm text-foreground">Disclaimer</p>
        <p className="text-muted-foreground">
          ModelBook provides general estimates for tracking and planning only. It does
          not provide tax, legal, or financial advice.
        </p>
        <p className="text-muted-foreground">
          Tax obligations vary by individual circumstances — please consult a qualified
          tax professional for guidance specific to your situation.
        </p>
      </PopoverContent>
    </Popover>
  );
}
