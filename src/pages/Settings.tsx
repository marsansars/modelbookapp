import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmText.trim().toUpperCase() === "DELETE";

  const handleDelete = async () => {
    if (!canDelete || !user) return;
    setDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Not signed in");

      const { error } = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (error) throw error;

      toast.success("Your account has been deleted");
      await signOut();
      navigate("/auth", { replace: true });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to delete account");
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold text-gradient-gold mb-2">
          Settings
        </h1>
        <p className="text-muted-foreground font-body">
          Manage your account preferences.
        </p>
      </div>

      <Card className="p-6 space-y-3">
        <h2 className="font-heading text-lg font-semibold">Your account</h2>
        <div className="text-sm text-muted-foreground font-body space-y-1">
          <p>
            <span className="text-foreground">Email:</span> {user?.email ?? "—"}
          </p>
          <p>
            <span className="text-foreground">User ID:</span>{" "}
            <span className="font-mono text-xs">{user?.id}</span>
          </p>
        </div>
      </Card>

      <Card className="p-6 border-destructive/40 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="font-heading text-lg font-semibold text-destructive">
              Danger zone
            </h2>
            <p className="text-sm text-muted-foreground font-body">
              Permanently delete your account and all associated data — jobs,
              expenses, invoices, agencies, attachments, and settings. This
              action cannot be undone.
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Label htmlFor="confirm-delete" className="text-sm">
            Type <span className="font-mono font-semibold">DELETE</span> to
            confirm
          </Label>
          <Input
            id="confirm-delete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="max-w-xs"
            autoComplete="off"
          />
        </div>

        <Button
          variant="destructive"
          disabled={!canDelete || deleting}
          onClick={() => setConfirmOpen(true)}
        >
          Delete my account
        </Button>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will erase all of your jobs, expenses, invoices, agencies,
              attachments, and settings. There is no way to recover this data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Yes, delete forever"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
