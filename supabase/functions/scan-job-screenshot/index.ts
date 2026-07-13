import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const CURRENCY_CODES = ['USD','EUR','GBP','JPY','CHF','AUD','CAD','SEK','DKK','NOK','CNY','KRW','BRL','ZAR','HKD','SGD','AED','INR','MXN','THB'];

const SYSTEM_PROMPT = `You extract structured booking/job details from a screenshot of an email, booking confirmation, call sheet, or agency message for a fashion model.

Return ONLY a JSON object matching this shape (omit or null out any field you cannot determine — do NOT guess):
{
  "client": string | null,          // brand or client name (e.g. "Vogue", "Gucci")
  "description": string | null,     // shoot type (e.g. "Ecomm", "Editorial", "Campaign", "Lookbook")
  "jobDate": string | null,         // ISO date YYYY-MM-DD
  "agencyName": string | null,      // agency booking the job, if named
  "currency": string | null,        // 3-letter ISO code from: ${CURRENCY_CODES.join(', ')}
  "agentPercent": number | null,    // commission percent, only if explicitly stated
  "taxPercent": number | null,      // only if explicitly stated
  "netDays": number | null,         // payment terms in days (e.g. Net 30 -> 30), only if explicit
  "lineItems": [                    // rate breakdown; up to 10 items
    { "description": string, "amount": number }
  ],
  "notes": string | null            // call time, location, contacts, wardrobe, anything else useful (max ~500 chars)
}

Rules:
- Numbers must be plain numbers, no currency symbols or commas.
- Never invent values. If unsure, use null (or omit the field).
- lineItems: separate day rate, usage, overtime, fitting, travel, buyout, etc. into their own items when the screenshot lists them separately. If only one total rate is shown, return a single item like {"description":"Rate","amount":X}.
- Output MUST be valid JSON, no markdown fences, no commentary.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => null);
    const imageDataUrl: string | undefined = body?.imageDataUrl;
    if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
      return new Response(JSON.stringify({ error: 'imageDataUrl (data:image/*;base64,...) required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const gatewayRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract the job details from this screenshot. Return JSON only.' },
              { type: 'image_url', image_url: { url: imageDataUrl } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!gatewayRes.ok) {
      const errText = await gatewayRes.text();
      console.error('AI Gateway error', gatewayRes.status, errText);
      let userMsg = 'Could not scan screenshot.';
      if (gatewayRes.status === 429) userMsg = 'Too many scans — please wait a moment and try again.';
      if (gatewayRes.status === 402) userMsg = 'AI credits exhausted. Add credits in Settings → Plans & credits.';
      return new Response(JSON.stringify({ error: userMsg, status: gatewayRes.status }), {
        status: gatewayRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await gatewayRes.json();
    const text: string = data?.choices?.[0]?.message?.content ?? '';

    let parsed: any = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      // Try to salvage a JSON object from the reply
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { parsed = {}; }
      }
    }

    // Normalize / sanitize
    const out: Record<string, unknown> = {};
    const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
    const num = (v: unknown) => {
      const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v.replace(/[^0-9.\-]/g, '')) : NaN;
      return Number.isFinite(n) ? n : null;
    };

    out.client = str(parsed.client);
    out.description = str(parsed.description);
    const date = str(parsed.jobDate);
    out.jobDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
    out.agencyName = str(parsed.agencyName);
    const curRaw = str(parsed.currency)?.toUpperCase();
    out.currency = curRaw && CURRENCY_CODES.includes(curRaw) ? curRaw : null;
    out.agentPercent = num(parsed.agentPercent);
    out.taxPercent = num(parsed.taxPercent);
    out.netDays = num(parsed.netDays);
    out.notes = str(parsed.notes);

    const items = Array.isArray(parsed.lineItems) ? parsed.lineItems.slice(0, 10) : [];
    out.lineItems = items
      .map((li: any) => ({ description: str(li?.description) ?? '', amount: num(li?.amount) ?? 0 }))
      .filter((li: any) => li.amount > 0 || li.description);

    return new Response(JSON.stringify({ data: out }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('scan-job-screenshot error', err);
    return new Response(JSON.stringify({ error: (err as Error).message || 'Unexpected error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
