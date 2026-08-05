import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Rate limiting
//
// Serverless functions are stateless between invocations, so an in-memory
// counter would not survive across requests (or across regions). Upstash's
// Redis is REST-based specifically so it works from short-lived functions
// like this one. Configure via Vercel's dashboard → Storage → Upstash
// integration, which populates KV_REST_API_URL / KV_REST_API_TOKEN for you.
// (Not UPSTASH_REDIS_REST_URL/TOKEN — those are the names used only when
// connecting an Upstash account directly, outside Vercel's own integration.)
// ---------------------------------------------------------------------------
const kvUrl = process.env.KV_REST_API_URL;
const kvToken = process.env.KV_REST_API_TOKEN;
if (!kvUrl || !kvToken) {
  throw new Error('KV_REST_API_URL or KV_REST_API_TOKEN is not configured');
}
const redis = new Redis({ url: kvUrl, token: kvToken });
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '10 m'), // 5 submissions / 10 min / IP
  analytics: true,
  prefix: 'waitlist',
});

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  // Honeypot: a field real users never see or fill, but naive bots that
  // auto-fill every input often do. Any non-empty value here is a bot.
  company: z.string().max(0).optional(),
});

// www.tapaway.today is the actual Production origin — the bare apex domain
// redirects (308) to it, so that's what the browser's Origin header sends.
const ALLOWED_ORIGIN =
  process.env.ALLOWED_ORIGIN ?? 'https://www.tapaway.today';

function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ip = first?.split(',')[0]?.trim();
  return ip || req.socket?.remoteAddress || 'unknown';
}

async function upsertAutosendContact(email: string): Promise<boolean> {
  const apiKey = process.env.AUTOSEND_API_KEY;
  const listId = process.env.AUTOSEND_WAITLIST_LIST_ID;
  if (!apiKey || !listId) {
    throw new Error(
      'AUTOSEND_API_KEY or AUTOSEND_WAITLIST_LIST_ID is not configured',
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch('https://api.autosend.com/v1/contacts/email', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        listIds: [listId],
        contactProperties: { source: 'waitlist' },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error('AutoSend upsert failed', res.status, await res.text());
      return false;
    }
    return true;
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // CORS: browser JS on other origins can't read the response. This is not
  // an access-control mechanism by itself (a script can still call this
  // endpoint directly, bypassing CORS entirely) — it just stops other sites
  // from quietly embedding this form flow against visitors of their own
  // pages. Rate limiting below is the actual defense.
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  const ip = getClientIp(req);

  // Rate limit first — cheapest check, and it protects the AutoSend call
  // below from being used as an amplification target too.
  const { success: withinLimit } = await ratelimit.limit(ip);
  if (!withinLimit) {
    res.status(429).json({ ok: false, error: 'rate_limited' });
    return;
  }

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: 'invalid_input' });
    return;
  }
  const { email, company } = parsed.data;

  // Honeypot tripped: pretend success without actually doing anything, so
  // the bot has no error response to learn from and adapt to.
  if (company) {
    res.status(200).json({ ok: true });
    return;
  }

  try {
    const upserted = await upsertAutosendContact(email);
    if (!upserted) {
      res.status(502).json({ ok: false, error: 'upstream_error' });
      return;
    }
  } catch (err) {
    console.error('AutoSend request error', err);
    res.status(502).json({ ok: false, error: 'upstream_error' });
    return;
  }

  // Always the same generic success shape, whether this email was new or
  // already on the list — the response never reveals which, so the endpoint
  // can't be used to probe waitlist membership for a given address.
  res.status(200).json({ ok: true });
}
