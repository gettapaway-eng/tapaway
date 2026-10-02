import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { MAX_QUANTITY_PER_PACK, findPack, priceCart, type CartLine, type PackId } from '../../shared/packs';

// The cart lives in the browser only — nothing is reserved until checkout
// posts to /api/orders, which re-prices everything server-side. Persisted to
// localStorage so a reload or a trip back to the homepage doesn't empty it.

const STORAGE_KEY = 'tapaway.cart.v1';

interface CartContextValue {
  lines: CartLine[];
  priced: ReturnType<typeof priceCart>;
  itemCount: number;
  add: (packId: PackId) => void;
  setQuantity: (packId: PackId, quantity: number) => void;
  remove: (packId: PackId) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function load(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Re-validate against the current catalog: a pack may have been renamed
    // or removed since this cart was saved.
    return parsed.filter(
      (line): line is CartLine =>
        typeof line === 'object' &&
        line !== null &&
        typeof line.packId === 'string' &&
        findPack(line.packId) !== undefined &&
        Number.isInteger(line.quantity) &&
        line.quantity >= 1 &&
        line.quantity <= MAX_QUANTITY_PER_PACK,
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Private mode or storage disabled: the cart still works for this visit.
    }
  }, [lines]);

  const setQuantity = useCallback((packId: PackId, quantity: number) => {
    const clamped = Math.max(0, Math.min(MAX_QUANTITY_PER_PACK, Math.floor(quantity)));
    setLines((current) => {
      const rest = current.filter((line) => line.packId !== packId);
      if (clamped === 0) return rest;
      const existing = current.findIndex((line) => line.packId === packId);
      const next = { packId, quantity: clamped };
      if (existing === -1) return [...rest, next];
      const copy = [...current];
      copy[existing] = next;
      return copy;
    });
  }, []);

  const add = useCallback(
    (packId: PackId) => {
      const current = lines.find((line) => line.packId === packId)?.quantity ?? 0;
      setQuantity(packId, current + 1);
    },
    [lines, setQuantity],
  );

  const remove = useCallback((packId: PackId) => setQuantity(packId, 0), [setQuantity]);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const priced = priceCart(lines);
    return {
      lines,
      priced,
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
    };
  }, [lines, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside <CartProvider>');
  return context;
}
