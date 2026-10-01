import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import {
  acceptPostOnly,
  getClientIp,
  isDisposable,
  isHoneypotTripped,
  makeRateLimit,
} from './_lib/guards.js';
import { supabaseAdmin } from './_lib/supabase.js';

const ratelimit = makeRateLimit('waitlist', 5, '10 m'); // 5 submissions / 10 min / IP

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  // Deliberately unconstrained rather than `.max(0)`: a filled honeypot has to
  // survive validation to reach the silent-success branch in the handler. If it
  // failed parsing instead, the bot would get a 400 to learn from.
  company: z.unknown().optional(),
});

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

/**
 * Copies the signup into Supabase so the admin portal can list it. AutoSend
 * stays the mailing list and the source of truth for sending; a failure here
 * is logged, never surfaced — the person did join the list.
 */
async function mirrorToSupabase(email: string): Promise<void> {
  const db = supabaseAdmin();
  if (!db) {
    console.warn('Supabase not configured; waitlist signup not mirrored');
    return;
  }
  try {
    const { error } = await db
      .from('waitlist_signups')
      .upsert({ email, source: 'website' }, { onConflict: 'email', ignoreDuplicates: true });
    if (error) console.error('Waitlist mirror failed', error.message);
  } catch (err) {
    console.error('Waitlist mirror request error', err);
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (!acceptPostOnly(req, res)) return;

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
  if (isHoneypotTripped(company)) {
    res.status(200).json({ ok: true });
    return;
  }

  // Told plainly rather than silently swallowed like the honeypot above: a real
  // person on a burner address can just switch to a permanent one, and they
  // can't do that without knowing why they were rejected.
  if (isDisposable(email)) {
    res.status(400).json({ ok: false, error: 'disposable_email' });
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

  await mirrorToSupabase(email);

  // Always the same generic success shape, whether this email was new or
  // already on the list — the response never reveals which, so the endpoint
  // can't be used to probe waitlist membership for a given address.
  res.status(200).json({ ok: true });
}
