import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { shopEnabled } from '@/lib/env';
import { CheckoutClient } from './checkout-client';

export const metadata: Metadata = {
  title: 'Pre-order — tapaway',
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  if (!shopEnabled) redirect('/shop');
  return <CheckoutClient />;
}
