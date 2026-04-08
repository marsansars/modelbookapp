import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import Jobs from "./pages/Jobs";
import Expenses from "./pages/Expenses";
import Bookkeeping from "./pages/Bookkeeping";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <header className="h-14 flex items-center border-b border-border px-4">
                <SidebarTrigger />
                <span className="ml-3 text-sm text-muted-foreground font-body">ModelBook</span>
              </header>
              <main className="flex-1 p-6 overflow-auto">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/jobs" element={<Jobs />} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/bookkeeping" element={<Bookkeeping />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
