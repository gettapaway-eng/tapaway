// The catalog: tag packs and their prices. Imported by the shop UI *and* by
// api/orders.ts, which recomputes every total from this file — the browser's
// idea of a price is never trusted. Changing a price here changes it in both
// places on the next deploy; orders already placed keep the price they were
// placed at (snapshotted into `orders.items`).
//
// PLACEHOLDER PRICES AND CURRENCY — set the real ones before launch.

export const CURRENCY = 'USD';

export type PackId = 'single' | 'duo' | 'trio';

export interface Pack {
  id: PackId;
  name: string;
  tags: number;
  priceCents: number;
  blurb: string;
}

export const PACKS: readonly Pack[] = [
  {
    id: 'single',
    name: '1 tag',
    tags: 1,
    priceCents: 1900,
    blurb: 'For the one spot you scroll most.',
  },
  {
    id: 'duo',
    name: '2 tags',
    tags: 2,
    priceCents: 3500,
    blurb: 'Desk and bedside, or one spare.',
  },
  {
    id: 'trio',
    name: '3 tags',
    tags: 3,
    priceCents: 4900,
    blurb: 'Home, work, and a backup.',
  },
];

export const MAX_QUANTITY_PER_PACK = 10;

/**
 * Paid at checkout (via Dodo Payments) to hold a pre-order: one deposit per
 * order, whatever's in it. The rest of the total is due when we ship.
 */
export const DEPOSIT_CENTS = 500;

/** What's left after the deposit — never negative, even for a tiny order. */
export function balanceCents(subtotalCents: number): number {
  return Math.max(0, subtotalCents - DEPOSIT_CENTS);
}

export function findPack(id: string): Pack | undefined {
  return PACKS.find((pack) => pack.id === id);
}

export function formatPrice(cents: number, currency: string = CURRENCY): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export interface CartLine {
  packId: PackId;
  quantity: number;
}

export interface PricedLine {
  packId: PackId;
  name: string;
  tags: number;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

/** Prices a cart against the catalog. Unknown packs and bad quantities are dropped. */
export function priceCart(lines: readonly CartLine[]): {
  lines: PricedLine[];
  totalTags: number;
  subtotalCents: number;
} {
  const priced: PricedLine[] = [];
  for (const line of lines) {
    const pack = findPack(line.packId);
    if (!pack) continue;
    const quantity = Math.floor(line.quantity);
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_PACK) continue;
    priced.push({
      packId: pack.id,
      name: pack.name,
      tags: pack.tags,
      quantity,
      unitPriceCents: pack.priceCents,
      lineTotalCents: pack.priceCents * quantity,
    });
  }
  return {
    lines: priced,
    totalTags: priced.reduce((sum, line) => sum + line.tags * line.quantity, 0),
    subtotalCents: priced.reduce((sum, line) => sum + line.lineTotalCents, 0),
  };
}
