import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type Status = 'loading' | 'valid' | 'already' | 'invalid' | 'success' | 'error';

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<Status>('loading');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }
    const validate = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_KEY } }
        );
        const data = await res.json();
        if (!res.ok) {
          setStatus('invalid');
        } else if (data.valid === false && data.reason === 'already_unsubscribed') {
          setStatus('already');
        } else if (data.valid === true) {
          setStatus('valid');
        } else {
          setStatus('invalid');
        }
      } catch {
        setStatus('error');
      }
    };
    void validate();
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
          body: JSON.stringify({ token }),
        }
      );
      const data = await res.json();
      if (data.success) setStatus('success');
      else if (data.reason === 'already_unsubscribed') setStatus('already');
      else setStatus('error');
    } catch {
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="glass-card max-w-md w-full p-8 space-y-5 text-center">
        <h1 className="font-heading text-3xl font-semibold text-primary">ModelBook</h1>

        {status === 'loading' && (
          <p className="text-muted-foreground">Checking your unsubscribe link…</p>
        )}

        {status === 'valid' && (
          <>
            <h2 className="font-heading text-xl">Unsubscribe from product updates</h2>
            <p className="text-sm text-muted-foreground">
              You'll stop receiving product update emails from ModelBook.
              Important account emails (password resets, etc.) will still be sent.
            </p>
            <Button onClick={handleConfirm} disabled={submitting} className="w-full">
              {submitting ? 'Unsubscribing…' : 'Confirm unsubscribe'}
            </Button>
          </>
        )}

        {status === 'already' && (
          <>
            <h2 className="font-heading text-xl">Already unsubscribed</h2>
            <p className="text-sm text-muted-foreground">
              This email address is already unsubscribed.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <h2 className="font-heading text-xl">You're unsubscribed</h2>
            <p className="text-sm text-muted-foreground">
              You won't receive product update emails from ModelBook anymore.
            </p>
          </>
        )}

        {status === 'invalid' && (
          <>
            <h2 className="font-heading text-xl">Invalid link</h2>
            <p className="text-sm text-muted-foreground">
              This unsubscribe link is invalid or has expired.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <h2 className="font-heading text-xl">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              Please try again in a moment.
            </p>
          </>
        )}

        <Link to="/" className="block text-xs text-muted-foreground underline">
          Back to ModelBook
        </Link>
      </Card>
    </div>
  );
}
