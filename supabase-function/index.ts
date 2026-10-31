// Rádió69 Statistics — secured GA4 Data API proxy for the internal dashboard.
// Keep Supabase JWT verification enabled for this function.

const ALLOWED_ORIGINS = new Set([
  'https://radio69zsivanyok.hu',
  'https://www.radio69zsivanyok.hu'
]);

function jsonResponse(body: unknown, status = 200, origin = 'https://radio69zsivanyok.hu') {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Vary': 'Origin'
    }
  });
}

function getKeyFromEnv(jsonName: string, legacyName: string): string {
  const legacy = Deno.env.get(legacyName) || '';
  if (legacy) return legacy;
  const raw = Deno.env.get(jsonName) || '';
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    return String(parsed.default || Object.values(parsed)[0] || '');
  } catch {
    return '';
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function jsonBase64Url(value: unknown): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function privateKeyBytes(pemValue: string): Uint8Array {
  const pem = pemValue.replace(/\\n/g, '\n');
  const base64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  if (!base64) throw new Error('A Google szolgáltatásfiók privát kulcsa üres vagy hibás.');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getGoogleAccessToken(serviceAccount: Record<string, unknown>): Promise<string> {
  const clientEmail = String(serviceAccount.client_email || '');
  const tokenUri = String(serviceAccount.token_uri || 'https://oauth2.googleapis.com/token');
  const privateKey = String(serviceAccount.private_key || '');
  if (!clientEmail || !privateKey || !tokenUri.startsWith('https://')) {
    throw new Error('A Google szolgáltatásfiók JSON hiányos. Ellenőrizd a client_email, private_key és token_uri mezőket.');
  }

  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${jsonBase64Url({ alg: 'RS256', typ: 'JWT' })}.${jsonBase64Url({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: tokenUri,
    iat: now,
    exp: now + 3600
  })}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)));
  const assertion = `${unsigned}.${toBase64Url(signature)}`;

  const tokenResponse = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  const tokenPayload = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    throw new Error(`A Google hozzáférési token nem kérhető le (${tokenResponse.status}): ${String(tokenPayload.error_description || tokenPayload.error || 'ismeretlen OAuth-hiba').slice(0, 280)}`);
  }
  return String(tokenPayload.access_token);
}

async function runReport(
  propertyId: string,
  accessToken: string,
  days: number,
  dimensions: string[],
  metrics: string[],
  limit = 100,
  orderBy?: { dimension?: string; metric?: string; desc?: boolean }
) {
  const requestBody: Record<string, unknown> = {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'yesterday' }],
    metrics: metrics.map(name => ({ name })),
    limit: String(limit)
  };
  if (dimensions.length) requestBody.dimensions = dimensions.map(name => ({ name }));
  if (orderBy?.dimension) requestBody.orderBys = [{ dimension: { dimensionName: orderBy.dimension }, desc: Boolean(orderBy.desc) }];
  if (orderBy?.metric) requestBody.orderBys = [{ metric: { metricName: orderBy.metric }, desc: Boolean(orderBy.desc) }];

  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error?.status || `HTTP ${response.status}`;
    throw new Error(`Google Analytics Data API hiba (${response.status}): ${String(message).slice(0, 380)}`);
  }
  return payload;
}

function rowsToObjects(payload: Record<string, any>): Record<string, string>[] {
  const dimensionHeaders = Array.isArray(payload.dimensionHeaders) ? payload.dimensionHeaders : [];
  const metricHeaders = Array.isArray(payload.metricHeaders) ? payload.metricHeaders : [];
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  return rows.map((row: Record<string, any>) => {
    const result: Record<string, string> = {};
    (row.dimensionValues || []).forEach((value: Record<string, string>, index: number) => {
      const name = dimensionHeaders[index]?.name;
      if (name) result[name] = String(value.value ?? '');
    });
    (row.metricValues || []).forEach((value: Record<string, string>, index: number) => {
      const name = metricHeaders[index]?.name;
      if (name) result[name] = String(value.value ?? '0');
    });
    return result;
  });
}

