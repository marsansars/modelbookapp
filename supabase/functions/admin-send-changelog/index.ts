import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChangelogEntry {
  id: string;
  title: string;
  body: string;
  category: 'new' | 'improved' | 'fixed';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Authenticate caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin role
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: role } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!role) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse body: { entryIds: string[], periodLabel?: string, intro?: string, dryRun?: boolean }
    let body: {
      entryIds?: string[];
      periodLabel?: string;
      intro?: string;
      dryRun?: boolean;
    };
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const dryRun = !!body.dryRun;

    // Load entries: either explicit list, or all unsent
    let entriesQuery = admin
      .from('changelog_entries')
      .select('id, title, body, category, created_at')
      .order('created_at', { ascending: true });

    if (body.entryIds && body.entryIds.length > 0) {
      entriesQuery = entriesQuery.in('id', body.entryIds);
    } else {
      entriesQuery = entriesQuery.is('sent_at', null);
    }

    const { data: entries, error: entriesErr } = await entriesQuery;
    if (entriesErr) throw entriesErr;

    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No changelog entries to send' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const items: ChangelogEntry[] = entries.map((e: any) => ({
      id: e.id,
      title: e.title,
      body: e.body,
      category: e.category,
    }));

    // Page through all users
    const recipients: { id: string; email: string }[] = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      for (const u of data.users) {
        if (u.email) recipients.push({ id: u.id, email: u.email });
      }
      if (data.users.length < perPage) break;
      page++;
    }

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dryRun: true,
          recipientCount: recipients.length,
          entryCount: items.length,
          items,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build a stable digest id so retries hit the same idempotency family
    const digestId = crypto.randomUUID();
    const templateData = {
      periodLabel: body.periodLabel,
      intro: body.intro,
      items: items.map(({ category, title, body: itemBody }) => ({ category, title, body: itemBody })),
    };

    let queued = 0;
    let failed = 0;
    const errors: string[] = [];

    // Fan out one transactional send per recipient
    for (const r of recipients) {
      const { error } = await admin.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'product-update',
          recipientEmail: r.email,
          idempotencyKey: `changelog-${digestId}-${r.id}`,
          templateData,
        },
      });
      if (error) {
        failed++;
        if (errors.length < 5) errors.push(`${r.email}: ${error.message}`);
      } else {
        queued++;
      }
    }

    // Mark entries as sent
    const sentAt = new Date().toISOString();
    const { error: markErr } = await admin
      .from('changelog_entries')
      .update({ sent_at: sentAt })
      .in('id', items.map((i) => i.id))
      .is('sent_at', null);

    if (markErr) {
      console.error('Failed to mark entries sent', markErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        queued,
        failed,
        recipientCount: recipients.length,
        entryCount: items.length,
        digestId,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('admin-send-changelog error', err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
