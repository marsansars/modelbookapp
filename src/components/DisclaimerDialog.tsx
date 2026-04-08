import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DisclaimerDialogProps {
  open: boolean;
  onAgree: () => void;
  onDisagree: () => void;
}

export function DisclaimerDialog({ open, onAgree, onDisagree }: DisclaimerDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading text-lg">Disclaimer</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                ModelBook provides general estimates and informational tools for tracking income and planning purposes only.
              </p>
              <p>
                It does not provide tax, legal, or financial advice.
              </p>
              <p>
                Tax obligations vary based on individual circumstances. Users should consult a qualified tax professional or advisor for guidance specific to their situation.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onDisagree}>
            Disagree
          </Button>
          <Button onClick={onAgree}>
            Agree
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
