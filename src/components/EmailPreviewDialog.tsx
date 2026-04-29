import type { CSSProperties } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

type Category = 'new' | 'improved' | 'fixed';

interface ChangelogItem {
  category: Category;
  title: string;
  body?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ChangelogItem[];
  periodLabel?: string;
  intro?: string;
}

const CATEGORY_META: Record<Category, { label: string; emoji: string }> = {
  new: { label: 'New', emoji: '✨' },
  improved: { label: 'Improved', emoji: '🛠' },
  fixed: { label: 'Fixed', emoji: '🐛' },
};

const SITE_NAME = 'ModelBook';

// Mirrors the React Email template's multi-line rendering:
// blank line → new <p>; single newline → <br>
function renderMultiline(text: string, style: CSSProperties) {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((para, i) => {
      const lines = para.split('\n');
      return (
        <p key={i} style={style}>
          {lines.map((line, j) => (
            <span key={j}>
              {line}
              {j < lines.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
      );
    });
}

const textStyle: React.CSSProperties = {
  fontSize: 15, color: '#4a4a4a', lineHeight: 1.6, margin: '0 0 16px',
};
const itemBodyStyle: React.CSSProperties = {
  fontSize: 14, color: '#55575d', lineHeight: 1.6, margin: 0,
};

export function EmailPreviewDialog({ open, onOpenChange, items, periodLabel, intro }: Props) {
  const subject = periodLabel
    ? `What's new in ${SITE_NAME} · ${periodLabel}`
    : `What's new in ${SITE_NAME}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 border-b border-border space-y-2 sticky top-0 bg-background z-10">
          <DialogTitle className="font-heading">Email Preview</DialogTitle>
          <div className="text-xs space-y-1">
            <div className="flex gap-2"><span className="text-muted-foreground w-16 shrink-0">From:</span><span className="truncate">{SITE_NAME} &lt;notify@modelbookapp.lovable.app&gt;</span></div>
            <div className="flex gap-2"><span className="text-muted-foreground w-16 shrink-0">Subject:</span><span className="font-medium">{subject}</span></div>
            <div className="flex gap-2 items-center"><span className="text-muted-foreground w-16 shrink-0">Items:</span><Badge variant="outline">{items.length} {items.length === 1 ? 'entry' : 'entries'}</Badge></div>
          </div>
        </DialogHeader>

        {/* Email body — visually mirrors product-update.tsx */}
        <div style={{ backgroundColor: '#f3f3f3', padding: 24 }}>
          <div style={{
            backgroundColor: '#ffffff',
            maxWidth: 560,
            margin: '0 auto',
            padding: '32px 28px',
            fontFamily: "'DM Sans', Arial, sans-serif",
          }}>
            <h1 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 28, fontWeight: 600, color: '#d4a73a',
              margin: '0 0 24px', letterSpacing: '0.5px',
            }}>
              ModelBook
            </h1>
            <h2 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 24, fontWeight: 600, color: '#1a1a1a', margin: '0 0 16px',
            }}>
              What's new{periodLabel ? ` · ${periodLabel}` : ''}
            </h2>

            {intro
              ? renderMultiline(intro, textStyle)
              : (
                <p style={textStyle}>
                  A quick recap of the latest updates we've shipped in {SITE_NAME}.
                </p>
              )
            }

            <hr style={{ border: 0, borderTop: '1px solid #eeeeee', margin: '24px 0' }} />

            {items.length === 0 ? (
              <p style={textStyle}>No updates to share this time.</p>
            ) : items.map((item, idx) => {
              const meta = CATEGORY_META[item.category] || CATEGORY_META.new;
              return (
                <div key={idx} style={{ margin: '0 0 20px' }}>
                  <p style={{
                    fontSize: 11, color: '#d4a73a', fontWeight: 600,
                    letterSpacing: '0.6px', textTransform: 'uppercase',
                    margin: '0 0 4px',
                  }}>
                    {meta.emoji} {meta.label}
                  </p>
                  <p style={{
                    fontSize: 16, color: '#1a1a1a', fontWeight: 600,
                    margin: '0 0 4px', lineHeight: 1.4,
                  }}>
                    {item.title}
                  </p>
                  {item.body ? renderMultiline(item.body, itemBodyStyle) : null}
                </div>
              );
            })}

            <hr style={{ border: 0, borderTop: '1px solid #eeeeee', margin: '24px 0' }} />

            <p style={{ fontSize: 12, color: '#999999', margin: '24px 0 0', lineHeight: 1.5 }}>
              Thanks for being part of the {SITE_NAME} beta. Reply with feedback
              anytime — we read every message.
            </p>
            <p style={{ fontSize: 11, color: '#bbbbbb', margin: '16px 0 0', lineHeight: 1.5, fontStyle: 'italic' }}>
              An unsubscribe link will be appended automatically when sent.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
