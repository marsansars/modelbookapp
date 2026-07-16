import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

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

    // Fetch users for email mapping
    const emailById = new Map<string, string>();
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      for (const u of data.users) emailById.set(u.id, u.email || '');
      if (data.users.length < perPage) break;
      page++;
    }

    const [agenciesRes, jobsRes, expensesRes, invoicesRes, taxRes, settingsRes, feedbackRes] = await Promise.all([
      admin.from('agencies').select('*').order('created_at', { ascending: false }),
      admin.from('jobs').select('*').order('job_date', { ascending: false }),
      admin.from('expenses').select('*').order('date', { ascending: false }),
      admin.from('invoices').select('*').order('created_at', { ascending: false }),
      admin.from('tax_payments').select('*').order('payment_date', { ascending: false }),
      admin.from('user_settings').select('*'),
      admin.from('feedback').select('*').order('created_at', { ascending: false }),
    ]);

    // Build lookup maps for correlation
    const agencyById = new Map<string, any>();
    (agenciesRes.data || []).forEach(a => agencyById.set(a.id, a));
    const jobById = new Map<string, any>();
    (jobsRes.data || []).forEach(j => jobById.set(j.id, j));

    const withUser = (r: any) => ({
      user_email: emailById.get(r.user_id) || '',
      ...r,
    });

    const agencies = (agenciesRes.data || []).map(withUser);

    const jobs = (jobsRes.data || []).map(j => {
      const agency = j.agency_id ? agencyById.get(j.agency_id) : null;
      return {
        user_email: emailById.get(j.user_id) || '',
        agency_name: agency?.name || '',
        ...j,
      };
    });

    const expenses = (expensesRes.data || []).map(e => {
      const job = e.job_id ? jobById.get(e.job_id) : null;
      const agency = job?.agency_id ? agencyById.get(job.agency_id) : null;
      return {
        user_email: emailById.get(e.user_id) || '',
        linked_job_client: job?.client || '',
        linked_job_description: job?.description || '',
        linked_job_date: job?.job_date || '',
        linked_agency_name: agency?.name || '',
        ...e,
      };
    });

    const invoices = (invoicesRes.data || []).map(i => {
      const job = i.job_id ? jobById.get(i.job_id) : null;
      const agency = job?.agency_id ? agencyById.get(job.agency_id) : null;
      return {
        user_email: emailById.get(i.user_id) || '',
        linked_job_client: job?.client || '',
        linked_job_description: job?.description || '',
        linked_job_date: job?.job_date || '',
        linked_agency_name: agency?.name || '',
        ...i,
      };
    });

    const tax_payments = (taxRes.data || []).map(withUser);
    const user_settings = (settingsRes.data || []).map(withUser);
    const feedback = (feedbackRes.data || []).map(withUser);

    return new Response(
      JSON.stringify({
        agencies,
        jobs,
        expenses,
        invoices,
        tax_payments,
        user_settings,
        feedback,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
