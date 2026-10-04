import 'server-only';
import DodoPayments from 'dodopayments';
import type { Payment } from 'dodopayments/resources/payments';
import { isProduction } from '@/lib/env';
import { supabaseAdmin } from './supabase';

// Dodo Payments: the $5 pre-order deposit.
//
// The mode follows the deployment: production takes real money (live_mode);
// dev.tapaway.today, previews and localhost use test_mode. Dev shares the
// production database, so it must never be able to charge a real card.
//
// Only the two secrets come from env vars, set per Vercel environment:
//   DODO_PAYMENTS_API_KEY       test key in Preview/Development, live key in Production
//   DODO_PAYMENTS_WEBHOOK_KEY   signing secret of that environment's webhook (whsec_…)

type DodoMode = 'test_mode' | 'live_mode';
const mode: DodoMode = isProduction ? 'live_mode' : 'test_mode';

// Public identifiers, not secrets. The Dodo account holds several brands and
// every webhook for the business comes to us: anything not on tapaway's
// brand is someone else's payment.
//
// The deposit product's price lives in Dodo. Keep it equal to DEPOSIT_CENTS in
// shared/packs.ts (what the site says it charges) — change both together.
const DODO_IDS: Record<DodoMode, { brand: string; depositProduct: string }> = {
  test_mode: { brand: 'brnd_0NozgMleyNbhCVFXwmqeD', depositProduct: 'pdt_0NozkaOIkeVczn2TflHEi' },
  live_mode: { brand: 'brnd_0NozgF5LcouspbpadGszD', depositProduct: 'pdt_0Nozkj9I1hNaKkkQtnsTl' },
};

/** tapaway's Dodo brand for this deployment's mode. */
export const tapawayBrandId = () => DODO_IDS[mode].brand;

/** The one-time "$5 pre-order deposit" product (pdt_…) for this mode. */
export function depositProductId(): string {
  const id = DODO_IDS[mode].depositProduct;
  if (!id) throw new Error(`No Dodo deposit product set for ${mode} in src/server/payments.ts`);
  return id;
}

let client: DodoPayments | undefined;

export function dodo(): DodoPayments {
  if (client) return client;
  const bearerToken = process.env.DODO_PAYMENTS_API_KEY;
  if (!bearerToken) throw new Error('DODO_PAYMENTS_API_KEY is not configured');
  client = new DodoPayments({
    bearerToken,
    environment: mode,
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY ?? null,
  });
  return client;
}

export type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'refunded';

/**
 * Applies what Dodo says about a payment to its order. The single path both
 * the webhook and the return page go through, so they can't disagree.
 *
 * Idempotent and monotonic: `paid` is never downgraded by a late or replayed
 * `failed`, and re-applying `paid` changes nothing. Returns the order's
 * payment status afterwards, or null if no order matches the reference.
 */
export async function applyPayment(payment: Payment): Promise<PaymentStatus | null> {
  // Another brand's payment, or one not made through our checkout: not ours.
  if (payment.brand_id !== tapawayBrandId()) return null;
  const reference = typeof payment.metadata?.order_reference === 'string' ? payment.metadata.order_reference : null;
  if (!reference) return null;

  const db = supabaseAdmin();
  if (!db) throw new Error('SUPABASE_URL or SUPABASE_SECRET_KEY is not configured');

  if (payment.status === 'succeeded') {
    const { error } = await db
      .from('orders')
      .update({ payment_status: 'paid', payment_id: payment.payment_id, paid_at: new Date().toISOString() })
      .eq('reference', reference)
      .neq('payment_status', 'paid');
    if (error) throw new Error(`Marking ${reference} paid failed: ${error.message}`);
  } else if (payment.status === 'failed' || payment.status === 'cancelled') {
    const { error } = await db
      .from('orders')
      .update({ payment_status: 'failed' })
      .eq('reference', reference)
      .eq('payment_status', 'unpaid');
    if (error) throw new Error(`Marking ${reference} failed failed: ${error.message}`);
  }

  const { data } = await db.from('orders').select('payment_status').eq('reference', reference).maybeSingle();
  return (data?.payment_status as PaymentStatus | undefined) ?? null;
}
