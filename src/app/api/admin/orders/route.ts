import { NextResponse } from 'next/server';
import { z } from 'zod';
import { makeRateLimit, readJson } from '@/server/guards';
import { supabaseAdmin, userFromToken } from '@/server/supabase';
import { findCarrier } from '@shared/carriers';

// Fulfilment for the admin portal: confirm, ship (with tracking), correct
// tracking, mark delivered, cancel. Server-side because the browser may only
// read orders; every change is checked against the order's current state and
// written to admin_audit.
//
//   pending ──confirm──▶ confirmed
//   pending|confirmed ──ship──▶ shipped ──deliver──▶ delivered
//   pending|confirmed ──cancel──▶ cancelled
//   shipped|delivered ──update_tracking──▶ (same status, new tracking)
//
// Confirming and shipping need the deposit paid. Each update is conditional
// on the status it starts from, so two admins clicking at once can't both win.

const ratelimit = makeRateLimit('admin-orders', 60, '1 m');

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

const tracking = {
  carrier: z.string().refine((id) => Boolean(findCarrier(id)), 'Unknown carrier'),
  trackingNumber: z.string().trim().min(3).max(64),
  trackingUrl: z
    .string()
    .trim()
    .max(500)
    .refine((url) => url === '' || /^https:\/\/\S+$/.test(url), 'Tracking link must start with https://')
    .optional()
    .default(''),
  // The tags packed in this parcel (hardware IDs from inventory). Optional, so
  // a parcel can still go out before its tags are scanned in; capped at the
  // order's tag count below.
  hardwareIds: z.array(z.string().min(1).max(128)).max(30).optional(),
};

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('confirm'), orderId: z.string().uuid() }),
  z.object({ action: z.literal('ship'), orderId: z.string().uuid(), ...tracking }),
  z.object({ action: z.literal('update_tracking'), orderId: z.string().uuid(), ...tracking }),
  z.object({ action: z.literal('deliver'), orderId: z.string().uuid() }),
  z.object({ action: z.literal('cancel'), orderId: z.string().uuid() }),
]);
type Body = z.infer<typeof bodySchema>;

const FROM: Record<Body['action'], string[]> = {
  confirm: ['pending'],
  ship: ['pending', 'confirmed'],
  update_tracking: ['shipped', 'delivered'],
  deliver: ['shipped'],
  cancel: ['pending', 'confirmed'],
};
const NEEDS_PAYMENT = new Set<Body['action']>(['confirm', 'ship']);
const AUDIT_ACTION: Record<Body['action'], string> = {
  confirm: 'order.confirmed',
  ship: 'order.shipped',
  update_tracking: 'order.tracking_updated',
  deliver: 'order.delivered',
  cancel: 'order.cancelled',
};

function changes(body: Body): Record<string, unknown> {
  const now = new Date().toISOString();
  switch (body.action) {
    case 'confirm':
      return { status: 'confirmed', confirmed_at: now };
    case 'ship':
      return {
        status: 'shipped',
        shipped_at: now,
        carrier: body.carrier,
        tracking_number: body.trackingNumber,
        tracking_url: body.trackingUrl || null,
      };
    case 'update_tracking':
      return { carrier: body.carrier, tracking_number: body.trackingNumber, tracking_url: body.trackingUrl || null };
    case 'deliver':
      return { status: 'delivered', delivered_at: now };
    case 'cancel':
      return { status: 'cancelled', cancelled_at: now };
  }
}

type Db = NonNullable<ReturnType<typeof supabaseAdmin>>;

/**
 * Makes `hardwareIds` the order's parcel contents. A tag can be added only if
 * it's free: confirmed in inventory, not registered in the app, not packed for
 * another order. Tags already in this order stay allowed (one may have been
 * registered by its new owner since). order_tags is keyed by hardware_id, so
 * even two admins racing can't put one tag in two parcels — the second insert
 * fails and reports the tag as taken.
 */
