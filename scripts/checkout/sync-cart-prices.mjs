import { readFileSync, writeFileSync } from "node:fs";

function edit(file, edits) {
  let source = readFileSync(file, "utf8");
  for (const [anchor, replacement] of edits) {
    if (!source.includes(anchor)) throw new Error("Checkout price sync: source anchor changed in " + file + ": " + anchor.slice(0, 80));
    source = source.replace(anchor, replacement);
  }
  writeFileSync(file, source);
}

/**
 * This changes only the price reconciliation inside the EXISTING floating cart.
 * No product fields, storefront layouts, category components or CSS are touched.
 * Fresh prices come from the SAME productsQuery used by the existing storefront.
 */
edit("src/components/cart-demo-checkout.tsx", [
  [
    'import { useState, type FormEvent, type ReactNode } from "react";',
    'import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";',
  ],
  [
    'import { brlFmt, cartCount, cartTotal, type CartItem } from "@/lib/cart";',
    'import { brlFmt, cartCount, cartTotal, type CartItem } from "@/lib/cart";\nimport { productsQuery } from "@/lib/products";',
  ],
  [
    '  onClear: () => void;\n  children: ReactNode;',
    '  onClear: () => void;\n  onReprice?: (latest: Record<string, number>) => void;\n  children: ReactNode;',
  ],
  [
    'export function CartCheckout({ items, deliveryStores, deliveryPolicy, onClear, children }: Props) {',
    'export function CartCheckout({ items, deliveryStores, deliveryPolicy, onClear, onReprice, children }: Props) {',
  ],
  [
    '  const subtotal = cartTotal(items);',
    `  const subtotal = cartTotal(items);
  const { data: liveProducts } = useQuery({
    ...productsQuery,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
  const latestPrices = useMemo(() => {
    const changed: Record<string, number> = {};
    if (!Array.isArray(liveProducts)) return changed;
    const indexed = new Map(liveProducts.map(p => [p.id, Number(p.price)]));
    for (const item of items) {
      const price = indexed.get(item.id);
      if (typeof price === "number" && Number.isFinite(price) &&
          price > 0 && Math.round(price * 100) !== Math.round(item.price * 100)) {
        changed[item.id] = price;
      }
    }
    return changed;
  }, [items, liveProducts]);
  useEffect(() => {
    if (Object.keys(latestPrices).length && onReprice) onReprice(latestPrices);
  }, [latestPrices, onReprice]);`,
  ],
]);

edit("src/components/shop.tsx", [
  [
    '              deliveryPolicy={settings.deliveryPricingDemo}',
    `              deliveryPolicy={settings.deliveryPricingDemo}
              onReprice={(prices) => saveItems((current) => current.map((item) =>
                prices[item.id] !== undefined ? { ...item, price: prices[item.id] } : item
              ))}`,
  ],
]);
console.log("Existing cart: current catalogue prices are now synchronized without layout changes.");
