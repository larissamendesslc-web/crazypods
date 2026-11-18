export interface CartItem {
  key: string;
  product_id: string;
  name: string;
  price: number;
  image_url: string | null;
  flavor: string;
  quantity: number;
  stock: number;
  accent_color?: string;
}

export const cartKey = (productId: string, flavor: string) => `${productId}::${flavor}`;

export function addToCart(items: CartItem[], item: CartItem): CartItem[] {
  const existing = items.find((i) => i.key === item.key);
  if (existing) {
    return items.map((i) =>
      i.key === item.key ? { ...i, quantity: Math.min(i.stock, i.quantity + item.quantity) } : i,
    );
  }
  return [...items, { ...item, quantity: Math.min(item.stock, item.quantity) }];
}

export function setQuantity(items: CartItem[], key: string, quantity: number): CartItem[] {
  if (quantity <= 0) return items.filter((i) => i.key !== key);
  return items.map((i) => (i.key === key ? { ...i, quantity: Math.min(i.stock, quantity) } : i));
}

export const cartCount = (items: CartItem[]) => items.reduce((s, i) => s + i.quantity, 0);
export const cartSubtotal = (items: CartItem[]) =>
  Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100;