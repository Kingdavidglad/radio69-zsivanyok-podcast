// Radio69 – GA4 lekérdező. Csak bejelentkezett főszerkesztő férhet hozzá.
const enc = new TextEncoder();
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const ALLOWED = new Set(["https://radio69zsivanyok.hu", "https://www.radio69zsivanyok.hu", "https://kingdavidglad.github.io"]);
function b64url(bytes: Uint8Array): string { let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"); }
function reply(data: unknown, status = 200, origin: string | null = null): Response {
  const h = new Headers({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", Vary: "Origin", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" });
  if (origin && ALLOWED.has(origin)) h.set("Access-Control-Allow-Origin", origin);
  return new Response(JSON.stringify(data), { status, headers: h });
}
async function googleToken(raw: string): Promise<string> {
  let account: { client_email?: string; private_key?: string };
  try { account = JSON.parse(raw); } catch { throw new Error("A GOOGLE_SERVICE_ACCOUNT_JSON nem érvényes JSON."); }
  if (!account.client_email || !account.private_key) throw new Error("A JSON-ból hiányzik a client_email vagy a private_key.");
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(enc.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const body = b64url(enc.encode(JSON.stringify({ iss: account.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 })));
  const unsigned = `${head}.${body}`;
  const pem = account.private_key.replace(/\\n/g, "\n").replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const binary = atob(pem);
  const key = await crypto.subtle.importKey("pkcs8", Uint8Array.from(binary, c => c.charCodeAt(0)), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(unsigned)));
  const response = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${b64url(sig)}` }) });
  const token = await response.json().catch(() => ({}));
  if (!response.ok || !token.access_token) throw new Error(`Google token hiba (${response.status}).`);
  return token.access_token as string;
}
async function runReport(propertyId: string, accessToken: string, body: unknown) {
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const report = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Google Analytics API (${response.status}): ${report?.error?.message ?? "Ismeretlen hiba."}`);
  return report;
}
Deno.serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return origin && !ALLOWED.has(origin) ? reply({ error: "Nem engedélyezett webhely." }, 403) : reply({ ok: true }, 200, origin);
  if (req.method !== "POST") return reply({ error: "Nem támogatott HTTP-metódus." }, 405, origin);
  if (origin && !ALLOWED.has(origin)) return reply({ error: "Nem engedélyezett webhely." }, 403);
  try {
    const auth = req.headers.get("authorization"), base = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!auth?.startsWith("Bearer ") || !base || !anon) return reply({ success: false, error: "Bejelentkezés szükséges." }, 401, origin);
    const headers = { apikey: anon, Authorization: auth };
    const userRes = await fetch(`${base}/auth/v1/user`, { headers });
    const user = await userRes.json().catch(() => ({}));
    if (!userRes.ok || !user.id) return reply({ success: false, error: "Érvényes szerkesztői bejelentkezés szükséges." }, 401, origin);
    const profileRes = await fetch(`${base}/rest/v1/editor_profiles?select=role&user_id=eq.${encodeURIComponent(user.id)}&limit=1`, { headers });
    const profiles = await profileRes.json().catch(() => []);
    if (!profileRes.ok || profiles?.[0]?.role !== "chief_editor") return reply({ success: false, error: "Ehhez a statisztikához főszerkesztői jogosultság szükséges." }, 403, origin);
    const raw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON"), propertyId = Deno.env.get("GA4_PROPERTY_ID");
    if (!raw || !propertyId || !/^\d+$/.test(propertyId)) return reply({ success: false, error: "Hiányzik vagy hibás a GA4 Secret-beállítása." }, 500, origin);
    const access = await googleToken(raw);
    const [totals, trend] = await Promise.all([
      runReport(propertyId, access, { dateRanges: [{ startDate: "28daysAgo", endDate: "today" }], metrics: [{ name: "activeUsers" }, { name: "newUsers" }, { name: "sessions" }, { name: "screenPageViews" }, { name: "engagementRate" }, { name: "averageSessionDuration" }] }),
      runReport(propertyId, access, { dateRanges: [{ startDate: "28daysAgo", endDate: "today" }], dimensions: [{ name: "date" }], metrics: [{ name: "screenPageViews" }], orderBys: [{ dimension: { dimensionName: "date" } }] })
    ]);
    const v = totals?.rows?.[0]?.metricValues?.map((x: { value?: string }) => x.value ?? "0") ?? [];
    const dailyPageViews = (trend?.rows ?? []).map((row: any) => ({ date: row.dimensionValues?.[0]?.value ?? "", pageViews: Number(row.metricValues?.[0]?.value ?? 0) }));
    return reply({ success: true, propertyId, period: "last_28_days", generatedAt: new Date().toISOString(), metrics: { activeUsers: Number(v[0] ?? 0), newUsers: Number(v[1] ?? 0), sessions: Number(v[2] ?? 0), pageViews: Number(v[3] ?? 0), engagementRate: Number(v[4] ?? 0), averageSessionDuration: Number(v[5] ?? 0) }, dailyPageViews }, 200, origin);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ismeretlen hiba történt.";
    console.error("Radio69 GA4 error:", message);
    return reply({ success: false, error: message }, 500, origin);
  }
});
