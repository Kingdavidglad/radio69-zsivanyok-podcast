import schedule from '../_shared/show-schedule.json' with { type: 'json' };

const allowedOrigins = new Set([
  'https://radio69zsivanyok.hu',
  'https://www.radio69zsivanyok.hu'
]);
const allowedShowIds = new Set(Object.keys(schedule.shows));
const allowedPushHosts = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
  'notify.windows.com',
  'push.services.opera.com'
];

function corsHeaders(origin: string | null): HeadersInit {
  const selectedOrigin = origin && allowedOrigins.has(origin)
    ? origin
    : 'https://radio69zsivanyok.hu';
  return {
    'Access-Control-Allow-Origin': selectedOrigin,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

function jsonResponse(req: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(req.headers.get('origin')) });
}

function isAllowedEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 4096) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const hostname = url.hostname.toLowerCase();
    return allowedPushHosts.some(host => hostname === host || hostname.endsWith(`.${host}`));
  } catch (_) {
    return false;
  }
}

function isBase64Url(value: unknown, minLength: number, maxLength: number): value is string {
  return typeof value === 'string'
    && value.length >= minLength
    && value.length <= maxLength
    && /^[A-Za-z0-9_-]+$/.test(value);
}

function getSupabaseCredentials() {
  const url = Deno.env.get('SUPABASE_URL');
  let serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY');
  if (!serviceKey) {
    try { serviceKey = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default || ''; } catch (_) { /* legacy key path */ }
  }
  if (!url || !serviceKey) throw new Error('A Supabase szerveroldali konfigurációja hiányzik.');
  return { url: url.replace(/\/$/, ''), serviceKey };
}

function restHeaders(serviceKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: serviceKey,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };
  // Modern sb_secret_ keys are API keys, not JWTs: send them only in `apikey`.
  // Keep Bearer authentication only for legacy service_role JWT keys.
  if (!serviceKey.startsWith('sb_secret_')) {
    headers.Authorization = `Bearer ${serviceKey}`;
  }
  return headers;
}

async function fetchSubscriptionRow(endpoint: string) {
  const { url, serviceKey } = getSupabaseCredentials();
  const query = new URLSearchParams({
    endpoint: `eq.${endpoint}`,
    select: 'show_ids,active',
    limit: '1'
  });
  const response = await fetch(`${url}/rest/v1/radio69_show_push_subscriptions?${query}`, {
    headers: restHeaders(serviceKey)
  });
  if (!response.ok) throw new Error(`Adatbázis-lekérdezési hiba (${response.status}).`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (origin && !allowedOrigins.has(origin)) return jsonResponse(req, { error: 'A kérés eredete nem engedélyezett.' }, 403);
  if (req.method !== 'POST') return jsonResponse(req, { error: 'Csak POST kérés engedélyezett.' }, 405);

  try {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 20000) return jsonResponse(req, { error: 'A kérés túl nagy.' }, 413);

    const body = await req.json();
    const action = body?.action;
    if (!['save', 'load', 'remove'].includes(action)) {
      return jsonResponse(req, { error: 'Érvénytelen művelet.' }, 400);
    }

    if (action === 'load') {
      if (!isAllowedEndpoint(body.endpoint)) return jsonResponse(req, { error: 'Érvénytelen push-végpont.' }, 400);
      const row = await fetchSubscriptionRow(body.endpoint);
      return jsonResponse(req, {
        found: Boolean(row),
        showIds: row?.active && Array.isArray(row.show_ids) ? row.show_ids : []
      });
    }

    const { url, serviceKey } = getSupabaseCredentials();

    if (action === 'remove') {
      if (!isAllowedEndpoint(body.endpoint)) return jsonResponse(req, { error: 'Érvénytelen push-végpont.' }, 400);
      const query = new URLSearchParams({ endpoint: `eq.${body.endpoint}` });
      const response = await fetch(`${url}/rest/v1/radio69_show_push_subscriptions?${query}`, {
        method: 'DELETE',
        headers: restHeaders(serviceKey)
      });
      if (!response.ok) throw new Error(`Nem sikerült eltávolítani az előfizetést (${response.status}).`);
      return jsonResponse(req, { ok: true });
    }

    const subscription = body?.subscription;
    if (!subscription || !isAllowedEndpoint(subscription.endpoint)) {
      return jsonResponse(req, { error: 'Érvénytelen böngésző-előfizetés.' }, 400);
    }
    if (!isBase64Url(subscription.keys?.p256dh, 40, 120) || !isBase64Url(subscription.keys?.auth, 16, 80)) {
      return jsonResponse(req, { error: 'A push-előfizetés titkosítási kulcsai érvénytelenek.' }, 400);
    }

    const requestedIds = Array.isArray(body.showIds) ? body.showIds : [];
    if (requestedIds.length > allowedShowIds.size || requestedIds.some((id: unknown) => typeof id !== 'string' || !allowedShowIds.has(id))) {
      return jsonResponse(req, { error: 'A kiválasztott műsorok listája érvénytelen.' }, 400);
    }
    const showIds = [...new Set(requestedIds as string[])];
    const row = {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      show_ids: showIds,
      active: showIds.length > 0,
      updated_at: new Date().toISOString()
    };

    const response = await fetch(`${url}/rest/v1/radio69_show_push_subscriptions?on_conflict=endpoint`, {
      method: 'POST',
      headers: {
        ...restHeaders(serviceKey),
        Prefer: 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(row)
    });
    if (!response.ok) {
      const details = await response.text();
      console.error('Subscription upsert failed:', response.status, details.slice(0, 500));
      throw new Error(`Nem sikerült elmenteni az értesítési beállítást (${response.status}).`);
    }

    return jsonResponse(req, { ok: true, active: row.active, showIds });
  } catch (error) {
    console.error('radio69-show-subscriptions error:', error);
    return jsonResponse(req, {
      error: error instanceof Error ? error.message : 'Ismeretlen szerverhiba.'
    }, 500);
  }
});
