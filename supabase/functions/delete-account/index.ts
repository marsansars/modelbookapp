// Deletes the currently authenticated user's account and all associated data.
// Requires the caller to send their JWT in the Authorization header.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

    // Validate the caller's JWT and extract user id.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const userId = userData.user.id

    // Service-role client for privileged cleanup.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Best-effort: remove storage objects in user folders.
    for (const bucket of ['attachments', 'feedback-screenshots']) {
      try {
        const { data: files } = await admin.storage.from(bucket).list(userId, { limit: 1000 })
        if (files && files.length > 0) {
          await admin.storage
            .from(bucket)
            .remove(files.map((f) => `${userId}/${f.name}`))
        }
      } catch (_) {
        // ignore — bucket may be empty or absent
      }
    }

    // Wipe domain rows. Order matters where FKs exist.
    const tables = [
      'invoices',
      'expenses',
      'jobs',
      'agencies',
      'feedback',
      'user_settings',
      'user_roles',
    ] as const
    for (const t of tables) {
      const { error } = await admin.from(t).delete().eq('user_id', userId)
      if (error) {
        console.error(`delete-account: failed wiping ${t}`, error)
      }
    }

    // Finally, delete the auth user.
    const { error: delErr } = await admin.auth.admin.deleteUser(userId)
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('delete-account error', e)
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
