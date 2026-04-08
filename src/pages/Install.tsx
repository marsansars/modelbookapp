import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6 p-6">
      <Smartphone className="h-16 w-16 text-primary" />
      <h1 className="text-3xl font-heading font-semibold text-foreground">Install ModelBook</h1>
      <p className="text-muted-foreground max-w-md">
        Add ModelBook to your home screen for quick access. It works offline and feels just like a native app.
      </p>

      {installed ? (
        <div className="flex items-center gap-2 text-primary">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">ModelBook is installed!</span>
        </div>
      ) : deferredPrompt ? (
        <Button size="lg" onClick={handleInstall} className="gap-2">
          <Download className="h-5 w-5" />
          Install App
        </Button>
      ) : isIOS ? (
        <div className="glass-card p-6 max-w-sm space-y-3">
          <p className="font-medium text-foreground">To install on iPhone / iPad:</p>
          <ol className="text-sm text-muted-foreground text-left space-y-2">
            <li>1. Tap the <strong>Share</strong> button in Safari</li>
            <li>2. Scroll down and tap <strong>Add to Home Screen</strong></li>
            <li>3. Tap <strong>Add</strong></li>
          </ol>
        </div>
      ) : (
        <div className="glass-card p-6 max-w-sm space-y-3">
          <p className="font-medium text-foreground">To install:</p>
          <ol className="text-sm text-muted-foreground text-left space-y-2">
            <li>1. Open this page in <strong>Chrome</strong> or <strong>Edge</strong></li>
            <li>2. Tap the browser menu (⋮)</li>
            <li>3. Select <strong>Install app</strong> or <strong>Add to Home Screen</strong></li>
          </ol>
        </div>
      )}
    </div>
  );
}
