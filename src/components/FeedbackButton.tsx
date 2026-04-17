import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FeedbackForm } from './FeedbackForm';

export function FeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-tour="feedback-button"
        className="fixed bottom-4 right-4 z-40 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
        title="Send feedback"
        aria-label="Send feedback"
      >
        <MessageSquarePlus className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Send feedback</DialogTitle>
            <DialogDescription>
              Found a bug, have an idea, or stuck somewhere? Let me know.
            </DialogDescription>
          </DialogHeader>
          <FeedbackForm
            onBeforeCapture={() => setOpen(false)}
            onAfterCapture={() => setOpen(true)}
            onSubmitted={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
