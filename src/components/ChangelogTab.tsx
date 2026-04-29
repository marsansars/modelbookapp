import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Send, Trash2, Pencil, Check, X, Mail, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { EmailPreviewDialog } from './EmailPreviewDialog';

type Category = 'new' | 'improved' | 'fixed';

interface Entry {
  id: string;
  title: string;
  body: string;
  category: Category;
  sent_at: string | null;
  created_at: string;
}

const CATEGORY_LABELS: Record<Category, { label: string; emoji: string; color: string }> = {
  new: { label: 'New', emoji: '✨', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  improved: { label: 'Improved', emoji: '🛠', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  fixed: { label: 'Fixed', emoji: '🐛', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
};

export function ChangelogTab() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('new');
  const [adding, setAdding] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editCategory, setEditCategory] = useState<Category>('new');

  // Send dialog
  const [periodLabel, setPeriodLabel] = useState(format(new Date(), 'MMMM yyyy'));
  const [intro, setIntro] = useState('');
  const [sending, setSending] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('changelog_entries')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    else setEntries((data || []) as Entry[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const addEntry = async () => {
    if (!newTitle.trim() || !user) return;
    setAdding(true);
    const { error } = await supabase.from('changelog_entries').insert({
      title: newTitle.trim(),
      body: newBody.trim(),
      category: newCategory,
      created_by: user.id,
    });
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    setNewTitle(''); setNewBody(''); setNewCategory('new');
    toast.success('Entry added');
    void load();
  };

  const startEdit = (e: Entry) => {
    setEditingId(e.id);
    setEditTitle(e.title);
    setEditBody(e.body);
    setEditCategory(e.category);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase
      .from('changelog_entries')
      .update({ title: editTitle.trim(), body: editBody.trim(), category: editCategory })
      .eq('id', editingId);
    if (error) { toast.error(error.message); return; }
    setEditingId(null);
    toast.success('Saved');
    void load();
  };

  const removeEntry = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    const { error } = await supabase.from('changelog_entries').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const unsent = entries.filter(e => !e.sent_at);
  const sent = entries.filter(e => e.sent_at);

  const fetchPreviewCount = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-send-changelog', {
        body: { dryRun: true },
      });
      if (error) throw error;
      setPreviewCount((data as any).recipientCount ?? 0);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load recipient count');
      setPreviewCount(null);
    }
  };

  const sendDigest = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-send-changelog', {
        body: { periodLabel: periodLabel || undefined, intro: intro || undefined },
      });
      if (error) throw error;
      const d = data as { queued: number; failed: number; recipientCount: number };
      toast.success(`Digest sent: ${d.queued} queued, ${d.failed} failed (${d.recipientCount} users)`);
      setIntro('');
      void load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send digest');
    } finally {
      setSending(false);
    }
  };

  const renderEntry = (e: Entry) => {
    const meta = CATEGORY_LABELS[e.category];
    const isEditing = editingId === e.id;
    return (
      <Card key={e.id} className="glass-card p-4 space-y-3">
        {isEditing ? (
          <>
            <div className="flex gap-2">
              <Select value={editCategory} onValueChange={(v) => setEditCategory(v as Category)}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABELS) as Category[]).map(c => (
                    <SelectItem key={c} value={c}>{CATEGORY_LABELS[c].emoji} {CATEGORY_LABELS[c].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
            </div>
            <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} placeholder="Details (optional)" rows={3} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
              <Button size="sm" onClick={saveEdit}><Check className="h-4 w-4 mr-1" /> Save</Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={meta.color}>{meta.emoji} {meta.label}</Badge>
                <span className="text-xs text-muted-foreground">
                  {format(parseISO(e.created_at), 'MMM d, yyyy')}
                  {e.sent_at && ` · sent ${format(parseISO(e.sent_at), 'MMM d')}`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(e)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeEntry(e.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <p className="font-medium">{e.title}</p>
            {e.body && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{e.body}</p>}
          </>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Add new entry */}
      <Card className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-lg">Log a change</h3>
          <p className="text-xs text-muted-foreground">Visible only to you. Goes out in the next email digest.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={newCategory} onValueChange={(v) => setNewCategory(v as Category)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(CATEGORY_LABELS) as Category[]).map(c => (
                <SelectItem key={c} value={c}>{CATEGORY_LABELS[c].emoji} {CATEGORY_LABELS[c].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Short title (e.g. Multi-currency support)"
            className="flex-1 min-w-[200px]"
          />
        </div>
        <Textarea
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          placeholder="Details (optional) — 1-2 sentences explaining the change"
          rows={2}
        />
        <div className="flex justify-end">
          <Button onClick={addEntry} disabled={!newTitle.trim() || adding}>
            <Plus className="h-4 w-4 mr-1" /> {adding ? 'Adding…' : 'Add entry'}
          </Button>
        </div>
      </Card>

      {/* Send digest */}
      <Card className="glass-card p-4 space-y-3 border-primary/30">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-heading text-lg flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Send digest
            </h3>
            <p className="text-xs text-muted-foreground">
              {unsent.length} unsent {unsent.length === 1 ? 'entry' : 'entries'} · sends one email per signed-up user
            </p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          <Input
            value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)}
            placeholder="Period label (e.g. April 2026)"
          />
          <Input
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            placeholder="Optional intro line for the email"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <AlertDialog onOpenChange={(open) => { if (open) void fetchPreviewCount(); else setPreviewCount(null); }}>
            <AlertDialogTrigger asChild>
              <Button disabled={unsent.length === 0 || sending}>
                <Send className="h-4 w-4 mr-1" /> {sending ? 'Sending…' : `Send to all users`}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Send digest to all users?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 text-sm">
                    <p>
                      This will email <strong>{previewCount ?? '…'}</strong> user{previewCount === 1 ? '' : 's'} the
                      following <strong>{unsent.length}</strong> {unsent.length === 1 ? 'entry' : 'entries'}:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 max-h-48 overflow-auto">
                      {unsent.map(e => (
                        <li key={e.id}>
                          <span className="text-muted-foreground">{CATEGORY_LABELS[e.category].emoji}</span> {e.title}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground pt-2">
                      Suppressed and unsubscribed addresses are skipped automatically.
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={sendDigest}>Send digest</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>

      {/* Lists */}
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <>
          <section className="space-y-2">
            <h3 className="font-heading text-lg flex items-center gap-2">
              Unsent <Badge variant="outline">{unsent.length}</Badge>
            </h3>
            {unsent.length === 0 ? (
              <Card className="glass-card p-6 text-center text-sm text-muted-foreground">
                No unsent entries. Log a change above as you ship it.
              </Card>
            ) : (
              <div className="space-y-3">{unsent.map(renderEntry)}</div>
            )}
          </section>

          {sent.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-heading text-lg flex items-center gap-2">
                Sent <Badge variant="outline">{sent.length}</Badge>
              </h3>
              <div className="space-y-3 opacity-75">{sent.map(renderEntry)}</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
