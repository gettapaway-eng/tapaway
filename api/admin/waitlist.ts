import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { makeRateLimit } from '../_lib/guards.js';
import { supabaseAdmin, userFromToken } from '../_lib/supabase.js';

// Waitlist moderation for the admin portal. Lives server-side because it has
// to touch two systems that must agree: the AutoSend mailing list (secret API
// key) and Supabase waitlist_signups.
//
//   remove  → off the AutoSend list, soft-deleted here (removed_at). Doubles as
//             a block: api/waitlist.ts won't re-add a removed address.
//   restore → back on the AutoSend list, removed_at cleared.
//   purge   → row deleted for good (only rows already removed). Lifts the block.
//
// AutoSend goes first: if it fails nothing changes here, so the two never end
// up disagreeing because of a half-finished request. Every action is audited.

const ratelimit = makeRateLimit('admin-waitlist', 60, '1 m');
const AUTOSEND_BATCH = 500; // AutoSend's per-request maximum for list endpoints

const bodySchema = z.object({
  action: z.enum(['remove', 'restore', 'purge']),
  emails: z.array(z.string().trim().toLowerCase().email().max(254)).min(1).max(2000),
});

type Action = z.infer<typeof bodySchema>['action'];

async function autosend(path: string, body: unknown): Promise<boolean> {
  const apiKey = process.env.AUTOSEND_API_KEY;
  if (!apiKey) throw new Error('AUTOSEND_API_KEY is not configured');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`https://api.autosend.com/v1${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) console.error('AutoSend', path, res.status, await res.text());
    return res.ok;
  } finally {
    clearTimeout(timeout);
  }
}

async function syncAutosend(action: Action, emails: string[]): Promise<boolean> {
  if (action === 'purge') return true; // already off the list when it was removed
  const listId = process.env.AUTOSEND_WAITLIST_LIST_ID;
  if (!listId) throw new Error('AUTOSEND_WAITLIST_LIST_ID is not configured');
  for (let i = 0; i < emails.length; i += AUTOSEND_BATCH) {
    const batch = emails.slice(i, i + AUTOSEND_BATCH);
    const ok =
      action === 'remove'
        ? await autosend(`/contact-lists/${listId}/contacts/remove`, { emails: batch })
        : await autosend('/contact-lists/contacts/bulk-add', { contactListId: listId, emails: batch });
    if (!ok) return false;
  }
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  const db = supabaseAdmin();
  if (!db) {
    res.status(500).json({ ok: false, error: 'server_error' });
    return;
  }

  // Who's asking: the browser sends its Supabase session token; it must belong
  // to an account in public.admins.
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
    res.status(401).json({ ok: false, error: 'not_signed_in' });
    return;
  }
  const user = await userFromToken(token);
  if (!user) {
    res.status(401).json({ ok: false, error: 'not_signed_in' });
    return;
  }
  const { data: adminRow } = await db.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!adminRow) {
    res.status(403).json({ ok: false, error: 'not_an_admin' });
    return;
  }

  const { success: withinLimit } = await ratelimit.limit(user.id);
  if (!withinLimit) {
    res.status(429).json({ ok: false, error: 'rate_limited' });
    return;
  }

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: 'invalid_input' });
    return;
  }
  const { action } = parsed.data;
  const emails = [...new Set(parsed.data.emails)];

  try {
    if (!(await syncAutosend(action, emails))) {
      res.status(502).json({ ok: false, error: 'autosend_failed' });
      return;
    }
  } catch (err) {
    console.error('AutoSend sync error', err);
    res.status(502).json({ ok: false, error: 'autosend_failed' });
    return;
  }

  const query =
    action === 'remove'
      ? db
          .from('waitlist_signups')
          .update({ removed_at: new Date().toISOString(), removed_by: user.id })
          .in('email', emails)
          .is('removed_at', null)
      : action === 'restore'
        ? db.from('waitlist_signups').update({ removed_at: null, removed_by: null }).in('email', emails).not('removed_at', 'is', null)
        : db.from('waitlist_signups').delete().in('email', emails).not('removed_at', 'is', null);
  const { data: changed, error } = await query.select('email');
  if (error) {
    console.error('Waitlist update failed', error.message);
    res.status(502).json({ ok: false, error: 'database_failed' });
    return;
  }

  const affected = (changed ?? []).map((row: { email: string }) => row.email);
  if (affected.length > 0) {
    const { error: auditError } = await db.from('admin_audit').insert({
      actor_id: user.id,
      actor_email: user.email ?? null,
      action: `waitlist.${action === 'purge' ? 'deleted' : action === 'remove' ? 'removed' : 'restored'}`,
      target: affected.length === 1 ? affected[0] : `${affected.length} signups`,
      detail: { emails: affected },
    });
    if (auditError) console.error('Audit insert failed', auditError.message);
  }

  res.status(200).json({ ok: true, affected: affected.length });
}
