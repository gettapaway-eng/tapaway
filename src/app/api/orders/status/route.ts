import { NextResponse } from 'next/server';
import { getClientIp, makeRateLimit } from '@/server/guards';
import { applyPayment, dodo, type PaymentStatus } from '@/server/payments';
import { supabaseAdmin } from '@/server/supabase';
import { SHIPS_TO, splitInternational } from '@shared/address';

// Polled by /checkout/complete after Dodo redirects back. To anyone with just
// a reference it answers the payment status and nothing else, so a guessed
// reference reveals at most "paid or not".
//
// The details for the confirmation (the address label) come back only with
// the exact Dodo payment_id recorded on that order — which only the person
// who paid gets, in their redirect from Dodo's checkout. That lets the page
// show the label on a reload or in another tab, not just straight after
// checkout.
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
  if (!db) {
    console.error('Order status: SUPABASE_URL or SUPABASE_SECRET_KEY is not configured');
    return reply({ ok: false, error: 'unavailable' }, 503);
  }

  const { data: order } = await db
    .from('orders')
    .select('id, payment_status')
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

  const receipt = paymentStatus === 'paid' && PAYMENT_ID.test(paymentId) ? await loadReceipt(order.id, paymentId) : null;
  return reply({ ok: true, paymentStatus, ...(receipt ? { receipt } : {}) });
}

/** The confirmation's contents, if `paymentId` is the payment recorded on this order. */
async function loadReceipt(orderId: string, paymentId: string) {
  const db = supabaseAdmin();
  if (!db) return null;
  const { data: row } = await db
    .from('orders')
    .select(
      'reference, payment_id, email, full_name, phone, address_line1, address_line2, city, region, postal_code, country, items, total_tags, subtotal_cents',
    )
    .eq('id', orderId)
    .maybeSingle();
  if (!row || row.payment_id !== paymentId) return null;

  // Orders store display values (country and region names, E.164 phone);
  // the label wants the form's shape back.
  const countryCode = SHIPS_TO.find((country) => country.name === row.country)?.code ?? '';
  const phone = row.phone ? splitInternational(row.phone, countryCode) : null;
  return {
    reference: row.reference,
    email: row.email,
    lines: row.items,
    totalTags: row.total_tags,
    subtotalCents: row.subtotal_cents,
    label: {
      fullName: row.full_name,
      phoneCountry: phone?.countryCode ?? countryCode,
      phone: phone?.national ?? '',
      country: countryCode,
      addressLine1: row.address_line1,
      addressLine2: row.address_line2 ?? '',
      city: row.city,
      region: row.region ?? '',
      postalCode: row.postal_code ?? '',
    },
  };
}
