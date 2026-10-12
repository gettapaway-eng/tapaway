import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { shopEnabled } from '@/lib/env';
import { CompleteClient } from './complete-client';

export const metadata: Metadata = {
  title: 'Confirming your pre-order — tapaway',
  robots: { index: false, follow: false },
};

export default function CheckoutCompletePage() {
  if (!shopEnabled) redirect('/shop');
  return <CompleteClient />;
}
