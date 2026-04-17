import { useState } from 'react';
import html2canvas from 'html2canvas';
import { Loader2, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';

const feedbackSchema = z.object({
  message: z.string().trim().min(3, 'Please share a bit more').max(2000, 'Too long (max 2000 characters)'),
  severity: z.enum(['bug', 'idea', 'question', 'other']),
});

type Severity = 'bug' | 'idea' | 'question' | 'other';

interface FeedbackFormProps {
  /** Called before capturing screenshot — host can hide its container (e.g. dialog). */
  onBeforeCapture?: () => Promise<void> | void;
  /** Called after capture finishes (success or fail) — restore container visibility. */
  onAfterCapture?: () => void;
  /** Called after successful submit. */
  onSubmitted?: () => void;
}

export function FeedbackForm({ onBeforeCapture, onAfterCapture, onSubmitted }: FeedbackFormProps) {
  const { user } = useAuth();
  const [severity, setSeverity] = useState<Severity>('idea');
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const captureScreenshot = async () => {
    setCapturing(true);
    try {
      if (onBeforeCapture) await onBeforeCapture();
      await new Promise(r => setTimeout(r, 250));
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        scale: 0.6,
        backgroundColor: null,
        logging: false,
      });
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Empty blob')), 'image/jpeg', 0.7);
      });
      setScreenshot(blob);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
      toast.success('Screenshot attached');
    } catch {
      toast.error('Could not capture screenshot');
    } finally {
      setCapturing(false);
      onAfterCapture?.();
    }
  };

  const removeScreenshot = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setScreenshot(null);
    setPreviewUrl(null);
  };

  const submit = async () => {
    const parsed = feedbackSchema.safeParse({ message, severity });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!user) {
      toast.error('You must be signed in');
      return;
    }
    setSubmitting(true);
    try {
      let screenshotPath: string | null = null;
      if (screenshot) {
        const path = `${user.id}/${crypto.randomUUID()}.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from('feedback-screenshots')
          .upload(path, screenshot, { contentType: 'image/jpeg' });
        if (uploadErr) throw uploadErr;
        screenshotPath = path;
      }

      const { error } = await supabase.from('feedback').insert({
        user_id: user.id,
        page_url: window.location.pathname,
        severity: parsed.data.severity,
        message: parsed.data.message,
        screenshot_path: screenshotPath,
        user_agent: navigator.userAgent.slice(0, 500),
      });
      if (error) throw error;

      toast.success('Thanks for the feedback!');
      setMessage('');
      setSeverity('idea');
      removeScreenshot();
      onSubmitted?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Could not send feedback: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm">Type</Label>
        <RadioGroup value={severity} onValueChange={(v) => setSeverity(v as Severity)} className="grid grid-cols-2 gap-2 mt-2">
          {([
            ['bug', '🐞 Bug'],
            ['idea', '💡 Idea'],
            ['question', '❓ Question'],
            ['other', '✏️ Other'],
          ] as const).map(([val, label]) => (
            <label key={val} className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 px-3 py-2 cursor-pointer hover:bg-secondary/60">
              <RadioGroupItem value={val} id={`fb-${val}`} />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label htmlFor="fb-message" className="text-sm">Message</Label>
        <Textarea
          id="fb-message"
          rows={5}
          maxLength={2000}
          placeholder="Describe what happened or what you'd like to see…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-2"
        />
        <p className="text-xs text-muted-foreground mt-1">{message.length}/2000</p>
      </div>

      <div>
        <Label className="text-sm">Screenshot (optional)</Label>
        {previewUrl ? (
          <div className="relative mt-2 rounded-md overflow-hidden border border-border">
            <img src={previewUrl} alt="Screenshot preview" className="w-full max-h-40 object-cover" />
            <button
              type="button"
              onClick={removeScreenshot}
              className="absolute top-1 right-1 bg-destructive/80 text-destructive-foreground rounded-full p-1 hover:bg-destructive"
              aria-label="Remove screenshot"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 gap-2 w-full"
            onClick={captureScreenshot}
            disabled={capturing}
          >
            {capturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            Capture this page
          </Button>
        )}
      </div>

      <Button onClick={submit} disabled={submitting} className="w-full">
        {submitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</>) : 'Send feedback'}
      </Button>
    </div>
  );
}
