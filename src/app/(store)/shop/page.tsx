import type { Metadata } from 'next';
import Shop from '@/views/shop';

export const metadata: Metadata = {
  title: 'The tapaway tag — Pre-order',
  description: 'Pre-order the tapaway tag: tap your phone to it to lock the apps you chose.',
};

export default function ShopPage() {
  return <Shop />;
}
