import Link from 'next/link';
import { Logomark } from '@/components/site/logo';
import { WaitlistForm } from '@/components/site/waitlist-form';

// What /shop shows while `shopEnabled` is off (production, until launch).
// Same illustrated sky as the landing footer, so it reads as part of the site
// rather than an error, and the waitlist form is the one thing to do here.
export function ShopComingSoon() {
  return (
    <main className="min-h-svh bg-white p-2 sm:p-4">
      <div className="relative grid min-h-[calc(100svh-1rem)] place-items-center overflow-hidden rounded-2xl sm:min-h-[calc(100svh-2rem)]">
        <img
          src="/footerbg.webp"
          alt=""
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />

        <Link
          href="/"
          className="focus-ring absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-[rgb(18_52_86/0.35)] px-3.5 py-2 text-[15px] font-semibold text-white backdrop-blur-md hover:bg-[rgb(18_52_86/0.5)] sm:left-6 sm:top-6"
        >
          <Logomark className="h-4 w-auto" />
          tapaway
        </Link>

        <div className="relative z-10 w-full px-5 py-24 text-center sm:px-10">
          <h1 className="text-4xl font-medium tracking-tight text-white sm:text-6xl">The shop opens soon</h1>
          <p className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-white/90 sm:text-[18px]">
            tapaway tags go on sale at launch. Join the waitlist and we’ll email you the moment pre-orders open.
          </p>
          <WaitlistForm className="mt-8" />
        </div>
      </div>
    </main>
  );
}
