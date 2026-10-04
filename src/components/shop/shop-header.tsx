'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { Logomark } from '@/components/site/logo';
import { useCart } from '@/lib/cart';

export function ShopHeader() {
  const { itemCount } = useCart();
  // Pulse the count when it goes up — not on first paint, not when it drops.
  const previous = useRef(itemCount);
  const [bump, setBump] = useState(0);
  useEffect(() => {
    if (itemCount > previous.current) setBump((value) => value + 1);
    previous.current = itemCount;
  }, [itemCount]);

  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <Link href="/" className="focus-ring flex items-center gap-2 rounded-md">
        {/* The mark ships white for the video hero; ink it for white pages. */}
        <Logomark className="h-6 w-auto [&_path]:fill-zinc-900" />
        <span className="text-lg font-semibold tracking-tight">tapaway</span>
      </Link>
      <Link
        href="/checkout"
        className="press focus-ring inline-flex h-10 items-center gap-2 rounded-full border border-zinc-200 pl-3.5 pr-3 text-sm font-medium hover:bg-zinc-50"
        aria-label={itemCount > 0 ? `Cart, ${itemCount} item${itemCount === 1 ? '' : 's'}` : 'Cart, empty'}
      >
        <ShoppingBag className="size-4" strokeWidth={1.75} />
        Cart
        <span
          key={bump}
          className="tabular grid h-5 min-w-5 place-items-center rounded-full bg-[var(--ink)] px-1.5 text-[11px] font-semibold text-white transition-opacity duration-150 data-[empty=true]:bg-zinc-100 data-[empty=true]:text-zinc-500 data-[bump=true]:cart-bump"
          data-empty={itemCount === 0}
          data-bump={bump > 0}
        >
          {itemCount}
        </span>
      </Link>
    </header>
  );
}
