import { useEffect, useMemo, useState } from 'react';
import { format, parseISO, subDays, startOfDay } from 'date-fns';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Users, Briefcase, FileText, MessageSquare, Receipt, Trash2, Download, Sparkles, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChangelogTab } from '@/components/ChangelogTab';

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  jobCount: number;
  expenseCount: number;
  invoiceCount: number;
  agencyCount: number;
  totalBilled: number;
  lastActive: string | null;
}

interface FeedbackRow {
  id: string;
  user_id: string;
  page_url: string | null;
  severity: 'bug' | 'idea' | 'question' | 'other';
  message: string;
  screenshot_path: string | null;
  status: 'open' | 'in_progress' | 'resolved';
  admin_note: string | null;
  user_agent: string | null;
  created_at: string;
  email?: string;
}

export default function Admin() {
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [signupSeries, setSignupSeries] = useState<{ date: string; count: number }[]>([]);
  const [screenshotUrls, setScreenshotUrls] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);
  const [viewingUser, setViewingUser] = useState<UserRow | null>(null);
  const [userData, setUserData] = useState<{ agencies: any[]; jobs: any[]; expenses: any[]; invoices: any[] } | null>(null);
  const [userDataLoading, setUserDataLoading] = useState(false);

  const openUserData = async (u: UserRow) => {
    setViewingUser(u);
    setUserData(null);
    setUserDataLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-get-user-data', {
        body: { targetUserId: u.id },
      });
      if (error) throw error;
      setUserData(data as any);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load user data');
      setViewingUser(null);
    } finally {
      setUserDataLoading(false);
    }
  };

  const exportEmailsCsv = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-export-emails');
      if (error) throw error;
      const list = (data as { users: { email?: string; created_at: string; id: string }[] }).users || [];
      const rows = list
        .filter(u => u.email)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      const csv = ['email,signed_up_at,user_id']
        .concat(rows.map(u => `${u.email},${u.created_at},${u.id}`))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `modelbook-emails-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} email${rows.length === 1 ? '' : 's'}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      toast.error(msg);
    } finally {
      setExporting(false);
    }
  };

  const exportAllDataCsv = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-export-all-data');
      if (error) throw error;
      const payload = data as Record<string, any[]>;
      const stamp = format(new Date(), 'yyyy-MM-dd');

      const toCsv = (rows: any[]): string => {
        if (!rows.length) return '';
        const cols: string[] = Array.from(rows.reduce((s: Set<string>, r) => {
          Object.keys(r).forEach(k => s.add(k));
          return s;
        }, new Set<string>()));
        const esc = (v: any) => {
          if (v === null || v === undefined) return '';
          const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
      };

      const download = (name: string, csv: string) => {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      };

      const files: [string, any[]][] = [
        ['agencies', payload.agencies || []],
        ['jobs', payload.jobs || []],
        ['expenses', payload.expenses || []],
        ['invoices', payload.invoices || []],
        ['tax-payments', payload.tax_payments || []],
        ['user-settings', payload.user_settings || []],
        ['feedback', payload.feedback || []],
      ];
      let count = 0;
      for (const [name, rows] of files) {
        if (!rows.length) continue;
        download(`modelbook-${name}-${stamp}.csv`, toCsv(rows));
        count += rows.length;
        await new Promise(r => setTimeout(r, 250));
      }
      toast.success(`Exported ${count} rows across ${files.filter(([, r]) => r.length).length} file(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [
        { data: jobs },
        { data: expenses },
        { data: invoices },
        { data: agencies },
        { data: settings },
        { data: fb },
        { data: roles },
      ] = await Promise.all([
        supabase.from('jobs').select('user_id, rate, created_at, updated_at'),
        supabase.from('expenses').select('user_id, created_at, updated_at'),
        supabase.from('invoices').select('user_id, created_at, updated_at'),
        supabase.from('agencies').select('user_id, created_at'),
        supabase.from('user_settings').select('user_id, display_name, created_at'),
        supabase.from('feedback').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id, role, created_at'),
      ]);

      // Build user map keyed by user_id from all available sources
      const map = new Map<string, UserRow>();
      const ensure = (id: string, createdAt?: string) => {
        if (!map.has(id)) {
          map.set(id, {
            id,
            email: id.slice(0, 8) + '…',
            created_at: createdAt || new Date().toISOString(),
            jobCount: 0, expenseCount: 0, invoiceCount: 0, agencyCount: 0,
            totalBilled: 0, lastActive: null,
          });
        }
        return map.get(id)!;
      };

      (roles || []).forEach(r => ensure(r.user_id, r.created_at));
      (settings || []).forEach(s => {
        const u = ensure(s.user_id, s.created_at);
        if (s.display_name) u.email = s.display_name;
      });
      (jobs || []).forEach(j => {
        const u = ensure(j.user_id, j.created_at);
        u.jobCount += 1;
        u.totalBilled += Number(j.rate || 0);
        const d = j.updated_at || j.created_at;
        if (!u.lastActive || d > u.lastActive) u.lastActive = d;
      });
      (expenses || []).forEach(e => {
        const u = ensure(e.user_id, e.created_at);
        u.expenseCount += 1;
        const d = e.updated_at || e.created_at;
        if (!u.lastActive || d > u.lastActive) u.lastActive = d;
      });
      (invoices || []).forEach(i => {
        const u = ensure(i.user_id, i.created_at);
        u.invoiceCount += 1;
        const d = i.updated_at || i.created_at;
        if (!u.lastActive || d > u.lastActive) u.lastActive = d;
      });
      (agencies || []).forEach(a => {
        const u = ensure(a.user_id, a.created_at);
        u.agencyCount += 1;
      });

      const userArray = Array.from(map.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));

      // 30-day signup chart (based on earliest known created_at per user)
      const days: { date: string; count: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = startOfDay(subDays(new Date(), i));
        days.push({ date: format(d, 'MMM d'), count: 0 });
      }
      userArray.forEach(u => {
        const created = startOfDay(parseISO(u.created_at));
        const idx = days.findIndex(d => d.date === format(created, 'MMM d'));
        if (idx >= 0) days[idx].count += 1;
      });

      // Feedback with email lookup from user map
      const feedbackWithEmail: FeedbackRow[] = (fb || []).map(f => ({
        ...f,
        severity: f.severity as FeedbackRow['severity'],
        status: f.status as FeedbackRow['status'],
        email: map.get(f.user_id)?.email,
      }));

      setUsers(userArray);
      setSignupSeries(days);
      setFeedback(feedbackWithEmail);

      // Sign URLs for screenshots
      const urls: Record<string, string> = {};
      for (const f of feedbackWithEmail) {
        if (f.screenshot_path) {
          const { data } = await supabase.storage
            .from('feedback-screenshots')
            .createSignedUrl(f.screenshot_path, 3600);
          if (data) urls[f.id] = data.signedUrl;
        }
      }
      setScreenshotUrls(urls);
    } catch (err: any) {
      toast.error(`Failed to load admin data: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const updateFeedbackStatus = async (id: string, status: FeedbackRow['status']) => {
    const { error } = await supabase.from('feedback').update({ status }).eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setFeedback(prev => prev.map(f => f.id === id ? { ...f, status } : f));
  };

  const deleteFeedback = async (id: string) => {
    if (!confirm('Delete this feedback?')) return;
    const { error } = await supabase.from('feedback').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setFeedback(prev => prev.filter(f => f.id !== id));
  };

  const kpis = useMemo(() => {
    const newThisWeek = users.filter(u => parseISO(u.created_at) > subDays(new Date(), 7)).length;
    const totalJobs = users.reduce((s, u) => s + u.jobCount, 0);
    const totalInvoices = users.reduce((s, u) => s + u.invoiceCount, 0);
    const totalBilled = users.reduce((s, u) => s + u.totalBilled, 0);
    const openFeedback = feedback.filter(f => f.status === 'open').length;
    return { totalUsers: users.length, newThisWeek, totalJobs, totalInvoices, totalBilled, openFeedback };
  }, [users, feedback]);

  if (roleLoading) {
    return <div className="p-6"><Skeleton className="h-8 w-40" /></div>;
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  const severityColor = (s: string) => ({
    bug: 'bg-red-500/20 text-red-400 border-red-500/30',
    idea: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    question: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    other: 'bg-muted text-muted-foreground',
  } as Record<string, string>)[s] || '';

  const statusColor = (s: string) => ({
    open: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    resolved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  } as Record<string, string>)[s] || '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-heading font-semibold">Admin · Back Office</h1>
          <p className="text-muted-foreground mt-1">Beta usage, activity, and feedback.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportEmailsCsv} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting…' : 'Download emails CSV'}
          </Button>
          <Button variant="outline" size="sm" onClick={exportAllDataCsv} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting…' : 'Download all data CSV'}
          </Button>
          <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>Refresh</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total users', value: kpis.totalUsers, icon: Users },
          { label: 'New this week', value: kpis.newThisWeek, icon: Users },
          { label: 'Total jobs', value: kpis.totalJobs, icon: Briefcase },
          { label: 'Total invoices', value: kpis.totalInvoices, icon: FileText },
          { label: 'Total billed', value: `$${kpis.totalBilled.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: Receipt },
          { label: 'Open feedback', value: kpis.openFeedback, icon: MessageSquare },
        ].map(k => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="p-4 glass-card">
              <Icon className="h-4 w-4 text-primary mb-2" />
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="font-heading text-xl font-semibold mt-1">{k.value}</p>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="feedback">Feedback ({feedback.length})</TabsTrigger>
          <TabsTrigger value="signups">Signups (30d)</TabsTrigger>
          <TabsTrigger value="changelog"><Sparkles className="h-3.5 w-3.5 mr-1" />Changelog</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="glass-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Jobs</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Agencies</TableHead>
                  <TableHead className="text-right">Total billed</TableHead>
                  <TableHead>Last active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ))}
                {!loading && users.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No users yet</TableCell></TableRow>
                )}
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground">{format(parseISO(u.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">{u.jobCount}</TableCell>
                    <TableCell className="text-right">{u.expenseCount}</TableCell>
                    <TableCell className="text-right">{u.invoiceCount}</TableCell>
                    <TableCell className="text-right">{u.agencyCount}</TableCell>
                    <TableCell className="text-right">${u.totalBilled.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {u.lastActive ? format(parseISO(u.lastActive), 'MMM d, HH:mm') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openUserData(u)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="feedback">
          <div className="space-y-3">
            {loading && <Skeleton className="h-32 w-full" />}
            {!loading && feedback.length === 0 && (
              <Card className="glass-card p-8 text-center text-muted-foreground">No feedback yet</Card>
            )}
            {feedback.map(f => (
              <Card key={f.id} className="glass-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={severityColor(f.severity)}>{f.severity}</Badge>
                    <Badge variant="outline" className={statusColor(f.status)}>{f.status.replace('_', ' ')}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {f.email || f.user_id.slice(0, 8)} · {format(parseISO(f.created_at), 'MMM d, HH:mm')}
                    </span>
                    {f.page_url && <span className="text-xs text-muted-foreground">on <code className="bg-secondary px-1 rounded">{f.page_url}</code></span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={f.status} onValueChange={(v) => updateFeedbackStatus(f.id, v as any)}>
                      <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteFeedback(f.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{f.message}</p>
                {screenshotUrls[f.id] && (
                  <a href={screenshotUrls[f.id]} target="_blank" rel="noreferrer" className="block">
                    <img src={screenshotUrls[f.id]} alt="Screenshot" className="max-h-48 rounded border border-border" />
                  </a>
                )}
                {f.user_agent && <p className="text-[10px] text-muted-foreground truncate">{f.user_agent}</p>}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="signups">
          <Card className="glass-card p-5">
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <LineChart data={signupSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="changelog">
          <ChangelogTab />
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Admin route is hidden from the sidebar. Bookmark <Link className="underline" to="/admin">/admin</Link>.
      </p>

      <Dialog open={!!viewingUser} onOpenChange={(o) => { if (!o) { setViewingUser(null); setUserData(null); } }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3 flex-wrap">
              <span>{viewingUser?.email} · Data</span>
              {userData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!viewingUser || !userData) return;
                    const stamp = format(new Date(), 'yyyy-MM-dd');
                    const slug = (viewingUser.email || viewingUser.id).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
                    const agencyById = new Map<string, any>();
                    (userData.agencies || []).forEach((a: any) => agencyById.set(a.id, a));
                    const jobById = new Map<string, any>();
                    (userData.jobs || []).forEach((j: any) => jobById.set(j.id, j));

                    const enrichedJobs = (userData.jobs || []).map((j: any) => ({
                      agency_name: j.agency_id ? agencyById.get(j.agency_id)?.name || '' : '',
                      ...j,
                    }));
                    const enrichedExpenses = (userData.expenses || []).map((e: any) => {
                      const job = e.job_id ? jobById.get(e.job_id) : null;
                      const agency = job?.agency_id ? agencyById.get(job.agency_id) : null;
                      return {
                        linked_job_client: job?.client || '',
                        linked_job_description: job?.description || '',
                        linked_job_date: job?.job_date || '',
                        linked_agency_name: agency?.name || '',
                        ...e,
                      };
                    });
                    const enrichedInvoices = (userData.invoices || []).map((i: any) => {
                      const job = i.job_id ? jobById.get(i.job_id) : null;
                      const agency = job?.agency_id ? agencyById.get(job.agency_id) : null;
                      return {
                        linked_job_client: job?.client || '',
                        linked_job_description: job?.description || '',
                        linked_job_date: job?.job_date || '',
                        linked_agency_name: agency?.name || '',
                        ...i,
                      };
                    });

                    const toCsv = (rows: any[]): string => {
                      if (!rows.length) return '';
                      const cols: string[] = Array.from(rows.reduce((s: Set<string>, r) => {
                        Object.keys(r).forEach(k => s.add(k));
                        return s;
                      }, new Set<string>()));
                      const esc = (v: any) => {
                        if (v === null || v === undefined) return '';
                        const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
                        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
                      };
                      return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
                    };
                    const dl = (name: string, csv: string) => {
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = name;
                      a.click();
                      URL.revokeObjectURL(url);
                    };

                    const files: [string, any[]][] = [
                      ['agencies', userData.agencies || []],
                      ['jobs', enrichedJobs],
                      ['expenses', enrichedExpenses],
                      ['invoices', enrichedInvoices],
                    ];
                    let count = 0;
                    (async () => {
                      for (const [name, rows] of files) {
                        if (!rows.length) continue;
                        dl(`modelbook-${slug}-${name}-${stamp}.csv`, toCsv(rows));
                        count += rows.length;
                        await new Promise(r => setTimeout(r, 250));
                      }
                      toast.success(`Exported ${count} row${count === 1 ? '' : 's'} for ${viewingUser.email}`);
                    })();
                  }}
                >
                  <Download className="h-4 w-4 mr-2" /> Download CSV
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {userDataLoading && <Skeleton className="h-40 w-full" />}
          {userData && (
            <Tabs defaultValue="agencies" className="mt-2">
              <TabsList>
                <TabsTrigger value="agencies">Agencies ({userData.agencies.length})</TabsTrigger>
                <TabsTrigger value="jobs">Jobs ({userData.jobs.length})</TabsTrigger>
                <TabsTrigger value="expenses">Expenses ({userData.expenses.length})</TabsTrigger>
                <TabsTrigger value="invoices">Invoices ({userData.invoices.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="agencies">
                {userData.agencies.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No agencies</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Commission %</TableHead>
                      <TableHead>Default currency</TableHead>
                      <TableHead>Net days</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {userData.agencies.map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.name}</TableCell>
                          <TableCell>{a.default_agent_percent ?? '—'}%</TableCell>
                          <TableCell>{a.default_currency ?? '—'}</TableCell>
                          <TableCell>{a.default_net_days ?? '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{format(parseISO(a.created_at), 'MMM d, yyyy')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="jobs">
                {userData.jobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No jobs</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Client</TableHead><TableHead>Date</TableHead>
                      <TableHead className="text-right">Rate</TableHead><TableHead>Currency</TableHead>
                      <TableHead>Agency</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {(() => {
                        const agencyById = new Map<string, any>();
                        (userData.agencies || []).forEach((a: any) => agencyById.set(a.id, a));
                        return userData.jobs.map((j: any) => {
                          const s = String(j.status || '').toLowerCase();
                          const paid = s === 'paid';
                          const agency = j.agency_id ? agencyById.get(j.agency_id) : null;
                          return (
                            <TableRow key={j.id}>
                              <TableCell className="font-medium">{j.client}</TableCell>
                              <TableCell className="text-xs">{j.job_date}</TableCell>
                              <TableCell className="text-right">{Number(j.rate || 0).toLocaleString()}</TableCell>
                              <TableCell>{j.currency}</TableCell>
                              <TableCell className="text-xs">{agency?.name || <span className="text-muted-foreground">—</span>}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={paid ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}>
                                  {paid ? 'Paid' : (j.status ? `${j.status[0].toUpperCase()}${j.status.slice(1)}` : 'Unpaid')}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="expenses">
                {userData.expenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No expenses</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Linked job</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {(() => {
                        const jobById = new Map<string, any>();
                        (userData.jobs || []).forEach((j: any) => jobById.set(j.id, j));
                        return userData.expenses.map((e: any) => {
                          const job = e.job_id ? jobById.get(e.job_id) : null;
                          return (
                            <TableRow key={e.id}>
                              <TableCell className="font-medium">{e.description || '—'}</TableCell>
                              <TableCell className="text-xs">{e.date}</TableCell>
                              <TableCell className="text-right">{Number(e.amount || 0).toLocaleString()} {e.currency}</TableCell>
                              <TableCell className="text-xs">{e.category || '—'}</TableCell>
                              <TableCell className="text-xs">
                                {job ? `${job.client}${job.job_date ? ` · ${job.job_date}` : ''}` : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="invoices">
                {userData.invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No invoices</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Number</TableHead><TableHead>Client</TableHead>
                      <TableHead>Issued</TableHead><TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {userData.invoices.map((i: any) => (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium">{i.invoice_number}</TableCell>
                          <TableCell>{i.client_name || '—'}</TableCell>
                          <TableCell className="text-xs">{i.issue_date}</TableCell>
                          <TableCell className="text-right">{Number(i.total || 0).toLocaleString()} {i.currency}</TableCell>
                          <TableCell className="text-xs">{i.status || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
