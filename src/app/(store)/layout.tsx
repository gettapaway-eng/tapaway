import type { ReactNode } from 'react';
import { CartProvider } from '@/lib/cart';

// Shop and checkout share one cart.
export default function StoreLayout({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
