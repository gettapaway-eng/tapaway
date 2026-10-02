import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import {
  acceptPostOnly,
  getClientIp,
  isDisposable,
  isHoneypotTripped,
  makeRateLimit,
} from './_lib/guards.js';
import { supabaseAdmin } from './_lib/supabase.js';
import { CURRENCY, MAX_QUANTITY_PER_PACK, PACKS, priceCart, type PackId } from '../shared/packs.js';

// Pre-orders: no payment yet. The order is a reservation with shipping
// details; totals are recomputed here from shared/packs.ts and snapshotted
// into the row, so neither a tampered request nor a later price change can
// alter what was ordered.

const ratelimit = makeRateLimit('orders', 5, '1 h'); // 5 orders / hour / IP

const packIds = PACKS.map((pack) => pack.id) as [PackId, ...PackId[]];
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  fullName: z.string().trim().min(1).max(120),
  phone: optionalText(40),
  addressLine1: z.string().trim().min(1).max(200),
  addressLine2: optionalText(200),
  city: z.string().trim().min(1).max(100),
  region: optionalText(100),
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().trim().min(2).max(56),
  notes: optionalText(500),
  items: z
    .array(
      z.object({
        packId: z.enum(packIds),
        quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_PACK),
      }),
    )
    .min(1)
    .max(PACKS.length),
  // See api/waitlist.ts: unconstrained so a filled honeypot reaches the
  // silent-success branch instead of teaching the bot via a 400.
  company: z.unknown().optional(),
});

// Crockford-style alphabet: no 0/O or 1/I/L to misread over the phone.
const REFERENCE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

function newReference(): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  return `TA-${code}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!acceptPostOnly(req, res)) return;

  const { success: withinLimit } = await ratelimit.limit(getClientIp(req));
  if (!withinLimit) {
    res.status(429).json({ ok: false, error: 'rate_limited' });
    return;
  }

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: 'invalid_input' });
    return;
  }
  const { company, items, ...customer } = parsed.data;

  if (isHoneypotTripped(company)) {
    // Same shape as a real success, with a reference that matches no order.
    res.status(200).json({ ok: true, reference: newReference() });
    return;
  }

  if (isDisposable(customer.email)) {
    res.status(400).json({ ok: false, error: 'disposable_email' });
    return;
  }

  // Merge duplicate lines for the same pack before pricing.
  const merged = new Map<PackId, number>();
  for (const item of items) merged.set(item.packId, (merged.get(item.packId) ?? 0) + item.quantity);
  const cart = priceCart([...merged].map(([packId, quantity]) => ({ packId, quantity })));
  if (cart.lines.length === 0 || cart.lines.length !== merged.size) {
    res.status(400).json({ ok: false, error: 'invalid_input' });
    return;
  }

  const db = supabaseAdmin();
  if (!db) {
    console.error('SUPABASE_URL or SUPABASE_SECRET_KEY is not configured');
    res.status(500).json({ ok: false, error: 'server_error' });
    return;
  }

  // A reference collision is astronomically unlikely (30^6 ≈ 729M), but the
  // column is unique, so retry rather than fail if it ever happens.
  for (let attempt = 0; attempt < 3; attempt++) {
    const reference = newReference();
    const { error } = await db.from('orders').insert({
      reference,
      email: customer.email,
      full_name: customer.fullName,
      phone: customer.phone,
      address_line1: customer.addressLine1,
      address_line2: customer.addressLine2,
      city: customer.city,
      region: customer.region,
      postal_code: customer.postalCode,
      country: customer.country,
      notes: customer.notes,
      items: cart.lines,
      total_tags: cart.totalTags,
      subtotal_cents: cart.subtotalCents,
      currency: CURRENCY,
    });
    if (!error) {
      res.status(200).json({ ok: true, reference });
      return;
    }
    if (error.code !== '23505') {
      console.error('Order insert failed', error.message);
      res.status(502).json({ ok: false, error: 'upstream_error' });
      return;
    }
  }

  res.status(502).json({ ok: false, error: 'upstream_error' });
}
