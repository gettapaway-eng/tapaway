import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
// `with { type: 'json' }` is required: Node's ESM loader refuses JSON imports
// without it, and this package's `main` points straight at index.json.
import disposableDomains from 'disposable-email-domains/index.json' with { type: 'json' };
import wildcardDisposableDomains from 'disposable-email-domains/wildcard.json' with { type: 'json' };

// Shared request guards for the public form endpoints (waitlist, orders).
// `_lib` is underscore-prefixed so Vercel never exposes it as a route.

// ---------------------------------------------------------------------------
// Rate limiting
//
// Serverless functions are stateless between invocations, so an in-memory
// counter would not survive across requests (or across regions). Upstash's
// Redis is REST-based specifically so it works from short-lived functions
// like these. Configure via Vercel's dashboard → Storage → Upstash
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

/** One limiter per endpoint, so a burst on one never locks out the other. */
export function makeRateLimit(prefix: string, requests: number, window: `${number} ${'s' | 'm' | 'h'}`) {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
    prefix,
  });
}

// ---------------------------------------------------------------------------
// Disposable address blocking
//
// A static list is the whole defense here: new burner domains appear daily so
// this can never be complete, but it costs nothing at runtime (~18ms to build
// the Set once per cold start, then O(1) lookups) and kills the long tail of
// casual mailinator signups. Refresh it with `pnpm up disposable-email-domains`.
// ---------------------------------------------------------------------------
const DISPOSABLE = new Set<string>([
  ...disposableDomains,
  ...wildcardDisposableDomains,
]);

// Escape hatches for a list this large (~121k domains). Anything added to
// ALLOWED wins over the blocklist — use it when a real signup gets caught.
const ALLOWED = new Set<string>([]);
// Burners the upstream list lags on. Add anything you spot in signups.
const EXTRA_DISPOSABLE = new Set<string>([]);

export function isDisposable(email: string): boolean {
  const host = email.slice(email.lastIndexOf('@') + 1);
  if (ALLOWED.has(host)) return false;
  // Walk parent domains so mail.burner.example is caught by burner.example.
  // Stops before the bare TLD, and the list contains no public suffixes
  // (no `com`, `co.uk`, …), so this can't blanket-block a legitimate one.
  const labels = host.split('.');
  for (let i = 0; i < labels.length - 1; i++) {
    const domain = labels.slice(i).join('.');
    if (ALLOWED.has(domain)) return false;
    if (DISPOSABLE.has(domain) || EXTRA_DISPOSABLE.has(domain)) return true;
  }
  return false;
}

// Honeypot: a field real users never see or fill, but naive bots that
// auto-fill every input often do. Any value at all here means a bot.
export function isHoneypotTripped(company: unknown): boolean {
  if (typeof company === 'string') return company.trim().length > 0;
  return company !== undefined && company !== null;
}

// www.tapaway.today is the actual Production origin — the bare apex domain
// redirects (308) to it, so that's what the browser's Origin header sends.
const ALLOWED_ORIGIN =
  process.env.ALLOWED_ORIGIN ?? 'https://www.tapaway.today';

/**
 * CORS headers plus the OPTIONS/method gate every form endpoint needs.
 * Returns false when the request has already been answered.
 *
 * CORS is not an access-control mechanism by itself (a script can still call
 * these endpoints directly, bypassing CORS entirely) — it just stops other
 * sites from quietly embedding these flows against visitors of their own
 * pages. Rate limiting is the actual defense.
 */
export function acceptPostOnly(req: VercelRequest, res: VercelResponse): boolean {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return false;
  }
  return true;
}

export function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ip = first?.split(',')[0]?.trim();
  return ip || req.socket?.remoteAddress || 'unknown';
}
