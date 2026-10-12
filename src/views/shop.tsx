'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus } from 'lucide-react';
import { ShopHeader } from '@/components/shop/shop-header';
import { TagTurntable } from '@/components/shop/tag-turntable';
import { useCart } from '@/lib/cart';
import { cn } from '@/lib/utils';
import { DEPOSIT_CENTS, MAX_QUANTITY_PER_PACK, PACKS, balanceCents, formatPrice, type PackId } from '@shared/packs';

// Only claims the product actually makes good on — see the iOS app.
const FACTS = [
  { title: 'Tap to lock', body: 'Hold your phone to the tag to lock the apps you chose. Tap again to unlock.' },
  { title: 'No battery', body: 'Nothing to charge, and no Bluetooth pairing.' },
  { title: 'Works offline', body: 'Unlocking never needs an internet connection.' },
];

const TAG_THUMB = `/tag/tag-thumb.webp`;

export default function Shop() {
  const { setQuantity, clear } = useCart();
  const router = useRouter();
  const [packId, setPackId] = useState<PackId>('duo');
  const [quantity, setLocalQuantity] = useState(1);
  const [going, setGoing] = useState(false);

  const pack = PACKS.find((candidate) => candidate.id === packId)!;
  const totalCents = pack.priceCents * quantity;

  function choosePack(id: PackId) {
    setPackId(id);
    setLocalQuantity(1);
  }

  // No cart: the pre-order is exactly what's chosen here, carried straight
  // into the details form. Choosing again replaces it.
  function preOrder() {
    clear();
    setQuantity(packId, quantity);
    setGoing(true);
    router.push('/checkout');
  }

  return (
    <div className="min-h-svh bg-white text-[var(--ink)]">
      <ShopHeader />

      <main className="mx-auto grid max-w-6xl gap-8 px-4 pb-32 pt-1 sm:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16 lg:pt-3">
        <Stage tags={pack.tags} />

        <section className="min-w-0 lg:max-w-[30rem] lg:pt-8" aria-labelledby="product-title">
          <h1
            id="product-title"
            className="text-[2.5rem] leading-[1.02] font-semibold tracking-[-0.035em] sm:text-[3.25rem]"
          >
            The tapaway tag
          </h1>
          <p className="mt-4 max-w-[34ch] text-[17px] leading-relaxed text-zinc-600">
            A small, soft-edged key for the places you want to be present: your desk, your bedside, the kitchen
            table.
          </p>

          <fieldset className="mt-9">
            <legend className="text-[14px] font-semibold">How many tags?</legend>
            <div className="mt-3 grid grid-cols-3 gap-2.5" role="radiogroup">
              {PACKS.map((option) => {
                const selected = option.id === packId;
                return (
                  <label
                    key={option.id}
                    className={cn(
                      'press relative flex cursor-pointer flex-col rounded-[18px] border bg-white px-3.5 pb-3 pt-3 transition-[border-color,box-shadow,transform] duration-150 sm:px-4',
                      'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus-blue)]',
                      selected
                        ? 'border-[var(--ink)] shadow-[inset_0_0_0_1px_var(--ink)]'
                        : 'border-zinc-200 hover:border-zinc-300',
                    )}
                  >
                    <input
                      type="radio"
                      name="pack"
                      value={option.id}
                      checked={selected}
                      onChange={() => choosePack(option.id)}
                      className="sr-only"
                    />
                    <span className="tabular text-[2rem] leading-none font-semibold tracking-[-0.04em]">
                      {option.tags}
                    </span>
                    <span className="mt-1 text-[13px] text-zinc-500">{option.tags === 1 ? 'tag' : 'tags'}</span>
                    <span className="tabular mt-4 text-[15px] font-semibold">{formatPrice(option.priceCents)}</span>
                    <span className="tabular text-[12px] text-zinc-500">
                      {option.tags > 1 ? `${formatPrice(option.priceCents / option.tags)} each` : 'Single'}
                    </span>
                  </label>
                );
              })}
            </div>
            {/* Keyed so the line fades in fresh when the pack changes. */}
            <p key={pack.id} className="shop-fade mt-3 text-[14px] text-zinc-600" aria-live="polite">
              {pack.blurb}
            </p>
          </fieldset>

          <div className="mt-6 flex gap-3">
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
                onClick={() => setLocalQuantity((value) => Math.min(MAX_QUANTITY_PER_PACK, value + 1))}
                disabled={quantity >= MAX_QUANTITY_PER_PACK}
                className="press focus-ring grid size-10 place-items-center rounded-full hover:bg-zinc-100 disabled:opacity-30"
                aria-label="More packs"
              >
                <Plus className="size-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={preOrder}
              disabled={going}
              className="press focus-ring h-12 flex-1 rounded-full bg-[var(--ink)] px-6 text-[15px] font-semibold text-white hover:bg-[#3a3d42] disabled:cursor-wait"
            >
              Pre-order
            </button>
          </div>
          <p className="tabular mt-3 text-[13px] leading-relaxed text-zinc-500">
            Pay {formatPrice(DEPOSIT_CENTS)} today to pre-order.{' '}
            {balanceCents(totalCents) > 0
              ? `The remaining ${formatPrice(balanceCents(totalCents))} is due when we ship.`
              : 'Nothing more is due when we ship.'}
          </p>

          <dl className="mt-10 divide-y divide-zinc-100 border-t border-zinc-100">
            {FACTS.map((fact) => (
              <div key={fact.title} className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-6">
                <dt className="text-[14px] font-semibold">{fact.title}</dt>
                <dd className="text-[14px] leading-relaxed text-zinc-600">{fact.body}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

    </div>
  );
}

/**
 * The sky stage: the turnable tag, plus one companion per extra tag in the
 * chosen pack — the pack shown rather than told. Companions are always
 * mounted and toggled with transitions, so flicking between packs retargets
 * smoothly instead of restarting.
 */
function Stage({ tags }: { tags: number }) {
  return (
    <div className="lg:sticky lg:top-4 lg:self-start">
      <div className="relative grid aspect-square place-items-center overflow-hidden rounded-[28px] bg-[var(--sky)]">
        <div className="relative w-[74%] max-w-[480px] -translate-y-[4%]">
          <TagTurntable />
        </div>
        <Companion visible={tags >= 2} className="bottom-[8%] right-[8%] w-[20%] rotate-[14deg]" delay={0} />
        <Companion visible={tags >= 3} className="bottom-[6%] left-[9%] w-[18%] -rotate-[10deg]" delay={50} />
        <p className="pointer-events-none absolute inset-x-0 top-4 text-center text-[12px] text-[var(--ink)]/55">
          Drag to turn it
        </p>
      </div>
    </div>
  );
}

function Companion({ visible, className, delay }: { visible: boolean; className: string; delay: number }) {
  return (
    <img
      src={TAG_THUMB}
      alt=""
      aria-hidden="true"
      data-visible={visible}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
      className={cn('stage-companion pointer-events-none absolute drop-shadow-[0_14px_18px_rgba(18,52,86,0.3)]', className)}
    />
  );
}
