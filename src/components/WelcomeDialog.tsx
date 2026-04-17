import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface WelcomeDialogProps {
  open: boolean;
  onSave: (name: string) => void;
}

export function WelcomeDialog({ open, onSave }: WelcomeDialogProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-heading text-gradient-gold text-xl">
            Welcome to ModelBook!
          </DialogTitle>
          <DialogDescription className="font-body">
            What's your first name? We'll personalize the app just for you.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <Label htmlFor="welcome-name" className="font-body">First Name</Label>
            <Input
              id="welcome-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bex"
              className="mt-2"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!name.trim()}>
              Let's Go!
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
