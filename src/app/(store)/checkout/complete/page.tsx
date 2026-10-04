import type { Metadata } from 'next';
import { CompleteClient } from './complete-client';

export const metadata: Metadata = {
  title: 'Confirming your deposit — tapaway',
  robots: { index: false, follow: false },
};

export default function CheckoutCompletePage() {
  return <CompleteClient />;
}
