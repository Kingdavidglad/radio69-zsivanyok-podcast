import webPushModule from 'web-push';
import scheduleJson from '../_shared/show-schedule.json' with { type: 'json' };

type RadioShow = {
  title: string;
  host?: string;
  description?: string;
  season?: { start: string; end: string; label?: string };
};
type ScheduleEntry = { time: string; showId: string; repeat?: boolean };
type ScheduleDay = { day: number; name: string; entries: ScheduleEntry[] };
type RadioSchedule = {
  timezone: string;
  shows: Record<string, RadioShow>;
  days: ScheduleDay[];
};
const schedule = scheduleJson as RadioSchedule;

const webpush = webPushModule as unknown as {
  sendNotification: (
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
    options: Record<string, unknown>
  ) => Promise<{ statusCode?: number }>;
};

const WEEKDAY_NUMBER: Record<string, number> = {
  Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7
};
const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: schedule.timezone,
  weekday: 'short',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  show_ids: string[];
}

interface DueShow {
  date: string;
  time: string;
  dayName: string;
  showId: string;
  show: RadioShow;
}

function getLocalParts(date: Date) {
  const parts = Object.fromEntries(DATE_FORMATTER.formatToParts(date).map(part => [part.type, part.value]));
  return {
    weekday: WEEKDAY_NUMBER[parts.weekday] || 0,
    dayName: parts.weekday,
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    monthDay: `${parts.month}-${parts.day}`
  };
}

function isSeasonActive(season: { start: string; end: string } | undefined, monthDay: string) {
  if (!season) return true;
  return season.start <= season.end
    ? monthDay >= season.start && monthDay <= season.end
    : monthDay >= season.start || monthDay <= season.end;
}

function dueShows(now: Date): DueShow[] {
  // A 15 perces pont az első küldési kísérlet; a 14 perces pont csak sikertelen küldésnél újrapróbálás.
  const candidates = new Map<string, DueShow>();
  for (const leadMinutes of [15, 14]) {
    const local = getLocalParts(new Date(now.getTime() + leadMinutes * 60_000));
    const day = schedule.days.find(item => item.day === local.weekday);
    if (!day) continue;

    for (const entry of day.entries) {
      if (entry.time !== local.time) continue;
      const show = schedule.shows[entry.showId];
      if (!show || !isSeasonActive(show.season, local.monthDay)) continue;
      const key = `${entry.showId}|${local.date}|${entry.time}`;
      candidates.set(key, {
        date: local.date,
        time: entry.time,
        dayName: day.name,
        showId: entry.showId,
        show
      });
    }
  }
  return [...candidates.values()];
}

