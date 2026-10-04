import { NextResponse } from 'next/server';
import { getClientIp, makeRateLimit } from '@/server/guards';
import { applyPayment, dodo, type PaymentStatus } from '@/server/payments';
import { supabaseAdmin } from '@/server/supabase';

// Polled by /checkout/complete after Dodo redirects back. Answers with the
// order's payment status and nothing else — no names, no address — so a
// guessed reference reveals at most "paid or not".
//
// The webhook usually lands first. If it hasn't yet and the return URL
// carried Dodo's payment_id, ask Dodo directly and apply the answer through
// the same path the webhook uses, so the customer isn't left waiting on it.
// The `status` query param Dodo appends is never trusted: anyone can type it.

const ratelimit = makeRateLimit('order-status', 60, '1 m');
const REFERENCE = /^TA-[23456789A-HJKMNP-TV-Z]{6}$/;
const PAYMENT_ID = /^pay_[A-Za-z0-9]+$/;

const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const reference = params.get('ref') ?? '';
  const paymentId = params.get('payment_id') ?? '';
  if (!REFERENCE.test(reference)) return reply({ ok: false, error: 'invalid_reference' }, 400);

  const { success: withinLimit } = await ratelimit.limit(getClientIp(request));
  if (!withinLimit) return reply({ ok: false, error: 'rate_limited' }, 429);

  const db = supabaseAdmin();
  if (!db) return reply({ ok: false, error: 'server_error' }, 500);

  const { data: order } = await db
    .from('orders')
    .select('payment_status')
    .eq('reference', reference)
    .maybeSingle();
  if (!order) return reply({ ok: false, error: 'not_found' }, 404);

  let paymentStatus = order.payment_status as PaymentStatus;
  if (paymentStatus === 'unpaid' && PAYMENT_ID.test(paymentId)) {
    try {
      const payment = await dodo().payments.retrieve(paymentId);
      // applyPayment checks the payment's brand and that its metadata names
      // this very order, so someone else's payment_id can't settle it.
      if (payment.metadata?.order_reference === reference) {
        paymentStatus = (await applyPayment(payment)) ?? paymentStatus;
      }
    } catch (err) {
      console.warn('Order status: Dodo lookup failed', err instanceof Error ? err.message : err);
    }
  }

  return reply({ ok: true, paymentStatus });
}
