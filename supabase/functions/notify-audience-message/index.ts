/**
 * Rádió69 × Zsiványok Podcast — értesítés új közönségüzenetről.
 * Supabase Database Webhook hívja meg minden új public.audience_messages rekord után.
 * A Resend API-kulcs és a webhooktitok kizárólag Supabase Function Secrets-ben tárolható.
 */
const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const ALLOWED_TYPES: Record<string, string> = {
  topic_suggestion: 'Témát javasolok',
  question: 'Kérdést küldök a műsorvezetőknek',
  guest_recommendation: 'Vendéget ajánlok a podcastbe',
  editorial_message: 'Helyesbítés vagy egyéb üzenet',
};

function respond(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function cleanText(value: unknown, maxLength = 1500): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\r\n?/g, '\n').trim().slice(0, maxLength);
}

function escapeHtml(value: unknown): string {
  const replacements: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return String(value ?? '').replace(/[&<>"']/g, (character) => replacements[character] ?? character);
}

function validEmail(value: string): boolean {
  return value.length <= 160 && /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value);
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return respond(405, { ok: false, error: 'Method not allowed.' });
  }

  const expectedSecret = Deno.env.get('AUDIENCE_WEBHOOK_SECRET') || '';
  const suppliedSecret = request.headers.get('x-audience-webhook-secret') || '';
  if (!expectedSecret || !suppliedSecret || suppliedSecret !== expectedSecret) {
    return respond(401, { ok: false, error: 'Unauthorized.' });
  }

  let event;
  try {
    event = await request.json();
  } catch {
    return respond(400, { ok: false, error: 'Invalid JSON.' });
  }

  if (
    event.type !== 'INSERT' ||
    event.schema !== 'public' ||
    event.table !== 'audience_messages' ||
    !event.record || typeof event.record !== 'object'
  ) {
    return respond(400, { ok: false, error: 'Unexpected database webhook payload.' });
  }

  const record = event.record;
  const messageType = cleanText(record.message_type, 40);
  const messageLabel = Object.prototype.hasOwnProperty.call(ALLOWED_TYPES, messageType)
    ? ALLOWED_TYPES[messageType]
    : '';
  const name = cleanText(record.name, 100) || 'Nincs megadva';
  const email = cleanText(record.email, 160);
  const subjectDetail = cleanText(record.subject, 160) || 'Nincs megadva';
  const message = cleanText(record.message, 1500);
  const createdAtRaw = cleanText(record.created_at, 80);
  const messageId = cleanText(record.id, 80);

  if (
    !messageLabel ||
    message.length < 10 ||
    record.privacy_acknowledged !== true ||
    record.status !== 'new'
  ) {
    return respond(400, { ok: false, error: 'The inserted audience message is invalid.' });
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
  const from = Deno.env.get('EMAIL_FROM') || '';
  const to = Deno.env.get('NOTIFICATION_EMAIL') || 'zsivanyokpodcast@gmail.com';

  if (!resendApiKey || !from || !validEmail(to)) {
    console.error('[notify-audience-message] Required mail configuration is missing or invalid.');
    return respond(500, { ok: false, error: 'Email service is not configured.' });
  }

  const parsedDate = createdAtRaw ? new Date(createdAtRaw) : new Date();
  const createdAt = Number.isNaN(parsedDate.getTime())
    ? new Date().toLocaleString('hu-HU', { timeZone: 'Europe/Budapest' })
    : parsedDate.toLocaleString('hu-HU', { timeZone: 'Europe/Budapest' });
  const replyEmail = validEmail(email) ? email : '';
  const subject = `Új közönségüzenet – ${messageLabel}`;

  const fields = [
    ['Üzenet típusa', messageLabel],
    ['Név', name],
    ['E-mail-cím', replyEmail || 'Nincs megadva'],
    ['Téma / vendég neve', subjectDetail],
    ['Beküldés időpontja', createdAt],
    ['Azonosító', messageId || 'Nincs megadva'],
  ];

  const rowsHtml = fields.map(([label, value]) =>
    `<tr><th align="left" style="padding:9px 12px;border-bottom:1px solid #e8e4ef;color:#625b70;font-size:13px;vertical-align:top">${escapeHtml(label)}</th><td style="padding:9px 12px;border-bottom:1px solid #e8e4ef;color:#211b2d;font-size:13px;vertical-align:top">${escapeHtml(value)}</td></tr>`
  ).join('');

  const html = `<!doctype html>
<html lang="hu">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f5f3f8;font-family:Arial,Helvetica,sans-serif;color:#211b2d">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e8e4ef;border-radius:16px;overflow:hidden">
    <div style="padding:24px;background:#171426;color:#ffffff">
      <p style="margin:0 0 8px;color:#c6b5ec;font-size:11px;font-weight:bold;letter-spacing:2px">RÁDIÓ69 × ZSIVÁNYOK PODCAST</p>
      <h1 style="margin:0;font-size:24px;line-height:1.25">Új közönségüzenet érkezett</h1>
    </div>
    <div style="padding:24px">
      <table role="presentation" style="width:100%;border-collapse:collapse">${rowsHtml}</table>
      <h2 style="margin:24px 0 10px;font-size:17px">Üzenet</h2>
      <div style="padding:16px;background:#f7f5fb;border:1px solid #e8e4ef;border-radius:10px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.65;font-size:14px">${escapeHtml(message)}</div>
      <p style="margin:22px 0 0;color:#746d80;font-size:11px;line-height:1.6">Ez automatikus értesítés a Rádió69 × Zsiványok Podcast közönségkapcsolati űrlapjáról.</p>
    </div>
  </div>
</body>
</html>`;

  const text = [
    'Új közönségüzenet érkezett – Rádió69 × Zsiványok Podcast',
    '',
    ...fields.map(([label, value]) => `${label}: ${value}`),
    '',
    'Üzenet:',
    message,
  ].join('\n');

  const emailPayload: Record<string, unknown> = {
    from,
    to: [to],
    subject,
    html,
    text,
  };
  if (replyEmail) emailPayload.reply_to = [replyEmail];

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    };
    if (messageId) headers['Idempotency-Key'] = `audience-message-${messageId}`;

    const mailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify(emailPayload),
      signal: AbortSignal.timeout(20000),
    });

    if (!mailResponse.ok) {
      const providerMessage = (await mailResponse.text().catch(() => '')).slice(0, 500);
      console.error('[notify-audience-message] Resend rejected the email.', mailResponse.status, providerMessage);
      return respond(502, { ok: false, error: 'The email provider rejected the notification.' });
    }

    const result = await mailResponse.json().catch(() => ({}));
    return respond(200, { ok: true, emailId: typeof result?.id === 'string' ? result.id : null });
  } catch (error) {
    console.error('[notify-audience-message] Email request failed.', error instanceof Error ? error.message : 'Unknown error');
    return respond(502, { ok: false, error: 'Could not send the email notification.' });
  }
});
