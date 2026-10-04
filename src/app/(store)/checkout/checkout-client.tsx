'use client';

import dynamic from 'next/dynamic';

// Checkout is built on browser state — the saved cart, a sessionStorage draft,
// the visitor's locale, the step in the URL — so it renders in the browser
// only. Prerendering it would mean an empty-cart flash on every visit.
const Checkout = dynamic(() => import('@/views/checkout'), {
  ssr: false,
  loading: () => <div className="min-h-svh bg-white" />,
});

export function CheckoutClient() {
  return <Checkout />;
}
