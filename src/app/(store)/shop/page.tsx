import type { Metadata } from 'next';
import Shop from '@/views/shop';
import { ShopComingSoon } from '@/components/shop/coming-soon';
import { shopEnabled } from '@/lib/env';

export const metadata: Metadata = shopEnabled
  ? {
      title: 'The tapaway tag — Pre-order',
      description: 'Pre-order the tapaway tag: tap your phone to it to lock the apps you chose.',
    }
  : {
      title: 'The tapaway tag — Coming soon',
      description: 'tapaway tags go on sale at launch. Join the waitlist to hear when pre-orders open.',
    };

export default function ShopPage() {
  return shopEnabled ? <Shop /> : <ShopComingSoon />;
}
