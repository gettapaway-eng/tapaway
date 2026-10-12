import { NextResponse } from 'next/server';
import { getClientIp, makeRateLimit } from '@/server/guards';
import { supabaseAdmin, userFromToken } from '@/server/supabase';

// Deletes the signed-in app account, for the "Delete account" row in the iOS
// app (App Review guideline 5.1.1(v)). The page signs in with the same emailed
// code the app uses and sends the fresh session token here.
//
// Removing the auth user is the whole deletion: settings, schedules, tags,
// account_keys, emergency_unlocks and tag_provisioners all reference
// auth.users with ON DELETE CASCADE. A tag counts as registered only while its
// `tags` row exists, so its hardware is free to register again afterwards;
// tag_inventory keeps the physical tag and just loses provisioned_by (SET NULL).
// Pre-orders are keyed by email, not by account, and stay so they can ship.

const ratelimit = makeRateLimit('account-delete', 10, '10 m');

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

export async function POST(request: Request) {
  const db = supabaseAdmin();
  if (!db) {
    console.error('Account delete: Supabase is not configured');
    return json({ ok: false, error: 'unavailable' }, 503);
  }

  const { success: withinLimit } = await ratelimit.limit(getClientIp(request));
  if (!withinLimit) return json({ ok: false, error: 'rate_limited' }, 429);

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = token ? await userFromToken(token) : null;
  if (!user) return json({ ok: false, error: 'not_signed_in' }, 401);

  // Staff accounts run the store; losing one to a public page would lock
  // people out of the admin portal. They're removed by hand instead.
  const { data: adminRow, error: adminError } = await db
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (adminError) {
    console.error('Account delete: admin check failed', adminError.message);
    return json({ ok: false, error: 'unavailable' }, 503);
  }
  if (adminRow) return json({ ok: false, error: 'admin_account' }, 403);

  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('Account delete: deleting user failed', error.message);
    return json({ ok: false, error: 'unavailable' }, 503);
  }

  return json({ ok: true });
}
