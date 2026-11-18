import { describe, expect, it } from "vitest";
import { addToCart, cartSubtotal, setQuantity, type CartItem } from "./cart-math";
import { buildWhatsappLink, normalizeWhatsapp } from "./whatsapp";

const base: CartItem = { key: "p1::Uva", product_id: "p1", name: "Pod", price: 89.9, image_url: null, flavor: "Uva", quantity: 1, stock: 3 };

describe("carrinho", () => {
  it("não deixa passar do estoque", () => {
    const items = addToCart(addToCart([], { ...base, quantity: 2 }), { ...base, quantity: 5 });
    expect(items[0]?.quantity).toBe(3);
  });
  it("remove item com quantidade zero", () => {
    expect(setQuantity([base], base.key, 0)).toHaveLength(0);
  });
  it("soma o subtotal", () => {
    expect(cartSubtotal([{ ...base, quantity: 2 }, { ...base, key: "x", price: 10, quantity: 1 }])).toBe(189.8);
  });
});

describe("whatsapp", () => {
  it("usa o número da loja com DDI 55", () => {
    expect(normalizeWhatsapp("11986825360")).toBe("5511986825360");
    expect(buildWhatsappLink("11986825360", "oi")).toBe("https://wa.me/5511986825360?text=oi");
  });
});