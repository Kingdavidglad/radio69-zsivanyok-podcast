import { createClient } from 'npm:@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
const allowedOrigins = new Set(['https://radio69zsivanyok.hu', 'https://www.radio69zsivanyok.hu']);
const allowedHost = (host: string) => host === 'fcm.googleapis.com' || host === 'web.push.apple.com' || host.endsWith('.push.services.mozilla.com') || host.endsWith('.notify.windows.com');
const reply = (status: number, body: unknown, origin: string) => new Response(JSON.stringify(body), { status, headers: { ...cors, ...(allowedOrigins.has(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}) } });
Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { ...cors, ...(allowedOrigins.has(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}) } });
  if (req.method !== 'POST' || !allowedOrigins.has(origin)) return reply(403, { success: false, error: 'Origin or method not allowed.' }, origin);
  try {
    const url = Deno.env.get('SUPABASE_URL') || '', key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!url || !key) return reply(500, { success: false, error: 'Server configuration is missing.' }, origin);
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await req.json();
    const action = body?.action;
    const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : body?.subscription?.endpoint;
    if (typeof endpoint !== 'string' || endpoint.length > 2048) return reply(400, { success: false, error: 'Invalid endpoint.' }, origin);
    const parsed = new URL(endpoint);
    if (parsed.protocol !== 'https:' || !allowedHost(parsed.hostname.toLowerCase())) return reply(400, { success: false, error: 'Unsupported push provider.' }, origin);
    if (action === 'unsubscribe') {
      const { error } = await admin.from('push_subscriptions').delete().eq('endpoint', endpoint);
      if (error) throw error;
      return reply(200, { success: true }, origin);
    }
    const keys = body?.subscription?.keys || {};
    const p256dh = typeof keys.p256dh === 'string' ? keys.p256dh : '';
    const auth = typeof keys.auth === 'string' ? keys.auth : '';
    if (action !== 'subscribe' || !/^[A-Za-z0-9_-]{80,120}$/.test(p256dh) || !/^[A-Za-z0-9_-]{16,64}$/.test(auth)) return reply(400, { success: false, error: 'Invalid subscription keys.' }, origin);
    const { error } = await admin.from('push_subscriptions').upsert({ endpoint, p256dh, auth, updated_at: new Date().toISOString() }, { onConflict: 'endpoint' });
    if (error) throw error;
    return reply(200, { success: true }, origin);
  } catch (error) {
    console.error('[manage-push-subscription]', error instanceof Error ? error.message : 'Unknown error');
    return reply(500, { success: false, error: 'Could not save the notification setting.' }, origin);
  }
});
