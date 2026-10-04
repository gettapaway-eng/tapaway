'use client';

import dynamic from 'next/dynamic';

// Browser-only, like checkout: it reads the URL and the tab's saved snapshot.
const CheckoutComplete = dynamic(() => import('@/views/checkout-complete'), {
  ssr: false,
  loading: () => <div className="min-h-svh bg-white" />,
});

export function CompleteClient() {
  return <CheckoutComplete />;
}
