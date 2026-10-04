import 'server-only';
import DodoPayments from 'dodopayments';
import type { Payment } from 'dodopayments/resources/payments';
import { isProduction } from '@/lib/env';
import { supabaseAdmin } from './supabase';

// Dodo Payments: the $5 pre-order deposit. One client per server instance,
// created on first use so a missing env var fails a request, not the build.
//
//   DODO_PAYMENTS_API_KEY       API key for the brand's business (test or live)
//   DODO_PAYMENTS_WEBHOOK_KEY   signing secret of the webhook endpoint (whsec_…)
//   DODO_PAYMENTS_ENVIRONMENT   test_mode | live_mode
//   DODO_DEPOSIT_PRODUCT_ID     the one-time "$5 pre-order deposit" product (pdt_…)

// The Dodo account holds several brands; every webhook for the business comes
// to us. tapaway's brand per mode — anything else is someone else's payment.
const BRAND_IDS = {
  test_mode: 'brnd_0NozgMleyNbhCVFXwmqeD',
  live_mode: 'brnd_0NozgF5LcouspbpadGszD',
} as const;

const dodoEnvironment = (): keyof typeof BRAND_IDS =>
  process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode' ? 'live_mode' : 'test_mode';

/** tapaway's Dodo brand for the configured mode. */
export const tapawayBrandId = () => BRAND_IDS[dodoEnvironment()];

let client: DodoPayments | undefined;

export function dodo(): DodoPayments {
  if (client) return client;
  const bearerToken = process.env.DODO_PAYMENTS_API_KEY;
  if (!bearerToken) throw new Error('DODO_PAYMENTS_API_KEY is not configured');
  const environment = dodoEnvironment();
  // dev.tapaway.today shares the production database; it must never also take
  // real money. Live charges happen on the production deployment only.
  if (environment === 'live_mode' && !isProduction) {
    throw new Error('Refusing to use Dodo live_mode outside production');
  }
  client = new DodoPayments({
    bearerToken,
    environment,
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY ?? null,
  });
  return client;
}

export function depositProductId(): string {
  const id = process.env.DODO_DEPOSIT_PRODUCT_ID;
  if (!id) throw new Error('DODO_DEPOSIT_PRODUCT_ID is not configured');
  return id;
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
