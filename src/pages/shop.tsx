import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { Check, Minus, Plus } from 'lucide-react';
import { ShopHeader } from '@/components/shop/shop-header';
import { TagStack, TagTurntable } from '@/components/shop/tag-turntable';
import { useCart } from '@/lib/cart';
import { cn } from '@/lib/utils';
import { MAX_QUANTITY_PER_PACK, PACKS, formatPrice, type PackId } from '../../shared/packs';

// Only claims the product actually makes good on — see the iOS app.
const FACTS = [
  'Tap your phone to it to lock the apps you chose. Tap again to unlock.',
  'No battery, no charging, no Bluetooth pairing.',
  'Unlocking never needs an internet connection.',
];

export default function Shop() {
  const { lines, priced, itemCount, setQuantity } = useCart();
  const [packId, setPackId] = useState<PackId>('duo');
  const [quantity, setLocalQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const addedTimer = useRef<number | null>(null);

  useEffect(() => () => void (addedTimer.current && window.clearTimeout(addedTimer.current)), []);

  const inCart = lines.find((line) => line.packId === packId)?.quantity ?? 0;
  const room = MAX_QUANTITY_PER_PACK - inCart;
  const pack = PACKS.find((candidate) => candidate.id === packId)!;

  function addToCart() {
    const amount = Math.min(quantity, room);
    if (amount <= 0) return;
    setQuantity(packId, inCart + amount);
    setLocalQuantity(1);
    setJustAdded(true);
    if (addedTimer.current) window.clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setJustAdded(false), 1600);
  }

  return (
    <div className="min-h-svh bg-white text-zinc-900">
      <ShopHeader />

      <main className="mx-auto grid max-w-6xl gap-8 px-5 pb-32 pt-2 sm:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16 lg:pt-6">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="relative overflow-hidden rounded-3xl bg-zinc-100">
            <TagTurntable />
            <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-xs text-zinc-500">
              Drag to turn it
            </p>
          </div>
        </div>

        <section className="max-w-[34rem] lg:pt-10" aria-labelledby="product-title">
          <h1 id="product-title" className="text-[2.75rem] leading-[1.05] font-medium tracking-tight">
            The tapaway tag
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed text-zinc-600">
            A small, soft-edged key that lives where you want to be present — your desk, your bedside, the
            kitchen table. Pre‑order now; nothing is charged until we're ready to ship.
          </p>

          <fieldset className="mt-9">
            <legend className="text-sm font-semibold">How many tags?</legend>
            <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200" role="radiogroup">
              {PACKS.map((option) => {
                const selected = option.id === packId;
                const perTag = option.priceCents / option.tags;
                return (
                  <label
                    key={option.id}
                    className={cn(
                      'relative flex cursor-pointer items-center gap-4 border-b border-zinc-200 px-4 py-4 transition-colors duration-150 last:border-b-0 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-[var(--focus-blue)] sm:px-5',
                      selected ? 'bg-zinc-50' : 'hover:bg-zinc-50/60',
                    )}
                  >
                    <input
                      type="radio"
                      name="pack"
                      value={option.id}
                      checked={selected}
                      onChange={() => {
                        setPackId(option.id);
                        setLocalQuantity(1);
                      }}
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        'grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-150',
                        selected ? 'border-[var(--focus-blue)] bg-[var(--focus-blue)]' : 'border-zinc-300 bg-white',
                      )}
                      aria-hidden="true"
                    >
                      <span
                        className={cn(
                          'size-2 rounded-full bg-white transition-[transform,opacity] duration-200 ease-[var(--ease-out-strong)]',
                          selected ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
                        )}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold">{option.name}</span>
                      <span className="block text-[13px] text-zinc-500">{option.blurb}</span>
                    </span>
                    <TagStack count={option.tags} className="hidden sm:inline-flex" />
                    <span className="tabular w-20 shrink-0 text-right">
                      <span className="block text-[15px] font-semibold">{formatPrice(option.priceCents)}</span>
                      {option.tags > 1 ? (
                        <span className="block text-[12px] text-zinc-500">{formatPrice(perTag)} each</span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-5 flex gap-3">
            <div className="flex h-12 items-center rounded-full border border-zinc-200 px-1">
              <button
                type="button"
                onClick={() => setLocalQuantity((value) => Math.max(1, value - 1))}
                disabled={quantity <= 1}
                className="press focus-ring grid size-10 place-items-center rounded-full hover:bg-zinc-100 disabled:opacity-30"
                aria-label="Fewer packs"
              >
                <Minus className="size-4" />
              </button>
              <span className="tabular w-7 text-center text-[15px] font-semibold" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setLocalQuantity((value) => Math.min(Math.max(1, room), value + 1))}
                disabled={quantity >= room}
                className="press focus-ring grid size-10 place-items-center rounded-full hover:bg-zinc-100 disabled:opacity-30"
                aria-label="More packs"
              >
                <Plus className="size-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={addToCart}
              disabled={room <= 0}
              className="press focus-ring relative h-12 flex-1 overflow-hidden rounded-full bg-zinc-900 px-6 text-[15px] font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {/* Two labels crossfading with a little blur reads as one label changing. */}
              <span
                className={cn(
                  'absolute inset-0 grid place-items-center transition-[opacity,filter] duration-200',
                  justAdded ? 'opacity-0 blur-[2px]' : 'opacity-100 blur-0',
                )}
              >
                {room <= 0 ? 'Limit reached for this pack' : `Add to cart · ${formatPrice(pack.priceCents * quantity)}`}
              </span>
              <span
                className={cn(
                  'absolute inset-0 flex items-center justify-center gap-2 transition-[opacity,filter] duration-200',
                  justAdded ? 'opacity-100 blur-0' : 'opacity-0 blur-[2px]',
                )}
                aria-hidden={!justAdded}
              >
                <Check className="size-4" /> Added
              </span>
              <span className="invisible">Add to cart · {formatPrice(pack.priceCents * quantity)}</span>
            </button>
          </div>
          <p className="sr-only" aria-live="polite">
            {justAdded ? `${pack.name} added to cart` : ''}
          </p>

          <ul className="mt-10 space-y-3 border-t border-zinc-200 pt-6">
            {FACTS.map((fact) => (
              <li key={fact} className="flex gap-3 text-[15px] leading-relaxed text-zinc-600">
                <Check className="mt-1 size-4 shrink-0 text-zinc-900" strokeWidth={2} />
                {fact}
              </li>
            ))}
          </ul>
        </section>
      </main>

      {/* Cart bar: appears once there's something to check out. */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-20 px-4 pb-4 transition-[transform,opacity] duration-300 ease-[var(--ease-out-strong)] sm:px-8',
          itemCount > 0 ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0',
        )}
        aria-hidden={itemCount === 0}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-2xl bg-zinc-900 py-3 pl-5 pr-3 text-white shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)]">
          <p className="tabular text-sm">
            <span className="text-white/70">
              {priced.totalTags} tag{priced.totalTags === 1 ? '' : 's'} in your cart ·{' '}
            </span>
            <span className="font-semibold">{formatPrice(priced.subtotalCents)}</span>
          </p>
          <Link
            href="/checkout"
            tabIndex={itemCount > 0 ? 0 : -1}
            className="press focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
          >
            Check out
          </Link>
        </div>
      </div>
    </div>
  );
}
