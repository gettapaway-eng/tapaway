import { z } from 'zod';
import { NextResponse } from 'next/server';
import { makeRateLimit, readJson } from '@/server/guards';
import { supabaseAdmin, userFromToken } from '@/server/supabase';

// Waitlist moderation for the admin portal. Lives server-side because it has
// to touch two systems that must agree: the AutoSend mailing list (secret API
// key) and Supabase waitlist_signups.
//
//   remove  → off the AutoSend list, soft-deleted here (removed_at). Doubles as
//             a block: app/api/waitlist/route.ts won't re-add a removed address.
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

// Same-origin only (called from the admin subdomain itself), so no CORS.
const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

export async function POST(request: Request) {
  const db = supabaseAdmin();
  if (!db) {
    return json({ ok: false, error: 'server_error' }, 500);
  }

  // Who's asking: the browser sends its Supabase session token; it must belong
  // to an account in public.admins.
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return json({ ok: false, error: 'not_signed_in' }, 401);
  }
  const user = await userFromToken(token);
  if (!user) {
    return json({ ok: false, error: 'not_signed_in' }, 401);
  }
  const { data: adminRow } = await db.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!adminRow) {
    return json({ ok: false, error: 'not_an_admin' }, 403);
  }

  const { success: withinLimit } = await ratelimit.limit(user.id);
  if (!withinLimit) {
    return json({ ok: false, error: 'rate_limited' }, 429);
  }

  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return json({ ok: false, error: 'invalid_input' }, 400);
  }
  const { action } = parsed.data;
  const emails = [...new Set(parsed.data.emails)];

  try {
    if (!(await syncAutosend(action, emails))) {
      return json({ ok: false, error: 'autosend_failed' }, 502);
    }
  } catch (err) {
    console.error('AutoSend sync error', err);
    return json({ ok: false, error: 'autosend_failed' }, 502);
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
    return json({ ok: false, error: 'database_failed' }, 502);
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

  return json({ ok: true, affected: affected.length });
}
