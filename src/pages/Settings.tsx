import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import {
  AlertTriangle,
  Loader2,
  Mail,
  KeyRound,
  MessageSquare,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { FeedbackForm } from "@/components/FeedbackForm";

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <h2 className="font-heading text-lg font-semibold leading-tight">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground font-body mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Account deletion
  const [confirmText, setConfirmText] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmText.trim().toUpperCase() === "DELETE";
  const passwordsMatch =
    newPassword.length >= 8 && newPassword === confirmPassword;

  const handlePasswordUpdate = async () => {
    if (!passwordsMatch) {
      toast.error("Passwords must match and be at least 8 characters");
      return;
    }
    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update password");
    } finally {
      setUpdatingPassword(false);
    }
  };

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
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold text-gradient-gold mb-1">
          Settings
        </h1>
        <p className="text-muted-foreground font-body">
          Manage your account and share feedback.
        </p>
      </div>

      {/* Account */}
      <Card className="p-6">
        <SectionHeader icon={Mail} title="Account" subtitle="Signed in as" />
        <div className="rounded-md bg-secondary/40 border border-border px-4 py-3 text-sm font-body">
          {user?.email ?? "—"}
        </div>
      </Card>

      {/* Password */}
      <Card className="p-6">
        <SectionHeader
          icon={KeyRound}
          title="Change password"
          subtitle="Use at least 8 characters."
        />
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-sm">New password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-sm">Confirm new password</Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-destructive">
                {newPassword.length < 8
                  ? "Password must be at least 8 characters."
                  : "Passwords don't match."}
              </p>
            )}
          </div>

          <Button
            onClick={handlePasswordUpdate}
            disabled={!passwordsMatch || updatingPassword}
          >
            {updatingPassword ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating…
              </>
            ) : (
              "Update password"
            )}
          </Button>
        </div>
      </Card>

      {/* Feedback */}
      <Card className="p-6">
        <SectionHeader
          icon={MessageSquare}
          title="Send feedback"
          subtitle="Bug, idea, or question — it all helps."
        />
        <FeedbackForm />
      </Card>

      {/* Danger zone */}
      <Card className="p-6 border-destructive/40">
        <SectionHeader
          icon={AlertTriangle}
          title="Danger zone"
          subtitle="Permanently delete your account and all data. This cannot be undone."
        />

        <Separator className="my-4 bg-destructive/20" />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirm-delete" className="text-sm">
              Type <span className="font-mono font-semibold">DELETE</span> to enable
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
        </div>
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
