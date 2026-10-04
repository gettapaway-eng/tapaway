'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logomark } from '@/components/site/logo';
import { useCart } from '@/lib/cart';

export function ShopHeader() {
  const { priced } = useCart();
  const pathname = usePathname();
  // A way back to an unfinished pre-order from anywhere in the shop — not
  // needed on the pre-order pages themselves, or when nothing is chosen.
  const showResume = priced.totalTags > 0 && !pathname.startsWith('/checkout');

  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <Link href="/" className="focus-ring flex items-center gap-2 rounded-md">
        {/* The mark ships white for the video hero; ink it for white pages. */}
        <Logomark className="h-6 w-auto [&_path]:fill-zinc-900" />
        <span className="text-lg font-semibold tracking-tight">tapaway</span>
      </Link>
      {showResume ? (
        <Link
          href="/checkout"
          className="press focus-ring inline-flex h-10 items-center gap-2 rounded-full border border-zinc-200 px-4 text-sm font-medium hover:bg-zinc-50"
        >
          Continue pre-order
          <span className="tabular text-zinc-500">
            · {priced.totalTags} tag{priced.totalTags === 1 ? '' : 's'}
          </span>
        </Link>
      ) : null}
    </header>
  );
}
