import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
const cors = { 'Access-Control-Allow-Origin': 'https://radio69zsivanyok.hu', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: cors });
const allowedHost = (host: string) => host === 'fcm.googleapis.com' || host === 'web.push.apple.com' || host.endsWith('.push.services.mozilla.com') || host.endsWith('.notify.windows.com');
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { success: false, error: 'Method not allowed.' });
  try {
    const url = Deno.env.get('SUPABASE_URL') || '', serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || '';
    const publicKey = Deno.env.get('PUSH_VAPID_PUBLIC_KEY') || '', privateKey = Deno.env.get('PUSH_VAPID_PRIVATE_KEY') || '';
    const subject = Deno.env.get('PUSH_VAPID_SUBJECT') || 'mailto:zsivanyokpodcast@gmail.com';
    const auth = req.headers.get('authorization') || '', token = auth.replace(/^Bearer\s+/i, '');
    if (!url || !serviceKey || !anonKey || !publicKey || !privateKey || !token) return json(500, { success: false, error: 'Server configuration or editor session is missing.' });
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) return json(401, { success: false, error: 'Editor login required.' });
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile } = await admin.from('editor_profiles').select('role').eq('user_id', userData.user.id).maybeSingle();
    if (profile?.role !== 'chief_editor') return json(403, { success: false, error: 'Only the chief editor can publish notifications.' });
    const { articleId } = await req.json();
    if (typeof articleId !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(articleId)) return json(400, { success: false, error: 'Invalid article id.' });
    const { data: article, error: articleError } = await admin.from('articles').select('id,title,excerpt,status').eq('id', articleId).maybeSingle();
    if (articleError || !article || article.status !== 'published') return json(404, { success: false, error: 'Published article not found.' });
    const { data: subscriptions, error: listError } = await admin.from('push_subscriptions').select('endpoint,p256dh,auth').limit(1000);
    if (listError) throw listError;
    if (!subscriptions?.length) return json(200, { success: true, sent: 0, expired: 0, message: 'No subscribers yet.' });
    webpush.setVapidDetails(subject, publicKey, privateKey);
    const payload = JSON.stringify({ title: 'Új cikk a Rádió69-en', body: String(article.title || article.excerpt || 'Új olvasnivaló érkezett.').slice(0, 140), url: `https://radio69zsivanyok.hu/cikk.html?id=${encodeURIComponent(article.id)}`, icon: '/assets/pwa-192.png', badge: '/assets/favicon.png', tag: `radio69-article-${article.id}` });
    let sent = 0, expired = 0, failed = 0;
    for (let i = 0; i < subscriptions.length; i += 25) {
      await Promise.all(subscriptions.slice(i, i + 25).map(async (item) => {
        try {
          const host = new URL(item.endpoint).hostname.toLowerCase();
          if (!allowedHost(host)) throw Object.assign(new Error('Unsupported endpoint'), { statusCode: 410 });
          await webpush.sendNotification({ endpoint: item.endpoint, keys: { p256dh: item.p256dh, auth: item.auth } }, payload, { TTL: 86400, urgency: 'normal' });
          sent++;
        } catch (error) {
          const code = Number((error as { statusCode?: number })?.statusCode || 0);
          if (code === 404 || code === 410) { await admin.from('push_subscriptions').delete().eq('endpoint', item.endpoint); expired++; }
          else { failed++; console.warn('[send-article-push] Delivery failed:', code || 'unknown'); }
        }
      }));
    }
    return json(200, { success: true, sent, expired, failed });
  } catch (error) {
    console.error('[send-article-push]', error instanceof Error ? error.message : 'Unknown error');
    return json(500, { success: false, error: 'Could not send the article notification.' });
  }
});