async function setOrderTags(db: Db, orderId: string, hardwareIds: string[]): Promise<'ok' | 'tag_unavailable' | 'database_failed'> {
  const { data: current, error: currentError } = await db.from('order_tags').select('hardware_id').eq('order_id', orderId);
  if (currentError) {
    console.error('Admin orders: reading parcel failed', currentError.message);
    return 'database_failed';
  }
  const kept = new Set((current ?? []).map((row) => row.hardware_id as string));
  const added = hardwareIds.filter((id) => !kept.has(id));
  const removed = [...kept].filter((id) => !hardwareIds.includes(id));

  if (added.length > 0) {
    const [inventory, registered] = await Promise.all([
      db.from('tag_inventory').select('hardware_id').in('hardware_id', added).not('confirmed_at', 'is', null),
      db.from('tags').select('hardware_id').in('hardware_id', added),
    ]);
    if (inventory.error || registered.error) {
      console.error('Admin orders: checking tags failed', inventory.error?.message ?? registered.error?.message);
      return 'database_failed';
    }
    const confirmed = new Set((inventory.data ?? []).map((row) => row.hardware_id as string));
    const taken = new Set((registered.data ?? []).map((row) => row.hardware_id as string));
    if (added.some((id) => !confirmed.has(id) || taken.has(id))) return 'tag_unavailable';

    const { error: insertError } = await db
      .from('order_tags')
      .insert(added.map((hardware_id) => ({ hardware_id, order_id: orderId })));
    if (insertError) {
      if (insertError.code === '23505') return 'tag_unavailable'; // packed for another order meanwhile
      console.error('Admin orders: packing tags failed', insertError.message);
      return 'database_failed';
    }
  }

  if (removed.length > 0) {
    const { error: removeError } = await db.from('order_tags').delete().eq('order_id', orderId).in('hardware_id', removed);
    if (removeError) {
      console.error('Admin orders: unpacking tags failed', removeError.message);
      return 'database_failed';
    }
  }
  return 'ok';
}

export async function POST(request: Request) {
  const db = supabaseAdmin();
  if (!db) {
    console.error('Admin orders: Supabase is not configured');
    return json({ ok: false, error: 'server_error' }, 500);
  }

  // Who's asking: the browser's Supabase session token, which must belong to
  // an account in public.admins.
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = token ? await userFromToken(token) : null;
  if (!user) return json({ ok: false, error: 'not_signed_in' }, 401);
  const { data: adminRow } = await db.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!adminRow) return json({ ok: false, error: 'not_an_admin' }, 403);

  const { success: withinLimit } = await ratelimit.limit(user.id);
  if (!withinLimit) return json({ ok: false, error: 'rate_limited' }, 429);

  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return json({ ok: false, error: 'invalid_input', message: parsed.error.issues[0]?.message }, 400);
  }
  const body = parsed.data;

  const { data: order } = await db
    .from('orders')
    .select('id, reference, status, payment_status, total_tags')
    .eq('id', body.orderId)
    .maybeSingle();
  if (!order) return json({ ok: false, error: 'not_found' }, 404);
  if (NEEDS_PAYMENT.has(body.action) && order.payment_status !== 'paid') {
    return json({ ok: false, error: 'not_paid' }, 409);
  }

  // Only set when the request names the parcel's tags; leaving it out keeps
  // whatever was recorded before.
  const hardwareIds =
    (body.action === 'ship' || body.action === 'update_tracking') && body.hardwareIds
      ? [...new Set(body.hardwareIds)]
      : null;
  if (hardwareIds && hardwareIds.length > order.total_tags) {
    return json({ ok: false, error: 'too_many_tags', message: `This order has ${order.total_tags} tags.` }, 400);
  }

  const { data: updated, error } = await db
    .from('orders')
    .update(changes(body))
    .eq('id', order.id)
    .in('status', FROM[body.action])
    .select('*')
    .maybeSingle();
  if (error) {
    console.error('Admin orders: update failed', error.message);
    return json({ ok: false, error: 'database_failed' }, 502);
  }
  // Nothing matched: someone else moved the order on since this was loaded.
  if (!updated) return json({ ok: false, error: 'invalid_transition', status: order.status }, 409);

  // Record which tags are in the parcel.
  if (hardwareIds) {
    const result = await setOrderTags(db, order.id, hardwareIds);
    if (result !== 'ok') {
      return json(
        {
          ok: false,
          error: result,
          message:
            result === 'tag_unavailable'
              ? 'One of those tags was just packed for another order or set up in the app. The shipment was saved — edit it to pick tags again.'
              : undefined,
        },
        409,
      );
    }
  }

  const { error: auditError } = await db.from('admin_audit').insert({
    actor_id: user.id,
    actor_email: user.email ?? null,
    action: AUDIT_ACTION[body.action],
    target: order.reference,
    detail:
      body.action === 'ship' || body.action === 'update_tracking'
        ? { from: order.status, carrier: body.carrier, tracking_number: body.trackingNumber, tags: hardwareIds ?? undefined }
        : { from: order.status },
  });
  if (auditError) console.error('Admin orders: audit insert failed', auditError.message);

  return json({ ok: true, order: updated });
}
