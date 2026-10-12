import { NextResponse } from 'next/server';
import type { UnwrapWebhookEvent } from 'dodopayments/resources/webhooks/webhooks';
import { applyPayment, dodo, tapawayBrandId } from '@/server/payments';
import { supabaseAdmin } from '@/server/supabase';

// Dodo Payments webhooks (Standard Webhooks signatures). Configure the
// endpoint in Dodo as https://<domain>/api/webhooks/dodo and subscribe to the
// payment.* events; its signing secret goes in DODO_PAYMENTS_WEBHOOK_KEY.
//
// Answers fast and plainly: 401 for a bad signature, 200 once handled or
// deliberately ignored, 500 only when a retry could help (Dodo retries for
// ~1.5 days on non-2xx).

type PaymentEvent = Extract<UnwrapWebhookEvent, { type: `payment.${string}` }>;
const isPaymentEvent = (event: UnwrapWebhookEvent): event is PaymentEvent => event.type.startsWith('payment.');

export async function POST(request: Request) {
  // The signature covers the exact bytes, so read the raw body — never re-serialise.
  const raw = await request.text();
  const headers = {
    'webhook-id': request.headers.get('webhook-id') ?? '',
    'webhook-signature': request.headers.get('webhook-signature') ?? '',
    'webhook-timestamp': request.headers.get('webhook-timestamp') ?? '',
  };

  if (!process.env.DODO_PAYMENTS_WEBHOOK_KEY) {
    console.error('Dodo webhook: DODO_PAYMENTS_WEBHOOK_KEY is not configured');
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  let event: UnwrapWebhookEvent;
  try {
    event = dodo().webhooks.unwrap(raw, { headers });
  } catch (err) {
    console.warn('Dodo webhook rejected: bad signature', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (!isPaymentEvent(event)) return NextResponse.json({ ok: true, ignored: event.type });
  const payment = event.data;

  // The account's other brands share this endpoint; acknowledge and move on.
  if (payment.brand_id !== tapawayBrandId()) {
    return NextResponse.json({ ok: true, ignored: 'other_brand' });
  }

  const db = supabaseAdmin();
  if (!db) {
    console.error('Dodo webhook: Supabase is not configured');
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // A retried delivery we've already handled: nothing more to do.
  const webhookId = headers['webhook-id'];
  const { data: seen } = await db.from('payment_events').select('webhook_id').eq('webhook_id', webhookId).maybeSingle();
  if (seen) return NextResponse.json({ ok: true, duplicate: true });

  const reference = typeof payment.metadata?.order_reference === 'string' ? payment.metadata.order_reference : null;
  try {
    await applyPayment(payment);
  } catch (err) {
    console.error('Dodo webhook: applying payment failed', err);
    return NextResponse.json({ ok: false }, { status: 500 }); // let Dodo retry
  }

  // Recorded only after success, so a failed attempt is retried in full.
  const { error } = await db.from('payment_events').insert({
    webhook_id: webhookId,
    type: event.type,
    payment_id: payment.payment_id,
    order_reference: reference,
    payload: event,
  });
  if (error && error.code !== '23505') console.error('Dodo webhook: event log insert failed', error.message);

  return NextResponse.json({ ok: true });
}