async function countRows(
  supabaseUrl: string,
  serviceKey: string,
  table: string,
  filters: Record<string, string> = {}
): Promise<number | null> {
  const url = new URL(`${supabaseUrl}/rest/v1/${table}`);
  url.searchParams.set('select', 'id');
  Object.entries(filters).forEach(([key, value]) => url.searchParams.set(key, value));
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'count=exact',
        Range: '0-0'
      }
    });
    if (!response.ok) return null;
    const range = response.headers.get('content-range') || '';
    const match = range.match(/\/(\d+)$/);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  const requestOrigin = req.headers.get('origin') || '';
  const responseOrigin = ALLOWED_ORIGINS.has(requestOrigin) ? requestOrigin : 'https://radio69zsivanyok.hu';

  if (req.method === 'OPTIONS') {
    if (requestOrigin && !ALLOWED_ORIGINS.has(requestOrigin)) return jsonResponse({ error: 'Tiltott kérésforrás.' }, 403);
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': responseOrigin,
        'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Vary': 'Origin'
      }
    });
  }
  if (req.method !== 'POST') return jsonResponse({ error: 'Csak POST kérés engedélyezett.' }, 405, responseOrigin);
  if (requestOrigin && !ALLOWED_ORIGINS.has(requestOrigin)) return jsonResponse({ error: 'Tiltott kérésforrás.' }, 403, responseOrigin);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const publishableKey = getKeyFromEnv('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');
    const secretKey = getKeyFromEnv('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
    const propertyId = Deno.env.get('GA4_PROPERTY_ID') || '';
    const serviceAccountRaw = Deno.env.get('GA4_SERVICE_ACCOUNT_JSON') || '';

    if (!supabaseUrl || !publishableKey || !secretKey) {
      return jsonResponse({ error: 'A Supabase Edge Function környezeti kulcsai hiányosak. Ellenőrizd a Supabase beépített API-kulcsait.' }, 500, responseOrigin);
    }
    if (!/^\d{5,20}$/.test(propertyId)) {
      return jsonResponse({ error: 'A GA4_PROPERTY_ID hiányzik vagy nem megfelelő. A számszerű GA4 Property ID szükséges, nem a G- kezdetű Measurement ID.' }, 500, responseOrigin);
    }
    if (!serviceAccountRaw) {
      return jsonResponse({ error: 'A GA4_SERVICE_ACCOUNT_JSON titok nincs beállítva a Supabase Edge Function Secrets részében.' }, 500, responseOrigin);
    }

    const authorization = req.headers.get('authorization') || '';
    if (!authorization.startsWith('Bearer ')) return jsonResponse({ error: 'Bejelentkezés szükséges.' }, 401, responseOrigin);

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: publishableKey, Authorization: authorization }
    });
    if (!userResponse.ok) return jsonResponse({ error: 'A bejelentkezés lejárt. Lépj ki, majd jelentkezz be újra.' }, 401, responseOrigin);
    const authUser = await userResponse.json();
    if (!authUser?.id) return jsonResponse({ error: 'A bejelentkezett felhasználó nem ellenőrizhető.' }, 401, responseOrigin);

    const profileUrl = new URL(`${supabaseUrl}/rest/v1/editor_profiles`);
    profileUrl.searchParams.set('select', 'user_id,role,display_name');
    profileUrl.searchParams.set('user_id', `eq.${authUser.id}`);
    const profileResponse = await fetch(profileUrl, {
      headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` }
    });
    if (!profileResponse.ok) return jsonResponse({ error: 'Nem sikerült ellenőrizni a szerkesztői jogosultságot.' }, 500, responseOrigin);
    const profiles = await profileResponse.json();
    if (!Array.isArray(profiles) || profiles[0]?.role !== 'chief_editor') {
      return jsonResponse({ error: 'Ehhez a statisztikai központhoz főszerkesztői jogosultság szükséges.' }, 403, responseOrigin);
    }

    const body = await req.json().catch(() => ({}));
    const days = [7, 30, 90].includes(Number(body?.days)) ? Number(body.days) : 30;
    let serviceAccount: Record<string, unknown>;
    try {
      serviceAccount = JSON.parse(serviceAccountRaw);
    } catch {
      return jsonResponse({ error: 'A GA4_SERVICE_ACCOUNT_JSON nem érvényes JSON.' }, 500, responseOrigin);
    }
    if (serviceAccount.type !== 'service_account') {
      return jsonResponse({ error: 'A megadott Google JSON nem szolgáltatásfiók-kulcs.' }, 500, responseOrigin);
    }

    const accessToken = await getGoogleAccessToken(serviceAccount);
    const [summaryPayload, dailyPayload, pagesPayload, channelsPayload, eventsPayload] = await Promise.all([
      runReport(propertyId, accessToken, days, [], ['activeUsers', 'sessions', 'screenPageViews', 'engagementRate', 'bounceRate', 'averageSessionDuration', 'newUsers', 'eventCount'], 1),
      runReport(propertyId, accessToken, days, ['date'], ['activeUsers', 'sessions', 'screenPageViews'], 100, { dimension: 'date', desc: false }),
      runReport(propertyId, accessToken, days, ['pageTitle', 'pagePath'], ['screenPageViews', 'activeUsers'], 10, { metric: 'screenPageViews', desc: true }),
      runReport(propertyId, accessToken, days, ['sessionDefaultChannelGroup'], ['sessions', 'activeUsers'], 10, { metric: 'sessions', desc: true }),
      runReport(propertyId, accessToken, days, ['eventName'], ['eventCount'], 12, { metric: 'eventCount', desc: true })
    ]);

    const summaryRow = rowsToObjects(summaryPayload)[0] || {};
    const summary = Object.fromEntries(Object.entries(summaryRow).map(([key, value]) => [key, Number(value) || 0]));

    const countResults = await Promise.all([
      countRows(supabaseUrl, secretKey, 'articles', { status: 'eq.published' }),
      countRows(supabaseUrl, secretKey, 'audience_messages'),
      countRows(supabaseUrl, secretKey, 'audience_messages', { status: 'eq.new' }),
      countRows(supabaseUrl, secretKey, 'audience_message_replies', { status: 'eq.sent' })
    ]);

    return jsonResponse({
      ok: true,
      rangeDays: days,
      generatedAt: new Date().toISOString(),
      summary,
      daily: rowsToObjects(dailyPayload),
      topPages: rowsToObjects(pagesPayload),
      channels: rowsToObjects(channelsPayload),
      events: rowsToObjects(eventsPayload),
      internal: {
        publishedArticles: countResults[0],
        messages: countResults[1],
        newMessages: countResults[2],
        sentReplies: countResults[3]
      }
    }, 200, responseOrigin);
  } catch (error) {
    console.error('Rádió69 statisztikai funkció hiba:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Ismeretlen szerverhiba történt.' }, 500, responseOrigin);
  }
});