function getCredentials() {
  const url = Deno.env.get('SUPABASE_URL');
  let serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY');
  if (!serviceKey) {
    try { serviceKey = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default || ''; } catch (_) { /* legacy key path */ }
  }
  const publicKey = Deno.env.get('RADIO69_VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('RADIO69_VAPID_PRIVATE_KEY');
  const cronSecret = Deno.env.get('RADIO69_CRON_SECRET');
  const subject = Deno.env.get('RADIO69_VAPID_SUBJECT') || 'mailto:info@radio69zsivanyok.hu';
  if (!url || !serviceKey || !publicKey || !privateKey || !cronSecret) {
    throw new Error('Hiányzik egy vagy több Supabase/Rádió69 push titok.');
  }
  return { url: url.replace(/\/$/, ''), serviceKey, publicKey, privateKey, cronSecret, subject };
}

function dbHeaders(serviceKey: string): Record<string, string> {
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


async function getActiveSubscriptions(url: string, serviceKey: string): Promise<PushSubscriptionRow[]> {
  const allRows: PushSubscriptionRow[] = [];
  const pageSize = 500;
  let offset = 0;

  while (true) {
    const query = new URLSearchParams({
      active: 'eq.true',
      select: 'id,endpoint,p256dh,auth,show_ids',
      order: 'id.asc',
      limit: String(pageSize),
      offset: String(offset)
    });
    const response = await fetch(`${url}/rest/v1/radio69_show_push_subscriptions?${query}`, {
      headers: dbHeaders(serviceKey)
    });
    if (!response.ok) {
      throw new Error(`Nem sikerült lekérni az előfizetéseket (${response.status}).`);
    }
    const batch = await response.json() as PushSubscriptionRow[];
    allRows.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return allRows;
}

async function claimDelivery(url: string, serviceKey: string, subscriptionId: string, show: DueShow) {
  const query = new URLSearchParams({ on_conflict: 'subscription_id,show_id,event_date,start_time' });
  const response = await fetch(`${url}/rest/v1/radio69_show_push_deliveries?${query}`, {
    method: 'POST',
    headers: {
      ...dbHeaders(serviceKey),
      Prefer: 'resolution=ignore-duplicates,return=representation'
    },
    body: JSON.stringify({
      subscription_id: subscriptionId,
      show_id: show.showId,
      event_date: show.date,
      start_time: `${show.time}:00`
    })
  });
  if (!response.ok) throw new Error(`Kézbesítési zárolási hiba (${response.status}): ${(await response.text()).slice(0, 250)}`);
  const rows = await response.json();
  return Array.isArray(rows) && rows.length > 0;
}

async function deleteDeliveryClaim(url: string, serviceKey: string, subscriptionId: string, show: DueShow) {
  const query = new URLSearchParams({
    subscription_id: `eq.${subscriptionId}`,
    show_id: `eq.${show.showId}`,
    event_date: `eq.${show.date}`,
    start_time: `eq.${show.time}:00`
  });
  await fetch(`${url}/rest/v1/radio69_show_push_deliveries?${query}`, {
    method: 'DELETE', headers: dbHeaders(serviceKey)
  });
}

async function removeSubscription(url: string, serviceKey: string, subscriptionId: string) {
  const query = new URLSearchParams({ id: `eq.${subscriptionId}` });
  await fetch(`${url}/rest/v1/radio69_show_push_subscriptions?${query}`, {
    method: 'DELETE', headers: dbHeaders(serviceKey)
  });
}

async function cleanupOldDeliveries(url: string, serviceKey: string, now: Date) {
  // A kézbesítési napló csak a duplikált értesítések elkerüléséhez kell; 30 napnál régebbi
  // technikai rekordokat naponta egyszer eltávolítjuk.
  if (now.getUTCHours() !== 3 || now.getUTCMinutes() !== 0) return;
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30))
    .toISOString().slice(0, 10);
  const query = new URLSearchParams({ event_date: `lt.${cutoff}` });
  const response = await fetch(`${url}/rest/v1/radio69_show_push_deliveries?${query}`, {
    method: 'DELETE', headers: dbHeaders(serviceKey)
  });
  if (!response.ok) throw new Error(`A régi kézbesítési napló törlése sikertelen (${response.status}).`);
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  try {
    const config = getCredentials();
    const suppliedSecret = req.headers.get('x-radio69-cron-secret') || '';
    if (!suppliedSecret || suppliedSecret !== config.cronSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    try { await cleanupOldDeliveries(config.url, config.serviceKey, now); }
    catch (cleanupError) { console.error('Delivery log cleanup failed:', cleanupError); }

    const showsDue = dueShows(now);
    if (!showsDue.length) {
      return Response.json({ ok: true, matchedShows: 0, subscriptions: 0, sent: 0 });
    }

    const subscriptions = await getActiveSubscriptions(config.url, config.serviceKey);
    if (!subscriptions.length) {
      return Response.json({ ok: true, matchedShows: showsDue.length, subscriptions: 0, sent: 0 });
    }

    const vapidDetails = {
      subject: config.subject,
      publicKey: config.publicKey,
      privateKey: config.privateKey
    };
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const subscription of subscriptions) {
      const selected = new Set(Array.isArray(subscription.show_ids) ? subscription.show_ids : []);
      for (const show of showsDue) {
        if (!selected.has(show.showId)) continue;

        const claimed = await claimDelivery(config.url, config.serviceKey, subscription.id, show);
        if (!claimed) {
          skipped++;
          continue;
        }

        const hostText = show.show.host ? ` · Műsorvezető: ${show.show.host}` : '';
        const payload = {
          title: `${show.show.title} – 15 perc múlva kezdődik!`,
          body: `${show.dayName}, ${show.time}${hostText}. Hallgasd élőben a Rádió69-et!`,
          showId: show.showId,
          url: 'https://radio69zsivanyok.hu/musoraink.html#weeklyScheduleTitle',
          tag: `${show.showId}-${show.date.replace(/-/g, '')}-${show.time.replace(':', '')}`,
          timestamp: Date.now()
        };

        try {
          await webpush.sendNotification(
            { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
            JSON.stringify(payload),
            {
              vapidDetails,
              TTL: 900,
              urgency: 'high',
              topic: payload.tag.slice(0, 32)
            }
          );
          sent++;
        } catch (error) {
          failed++;
          const statusCode = Number((error as { statusCode?: number })?.statusCode || 0);
          console.error('Push delivery failed:', show.showId, statusCode, error);
          if (statusCode === 404 || statusCode === 410) {
            await removeSubscription(config.url, config.serviceKey, subscription.id);
          } else {
            // Sikertelen kézbesítésnél a 14 perces ellenőrzés még újrapróbálhatja.
            await deleteDeliveryClaim(config.url, config.serviceKey, subscription.id, show);
          }
        }
      }
    }

    return Response.json({
      ok: true,
      matchedShows: showsDue.length,
      subscriptions: subscriptions.length,
      sent,
      failed,
      duplicateOrUnselected: skipped
    });
  } catch (error) {
    console.error('radio69-show-reminders error:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
});
