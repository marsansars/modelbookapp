import { useState, useEffect, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { WelcomeDialog } from "@/components/WelcomeDialog";
import { getDisplayName, setDisplayName } from "@/lib/store";
import Index from "./pages/Index";
import Jobs from "./pages/Jobs";
import Expenses from "./pages/Expenses";
import Bookkeeping from "./pages/Bookkeeping";
import Agencies from "./pages/Agencies";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import { LogOut, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const queryClient = new QueryClient();

function possessiveName(name: string): string {
  return name.endsWith("s") || name.endsWith("S")
    ? `${name}'`
    : `${name}'s`;
}

function ProtectedLayout() {
  const { user, loading, signOut } = useAuth();
  const [displayName, setDisplayNameState] = useState<string | null>(null);
  const [nameLoaded, setNameLoaded] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    if (user) {
      getDisplayName().then((name) => {
        setDisplayNameState(name);
        setNameLoaded(true);
        if (!name) setShowWelcome(true);
      });
    }
  }, [user]);

  const handleSaveName = useCallback(async (name: string) => {
    await setDisplayName(name);
    setDisplayNameState(name);
    setShowWelcome(false);
  }, []);

  const handleEditSubmit = useCallback(async () => {
    if (editValue.trim()) {
      await setDisplayName(editValue.trim());
      setDisplayNameState(editValue.trim());
    }
    setIsEditingName(false);
  }, [editValue]);

  if (loading || (user && !nameLoaded)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const headerTitle = displayName
    ? `${possessiveName(displayName)} ModelBook`
    : "ModelBook";

  return (
    <SidebarProvider>
      <WelcomeDialog open={showWelcome} onSave={handleSaveName} />
      <div className="min-h-screen flex w-full">
        <AppSidebar displayName={displayName} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              {isEditingName ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); handleEditSubmit(); }}
                  className="flex items-center gap-2 ml-3"
                >
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-7 w-32 text-sm"
                    autoFocus
                    onBlur={handleEditSubmit}
                  />
                </form>
              ) : (
                <button
                  onClick={() => { setEditValue(displayName || ""); setIsEditingName(true); }}
                  className="ml-3 flex items-center gap-1.5 text-sm text-muted-foreground font-body hover:text-foreground transition-colors group"
                >
                  <span>{headerTitle}</span>
                  <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign out" className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/agencies" element={<Agencies />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/bookkeeping" element={<Bookkeeping />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
