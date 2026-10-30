/**
 * Rádió69 × Zsiványok Podcast – válasz küldése közönségüzenetre.
 * Kizárólag érvényes Supabase Auth JWT-vel és chief_editor szerepkörrel használható.
 * A Resend és a Supabase kulcsok szerveroldali környezeti változókban maradnak.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = new Set([
  'https://radio69zsivanyok.hu',
  'https://www.radio69zsivanyok.hu',
]);

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

function response(status: number, payload: Record<string, unknown>, origin: string | null): Response {
  const headers = new Headers(JSON_HEADERS);
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\r\n?/g, '\n').trim().slice(0, maxLength);
}

function validEmail(value: string): boolean {
  return value.length <= 160 && /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value);
}

function escapeHtml(value: string): string {
  const map: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, (character) => map[character] ?? character);
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('Origin');

  if (request.method === 'OPTIONS') {
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return response(403, { ok: false, error: 'Origin not allowed.' }, null);
    }
    const headers = new Headers({
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    });
    if (origin) headers.set('Access-Control-Allow-Origin', origin);
    return new Response('ok', { status: 200, headers });
  }

  if (request.method !== 'POST') {
    return response(405, { ok: false, error: 'Csak POST kérés engedélyezett.' }, origin);
  }
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return response(403, { ok: false, error: 'A kérés forrása nem engedélyezett.' }, null);
  }

  const authorization = request.headers.get('Authorization') || '';
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || '';
  if (!bearer) {
    return response(401, { ok: false, error: 'A válasz küldéséhez be kell jelentkezni.' }, origin);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
    || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
    || '';
  const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
  const emailFrom = Deno.env.get('EMAIL_FROM') || '';
  const replyTo = Deno.env.get('NOTIFICATION_EMAIL') || 'zsivanyokpodcast@gmail.com';

  if (!supabaseUrl || !supabaseKey || !resendApiKey || !emailFrom) {
    console.error('[reply-audience-message] Required server configuration is missing.');
    return response(500, { ok: false, error: 'A válasz e-mail küldése nincs teljesen beállítva. Ellenőrizd a Supabase és Resend titkokat.' }, origin);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${bearer}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser(bearer);
    if (authError || !authData.user) {
      return response(401, { ok: false, error: 'A bejelentkezés lejárt. Lépj be újra az adminfelületre.' }, origin);
    }

    const { data: editor, error: editorError } = await supabase
      .from('editor_profiles')
      .select('user_id, role')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (editorError || editor?.role !== 'chief_editor') {
      return response(403, { ok: false, error: 'Ehhez a művelethez főszerkesztői jogosultság szükséges.' }, origin);
    }

    let input: Record<string, unknown>;
    try {
      input = await request.json();
    } catch {
      return response(400, { ok: false, error: 'A kérés tartalma nem érvényes JSON.' }, origin);
    }

    const audienceMessageId = cleanText(input.audienceMessageId, 80);
    const subject = cleanText(input.subject, 180);
    const body = cleanText(input.message, 5000);

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(audienceMessageId)) {
      return response(400, { ok: false, error: 'Érvénytelen üzenetazonosító.' }, origin);
    }
    if (subject.length < 3 || body.length < 5) {
      return response(400, { ok: false, error: 'A tárgy és a válasz szövege kötelező.' }, origin);
    }

    const { data: sourceMessage, error: sourceError } = await supabase
      .from('audience_messages')
      .select('id,email,name,subject,message,status')
      .eq('id', audienceMessageId)
      .maybeSingle();

    if (sourceError || !sourceMessage) {
      return response(404, { ok: false, error: 'A kiválasztott közönségüzenet nem található vagy nem hozzáférhető.' }, origin);
    }

    const recipient = cleanText(sourceMessage.email, 160);
    if (!validEmail(recipient)) {
      return response(400, { ok: false, error: 'Ehhez az üzenethez nincs érvényes e-mail-cím megadva.' }, origin);
    }
    if (!validEmail(replyTo)) {
      return response(500, { ok: false, error: 'A szerkesztőségi válaszcím beállítása érvénytelen.' }, origin);
    }

    const { data: replyRecord, error: insertError } = await supabase
      .from('audience_message_replies')
      .insert({
        audience_message_id: audienceMessageId,
        author_user_id: authData.user.id,
        recipient_email: recipient,
        subject,
        body,
        status: 'sending',
      })
      .select('id')
      .single();

    if (insertError || !replyRecord) {
      console.error('[reply-audience-message] Could not create reply history row.', insertError?.code || 'unknown');
      return response(500, { ok: false, error: 'Nem sikerült előkészíteni a válaszelőzményt. Futtasd le a válaszfunkció SQL-beállítását.' }, origin);
    }

    const safeFrom = emailFrom.includes('<') ? emailFrom : `Rádió69 × Zsiványok Podcast <${emailFrom}>`;
    const visitorName = cleanText(sourceMessage.name, 100);
    const html = `<!doctype html>
<html lang="hu"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f5f3f8;color:#211b2d;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #e8e4ef;border-radius:16px;overflow:hidden">
    <header style="padding:24px;background:#171426;color:#fff">
      <p style="margin:0 0 8px;color:#c6b5ec;font-size:11px;font-weight:bold;letter-spacing:2px">RÁDIÓ69 × ZSIVÁNYOK PODCAST</p>
      <h1 style="margin:0;font-size:23px;line-height:1.3">Válasz a megkeresésedre</h1>
    </header>
    <main style="padding:24px;font-size:14px;line-height:1.8">
      <p style="margin-top:0">${visitorName ? `Kedves ${escapeHtml(visitorName)}!` : 'Kedves Érdeklődő!'}</p>
      <div style="white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(body)}</div>
      <p style="margin:24px 0 0">Üdvözlettel,<br><strong>Rádió69 × Zsiványok Podcast szerkesztőség</strong></p>
    </main>
  </div>
</body></html>`;

    let providerResponse: Response;
    let providerData: Record<string, unknown> = {};
    try {
      providerResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `audience-reply-${replyRecord.id}`,
        },
        body: JSON.stringify({
          from: safeFrom,
          to: [recipient],
          reply_to: replyTo,
          subject,
          html,
          text: `${visitorName ? `Kedves ${visitorName}!` : 'Kedves Érdeklődő!'}\n\n${body}\n\nÜdvözlettel,\nRádió69 × Zsiványok Podcast szerkesztőség`,
        }),
        signal: AbortSignal.timeout(20000),
      });
      providerData = await providerResponse.json().catch(() => ({}));
    } catch (error) {
      console.error('[reply-audience-message] Resend request failed.', error instanceof Error ? error.message : 'unknown');
      await supabase.from('audience_message_replies').update({
        status: 'failed', error_message: 'A levélküldő szolgáltatás nem volt elérhető.',
      }).eq('id', replyRecord.id);
      return response(502, { ok: false, error: 'A levélküldő szolgáltatás jelenleg nem érhető el. A próbálkozást rögzítettük.' }, origin);
    }

    if (!providerResponse.ok) {
      console.error('[reply-audience-message] Resend rejected the reply.', providerResponse.status);
      await supabase.from('audience_message_replies').update({
        status: 'failed', error_message: `A levélküldő szolgáltatás elutasította a kérést (HTTP ${providerResponse.status}).`,
      }).eq('id', replyRecord.id);
      return response(502, { ok: false, error: `A Resend elutasította a levelet (HTTP ${providerResponse.status}). Ellenőrizd a feladó címet és a Resend-fiókot.` }, origin);
    }

    const resendEmailId = typeof providerData.id === 'string' ? providerData.id : null;
    const { error: historyUpdateError } = await supabase
      .from('audience_message_replies')
      .update({ status: 'sent', sent_at: new Date().toISOString(), resend_email_id: resendEmailId, error_message: null })
      .eq('id', replyRecord.id);

    if (historyUpdateError) {
      console.error('[reply-audience-message] Email sent, but reply history update failed.', historyUpdateError.code);
    }

    const { error: statusError } = await supabase
      .from('audience_messages')
      .update({ status: 'in_progress' })
      .eq('id', audienceMessageId)
      .eq('status', 'new');
    if (statusError) {
      console.error('[reply-audience-message] Reply sent, but message status could not be advanced.', statusError.code);
    }

    return response(200, {
      ok: true,
      emailId: resendEmailId,
      historySaved: !historyUpdateError,
      status: sourceMessage.status === 'new' ? 'in_progress' : sourceMessage.status,
    }, origin);
  } catch (error) {
    console.error('[reply-audience-message] Unexpected error.', error instanceof Error ? error.message : 'unknown');
    return response(500, { ok: false, error: 'Váratlan hiba történt a válasz küldésekor.' }, origin);
  }
});
