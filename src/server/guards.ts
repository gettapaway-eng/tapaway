import 'server-only';
import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import disposableDomains from 'disposable-email-domains/index.json';
import wildcardDisposableDomains from 'disposable-email-domains/wildcard.json';

// Shared request guards for the public form endpoints (waitlist, orders).
// `server-only` makes importing this from a client component a build error.

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
// Created on first use, not at import: `next build` loads route modules to
// collect metadata, and a missing env var must fail a request, not the build.
let redis: Redis | undefined;
function getRedis(): Redis {
  if (redis) return redis;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('KV_REST_API_URL or KV_REST_API_TOKEN is not configured');
  redis = new Redis({ url, token });
  return redis;
}

/** One limiter per endpoint, so a burst on one never locks out the other. */
export function makeRateLimit(prefix: string, requests: number, window: `${number} ${'s' | 'm' | 'h'}`) {
  let limiter: Ratelimit | undefined;
  return {
    limit(identifier: string) {
      limiter ??= new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(requests, window),
        analytics: true,
        prefix,
      });
      return limiter.limit(identifier);
    },
  };
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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  Vary: 'Origin',
};

/**
 * JSON response carrying the CORS headers every public form endpoint sends.
 *
 * CORS is not an access-control mechanism by itself (a script can still call
 * these endpoints directly, bypassing CORS entirely) — it just stops other
 * sites from quietly embedding these flows against visitors of their own
 * pages. Rate limiting is the actual defense.
 */
export function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

/** Preflight answer for the public form endpoints. */
export function preflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** Parses a JSON body, or returns undefined for a missing or malformed one. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}
