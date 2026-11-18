import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { addToCart, cartCount, cartSubtotal, setQuantity, type CartItem } from "./cart-math";

interface CartCtx {
  items: CartItem[];
  count: number;
  subtotal: number;
  open: boolean;
  setOpen: (o: boolean) => void;
  add: (item: CartItem) => void;
  update: (key: string, qty: number) => void;
  clear: () => void;
}
const Ctx = createContext<CartCtx | null>(null);
const KEY = "crazy-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, loaded]);

  const value = useMemo<CartCtx>(
    () => ({
      items,
      count: cartCount(items),
      subtotal: cartSubtotal(items),
      open,
      setOpen,
      add: (item) => setItems((prev) => addToCart(prev, item)),
      update: (key, qty) => setItems((prev) => setQuantity(prev, key, qty)),
      clear: () => setItems([]),
    }),
    [items, open],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}